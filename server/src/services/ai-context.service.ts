/**
 * AI Context Builder
 *
 * Queries MongoDB in canonical order and derives a normalized AiContext object
 * that can be safely passed into the AI package.
 *
 * Security:
 * - NEVER exposes auth_id, email, scout_pin_hash, social_ids from users
 * - NEVER exposes access_token, refresh_token, social_user_id, scope, raw profile from social_auth_tokens
 * - NEVER exposes reflection or note from checkins (private scout data)
 * - Derived fields only — no raw Mongo documents leave this function
 */

import mongoose from 'mongoose';
import { User, Goal, Checkin, Reward, SocialAuthToken } from '../models';
import { computeDailyStreak } from './scout-badge.service';

// ─── Output types ─────────────────────────────────────────────────────────────

export type AiContextUser = {
  id: string;
  role: string;
  displayName: string;
  coachStyle: string;
  interests: string[];
  archetype: string;
  troopCode: string | null;
  orgId: string | null;
  reminderWindows: string[];
  isMoova: boolean;
  isScoutAccount: boolean;
};

export type AiContextGoal = {
  id: string;
  title: string;
  description: string;
  goalType: string;       // maps to goal_category_tag
  subjectTag: string;     // maps to category
  sizePreset: string;
  activeDays: string[];   // derived from planned_days object keys
  checkInWindows: string[];
  status: string;
  weekStart: string | null;
  carryOver: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type AiContextRecentActivity = {
  daysCheckedInThisWeek: number;
  dailyCheckInStreak: number;
  lastCheckInStatus: string;
  lastCheckInDate: string | null;
  goalDaysCompletedThisWeek: number;
  plannedGoalDaysThisWeek: number;
  lastGoalOutcome: string;
  weeklyResetComplete: boolean;
};

export type AiContextRewards = {
  recentMarks: { id: string; title: string; earnedAt: Date }[];
  recentMoments: { id: string; title: string; earnedAt: Date }[];
  isMoova: boolean;
  moovaCurrentConsistencyDays: number; // alias for dailyCheckInStreak when moova
};

export type AiContextSocial = {
  // Only safe derived summary — no raw tokens, IDs, emails
  connectedPlatforms: { platform: string; hasValidToken: boolean }[];
};

export type AiContext = {
  user: AiContextUser;
  goal: AiContextGoal | null;
  recentActivity: AiContextRecentActivity;
  rewards: AiContextRewards;
  social: AiContextSocial;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function startOfWeek(d: Date): Date {
  const r = new Date(d);
  r.setDate(r.getDate() - r.getDay());
  r.setHours(0, 0, 0, 0);
  return r;
}

const DAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const;

function activeDaysFromPlannedDays(planned: any): string[] {
  if (!planned || typeof planned !== 'object') return [];
  return DAY_KEYS.filter((k) => !!planned[k]);
}

// ─── Main builder ─────────────────────────────────────────────────────────────

export async function buildAiContext(userId: string): Promise<AiContext> {
  const userObjId = new mongoose.Types.ObjectId(userId);
  const weekStart = startOfWeek(new Date());
  const todayIdx = new Date().getDay();

  // ── 1. User ────────────────────────────────────────────────────────────────
  // Fields: _id, role, display_name, archetype, interests, coach_style,
  //         reminder_windows, troop_code, cohort_code, is_moova, is_scout_account
  // Excluded: auth_id, email, scout_pin_hash, social_ids, parent_contact,
  //           consent_flags, avatar_url
  const rawUser = await User.findById(userObjId)
    .select('role display_name archetype interests coach_style reminder_windows troop_code cohort_code is_moova is_scout_account')
    .lean();

  if (!rawUser) {
    throw new Error(`buildAiContext: user ${userId} not found`);
  }

  const user: AiContextUser = {
    id: userId,
    role: rawUser.role || 'teen',
    displayName: rawUser.display_name || '',
    coachStyle: rawUser.coach_style || 'calm',
    interests: rawUser.interests || [],
    archetype: rawUser.archetype || '',
    troopCode: rawUser.troop_code || null,
    orgId: rawUser.cohort_code || null,
    reminderWindows: rawUser.reminder_windows || [],
    isMoova: !!rawUser.is_moova,
    isScoutAccount: !!rawUser.is_scout_account,
  };

  // ── 2. Goal (most recent active, or most recently updated) ─────────────────
  // Fields: _id, user_id, title, description, goal_category_tag, category,
  //         size_preset, planned_days, check_in_windows, status, week_start,
  //         carried_over_from, created_at, updated_at
  // Excluded: reflection (if ever added), milestones, suggestion_id, etc.
  const rawGoal = await Goal.findOne({
    user_id: userObjId,
    completed: false,
    status: 'active',
  })
    .select('title description goal_category_tag category size_preset planned_days check_in_windows status week_start carried_over_from created_at updated_at')
    .sort({ updated_at: -1 })
    .lean();

  const goal: AiContextGoal | null = rawGoal
    ? {
        id: (rawGoal._id as any).toString(),
        title: rawGoal.title,
        description: rawGoal.description || '',
        goalType: rawGoal.goal_category_tag || 'personal',
        subjectTag: rawGoal.category || 'personal',
        sizePreset: rawGoal.size_preset || 'small',
        activeDays: activeDaysFromPlannedDays(rawGoal.planned_days),
        checkInWindows: rawGoal.check_in_windows || [],
        status: rawGoal.status,
        weekStart: rawGoal.week_start || null,
        carryOver: rawGoal.carried_over_from || null,
        createdAt: rawGoal.created_at,
        updatedAt: rawGoal.updated_at,
      }
    : null;

  // ── 3. Checkins (this week + last 30 days for streak + last status) ─────────
  // Fields: _id, user_id, goal_id, date, status, event_type, created_at
  // Excluded: reflection, note (private scout fields)
  const [streakResult, weekCheckins, lastCheckin, weeklyResetDoc] = await Promise.all([
    computeDailyStreak(userId),

    // Checkins this week with status 'yes' — group by date for distinct day count
    Checkin.aggregate([
      {
        $match: {
          user_id: userObjId,
          status: 'yes',
          date: { $gte: weekStart },
        },
      },
      {
        $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$date' } } },
      },
    ]),

    // Most recent checkin for last status
    Checkin.findOne({ user_id: userObjId })
      .select('status date created_at')
      .sort({ date: -1 })
      .lean(),

    // Weekly reset event
    Checkin.findOne({
      user_id: userObjId,
      event_type: 'weekly_reset_completed',
      date: { $gte: weekStart },
    })
      .select('_id')
      .lean(),
  ]);

  const daysCheckedInThisWeek = weekCheckins.length;
  const dailyCheckInStreak = streakResult;
  const lastCheckInStatus = lastCheckin?.status || 'none';
  const lastCheckInDate = lastCheckin?.date ? lastCheckin.date.toISOString() : null;
  const weeklyResetComplete = !!weeklyResetDoc;

  // ── Goal-day completion this week ──────────────────────────────────────────
  let goalDaysCompletedThisWeek = 0;
  let plannedGoalDaysThisWeek = 0;

  if (rawGoal && rawGoal.planned_days) {
    for (let i = 0; i <= todayIdx; i++) {
      const key = DAY_KEYS[i];
      if (!rawGoal.planned_days[key]) continue;

      plannedGoalDaysThisWeek++;
      const dayStart = new Date(weekStart);
      dayStart.setDate(dayStart.getDate() + i);
      const dayEnd = new Date(dayStart);
      dayEnd.setDate(dayEnd.getDate() + 1);

      const done = await Checkin.countDocuments({
        user_id: userObjId,
        goal_id: rawGoal._id,
        status: 'yes',
        date: { $gte: dayStart, $lt: dayEnd },
      });
      if (done > 0) goalDaysCompletedThisWeek++;
    }
  }

  // ── Last goal outcome ──────────────────────────────────────────────────────
  // Derive from the most recent completed or missed goal
  const recentGoals = await Goal.find({ user_id: userObjId })
    .select('status completed carried_over_from resized updated_at')
    .sort({ updated_at: -1 })
    .limit(5)
    .lean();

  let lastGoalOutcome = 'none';
  for (const g of recentGoals) {
    if (g.completed) { lastGoalOutcome = 'completed'; break; }
    if (g.resized)   { lastGoalOutcome = 'shrunk'; break; }
    if (g.status === 'missed') { lastGoalOutcome = 'missed'; break; }
  }

  const recentActivity: AiContextRecentActivity = {
    daysCheckedInThisWeek,
    dailyCheckInStreak,
    lastCheckInStatus,
    lastCheckInDate,
    goalDaysCompletedThisWeek,
    plannedGoalDaysThisWeek,
    lastGoalOutcome,
    weeklyResetComplete,
  };

  // ── 4. Rewards (reward_events) ─────────────────────────────────────────────
  // Fields: _id, type, title, earned_at
  // Excluded: source_id (internal FK)
  const [recentMarksRaw, recentMomentsRaw] = await Promise.all([
    Reward.find({ user_id: userObjId, type: 'mark' })
      .select('title earned_at')
      .sort({ earned_at: -1 })
      .limit(5)
      .lean(),
    Reward.find({ user_id: userObjId, type: 'moment' })
      .select('title earned_at')
      .sort({ earned_at: -1 })
      .limit(5)
      .lean(),
  ]);

  const rewards: AiContextRewards = {
    recentMarks: recentMarksRaw.map((r) => ({
      id: (r._id as any).toString(),
      title: r.title,
      earnedAt: r.earned_at,
    })),
    recentMoments: recentMomentsRaw.map((r) => ({
      id: (r._id as any).toString(),
      title: r.title,
      earnedAt: r.earned_at,
    })),
    isMoova: user.isMoova,
    moovaCurrentConsistencyDays: user.isMoova ? dailyCheckInStreak : 0,
  };

  // ── 5. Social (safe derived summary only — no raw tokens/IDs/emails) ────────
  // Fields: platform, expires_at only
  // Excluded: access_token, refresh_token, social_user_id, scope, profile
  const socialTokens = await SocialAuthToken.find({ user_id: userObjId })
    .select('platform expires_at')
    .lean();

  const social: AiContextSocial = {
    connectedPlatforms: socialTokens.map((t) => ({
      platform: t.platform,
      hasValidToken: t.expires_at ? t.expires_at > new Date() : true,
    })),
  };

  return { user, goal, recentActivity, rewards, social };
}
