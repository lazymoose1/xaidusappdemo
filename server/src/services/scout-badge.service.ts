/**
 * Scout Badge Rule Engine
 *
 * Call processScoutEvent() after relevant check-in or goal actions.
 * Each badge evaluates its own criteria from the DB — fire-and-forget safe.
 *
 * Events:
 *   daily_checkin_yes         — scout tapped "yes" on a check-in
 *   daily_checkin_not_yet     — scout tapped "not yet"
 *   checkin_recovered         — checked in within 48h after a not_yet
 *   goal_day_progress_logged  — any goal day progress recorded
 *   goal_shrunk               — goal was right-sized
 *   weekly_reset_completed    — scout completed weekly reset
 *   session_closed            — scout pressed "Done for today"
 *   reflection_answered       — scout answered a reflection prompt
 *   leader_attestation_issued — leader attested a milestone
 *   troop_weekly_reset_batch  — troop-level event after leader triggers reset
 */

import crypto from 'crypto';
import { Checkin, Goal, ScoutCredential } from '../models';
import type { BadgeKey } from '../models/scout-credential.model';

// Streak milestone thresholds (days)
const STREAK_MILESTONES = [7, 14, 30, 60, 90, 120] as const;

function startOfDay(d: Date): Date {
  const r = new Date(d);
  r.setHours(0, 0, 0, 0);
  return r;
}

function startOfWeek(d: Date): Date {
  const day = d.getDay(); // 0 = Sun
  const diff = d.getDate() - day;
  const r = new Date(d);
  r.setDate(diff);
  r.setHours(0, 0, 0, 0);
  return r;
}

function computeProofHash(userId: string, type: string, title: string, earnedAt: Date): string {
  const data = `${userId}|${type}|${title}|${earnedAt.toISOString()}`;
  return crypto.createHash('sha256').update(data).digest('hex');
}

async function hasBadge(userId: string, badgeKey: string): Promise<boolean> {
  const count = await ScoutCredential.countDocuments({ user_id: userId, badge_key: badgeKey });
  return count > 0;
}

async function awardBadge(userId: string, badgeKey: BadgeKey | string, title: string, metadata?: Record<string, unknown>): Promise<void> {
  if (await hasBadge(userId, badgeKey)) return; // idempotent
  const earnedAt = new Date();
  await ScoutCredential.create({
    user_id: userId,
    credential_type: 'badge',
    badge_key: badgeKey,
    title,
    earned_at: earnedAt,
    issued_by: 'system',
    proof_hash: computeProofHash(userId, 'badge', title, earnedAt),
    acknowledged: false,
    metadata,
  });
}

async function awardStreakCredential(userId: string, days: number): Promise<void> {
  const badgeKey = `streak_${days}d`;
  if (await hasBadge(userId, badgeKey)) return;
  const title = `${days}-Day Check-in Streak`;
  const earnedAt = new Date();
  await ScoutCredential.create({
    user_id: userId,
    credential_type: 'streak',
    badge_key: badgeKey,
    title,
    earned_at: earnedAt,
    issued_by: 'system',
    proof_hash: computeProofHash(userId, 'streak', title, earnedAt),
    acknowledged: false,
  });
}

// ─── Streak calculation ────────────────────────────────────────────────────────

async function computeDailyStreak(userId: string): Promise<number> {
  const checkins = await Checkin.find({
    user_id: userId,
    status: 'yes',
  })
    .sort({ date: -1 })
    .select('date')
    .lean();

  if (!checkins.length) return 0;

  const uniqueDays = [
    ...new Set(checkins.map((c) => startOfDay(c.date).toDateString())),
  ];

  let streak = 0;
  let cursor = startOfDay(new Date());

  for (const dayStr of uniqueDays) {
    const cursorStr = cursor.toDateString();
    if (dayStr === cursorStr) {
      streak++;
      cursor.setDate(cursor.getDate() - 1);
    } else if (new Date(dayStr) < cursor) {
      break; // gap — streak ends
    }
  }

  return streak;
}

// ─── Badge rule helpers ────────────────────────────────────────────────────────

async function checkMomentumSpark(userId: string): Promise<void> {
  const weekStart = startOfWeek(new Date());
  const count = await Checkin.countDocuments({
    user_id: userId,
    status: 'yes',
    date: { $gte: weekStart },
  });
  if (count >= 3) await awardBadge(userId, 'momentum_spark', 'Momentum Spark');
}

async function checkComebackCore(userId: string): Promise<void> {
  // Awarded when a not_yet is followed by yes within 48h — caller passes event
  await awardBadge(userId, 'comeback_core', 'Comeback Core');
}

async function checkShrinkToWin(userId: string, goalId: string): Promise<void> {
  const goal = await Goal.findById(goalId).lean();
  if (!goal || !goal.shrunk_from) return;
  // Goal was shrunk and now has a yes check-in
  const yesCount = await Checkin.countDocuments({ user_id: userId, goal_id: goalId, status: 'yes' });
  if (yesCount >= 1) await awardBadge(userId, 'shrink_to_win', 'Shrink-to-Win');
}

async function checkTwoTapTitan(userId: string): Promise<void> {
  const today = startOfDay(new Date());
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const windows = await Checkin.find({
    user_id: userId,
    status: 'yes',
    date: { $gte: today, $lt: tomorrow },
    check_in_window: { $in: ['morning', 'evening'] },
  })
    .distinct('check_in_window')
    .lean();

  if (windows.includes('morning') && windows.includes('evening')) {
    await awardBadge(userId, 'two_tap_titan', 'Two-Tap Titan');
  }
}

async function checkStudySwitch(userId: string, goalId: string): Promise<void> {
  const goal = await Goal.findById(goalId).lean();
  if (!goal || goal.goal_category_tag !== 'school') return;
  await awardBadge(userId, 'study_switch', 'Study Switch');
}

async function checkSkillSession(userId: string): Promise<void> {
  const weekStart = startOfWeek(new Date());
  const skillGoals = await Goal.find({ user_id: userId, goal_category_tag: 'skill' }).select('_id').lean();
  if (!skillGoals.length) return;
  const ids = skillGoals.map((g) => g._id);
  const count = await Checkin.countDocuments({
    user_id: userId,
    goal_id: { $in: ids },
    status: 'yes',
    date: { $gte: weekStart },
  });
  if (count >= 2) await awardBadge(userId, 'skill_session', 'Skill Session');
}

async function checkServiceSignal(userId: string, goalId: string, hasReflection: boolean): Promise<void> {
  const goal = await Goal.findById(goalId).lean();
  if (!goal || goal.goal_category_tag !== 'community') return;
  // Reflection is optional but encouraged; badge awarded on completion either way
  await awardBadge(userId, 'service_signal', 'Service Signal');
}

async function checkLeaderLift(userId: string): Promise<void> {
  // Awarded after weekly_reset_completed with a micro_step set — caller context
  await awardBadge(userId, 'leader_lift', 'Leader Lift');
}

async function checkQuietPower(userId: string): Promise<void> {
  // 7 consecutive daily check-ins this week with session_closed signals
  const streak = await computeDailyStreak(userId);
  const weekStart = startOfWeek(new Date());
  const closedCount = await Checkin.countDocuments({
    user_id: userId,
    event_type: 'session_closed',
    date: { $gte: weekStart },
  });
  if (streak >= 7 && closedCount >= 7) {
    await awardBadge(userId, 'quiet_power', 'Quiet Power');
  }
}

async function checkPlanTrue(userId: string): Promise<void> {
  // All planned goal days completed this week
  const weekStart = startOfWeek(new Date());
  const today = new Date();
  const todayIdx = today.getDay();
  const dayKeys = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

  const goals = await Goal.find({ user_id: userId, status: 'active', completed: false }).lean();
  if (!goals.length) return;

  let totalPlanned = 0;
  let totalCompleted = 0;

  for (const goal of goals) {
    if (!goal.planned_days) continue;
    for (let i = 0; i <= todayIdx; i++) {
      const key = dayKeys[i];
      if (goal.planned_days[key]) {
        totalPlanned++;
        const dayStart = new Date(weekStart);
        dayStart.setDate(dayStart.getDate() + i);
        const dayEnd = new Date(dayStart);
        dayEnd.setDate(dayEnd.getDate() + 1);
        const done = await Checkin.countDocuments({
          user_id: userId,
          goal_id: goal._id,
          status: 'yes',
          date: { $gte: dayStart, $lt: dayEnd },
        });
        if (done > 0) totalCompleted++;
      }
    }
  }

  if (totalPlanned > 0 && totalCompleted === totalPlanned) {
    await awardBadge(userId, 'plan_true', 'Plan-True');
  }
}

async function checkFocusForge(userId: string, goalId: string): Promise<void> {
  const goal = await Goal.findById(goalId).lean();
  if (!goal || goal.size_preset !== '10min') return;
  const count = await Checkin.countDocuments({ user_id: userId, goal_id: goalId, status: 'yes' });
  if (count >= 3) await awardBadge(userId, 'focus_forge', 'Focus Forge');
}

async function checkInsightDrop(userId: string): Promise<void> {
  const count = await Checkin.countDocuments({
    user_id: userId,
    event_type: 'reflection_answered',
  });
  if (count >= 3) await awardBadge(userId, 'insight_drop', 'Insight Drop');
}

async function checkBoundaryBoss(userId: string): Promise<void> {
  const count = await Checkin.countDocuments({
    user_id: userId,
    event_type: 'session_closed',
  });
  if (count >= 3) await awardBadge(userId, 'boundary_boss', 'Boundary Boss');
}

async function checkFutureMaker(userId: string): Promise<void> {
  // 4-week streak of weekly resets + at least 12 total check-ins
  const fourWeeksAgo = new Date();
  fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);

  const resets = await Checkin.countDocuments({
    user_id: userId,
    event_type: 'weekly_reset_completed',
    date: { $gte: fourWeeksAgo },
  });

  const totalCheckins = await Checkin.countDocuments({
    user_id: userId,
    status: 'yes',
    date: { $gte: fourWeeksAgo },
  });

  if (resets >= 4 && totalCheckins >= 12) {
    await awardBadge(userId, 'future_maker', 'Future Maker');
  }
}

// ─── Main event processor ──────────────────────────────────────────────────────

export interface BadgeEventContext {
  goalId?: string;
  hasReflection?: boolean;
  hasMicroStep?: boolean;
}

export async function processScoutEvent(
  userId: string,
  eventType: string,
  ctx: BadgeEventContext = {},
): Promise<void> {
  try {
    // Always check streak milestones on any yes check-in
    if (eventType === 'daily_checkin_yes') {
      const streak = await computeDailyStreak(userId);
      for (const milestone of STREAK_MILESTONES) {
        if (streak >= milestone) {
          await awardStreakCredential(userId, milestone);
        }
      }
      await checkMomentumSpark(userId);
      await checkTwoTapTitan(userId);
      await checkQuietPower(userId);
      await checkPlanTrue(userId);
      if (ctx.goalId) {
        await checkStudySwitch(userId, ctx.goalId);
        await checkServiceSignal(userId, ctx.goalId, ctx.hasReflection ?? false);
        await checkShrinkToWin(userId, ctx.goalId);
        await checkFocusForge(userId, ctx.goalId);
      }
      await checkSkillSession(userId);
    }

    if (eventType === 'checkin_recovered') {
      await checkComebackCore(userId);
    }

    if (eventType === 'goal_day_progress_logged') {
      await checkSkillSession(userId);
      if (ctx.goalId) {
        await checkStudySwitch(userId, ctx.goalId);
        await checkFocusForge(userId, ctx.goalId);
      }
    }

    if (eventType === 'weekly_reset_completed') {
      if (ctx.hasMicroStep) await checkLeaderLift(userId);
      await checkFutureMaker(userId);
    }

    if (eventType === 'session_closed') {
      await checkBoundaryBoss(userId);
      await checkQuietPower(userId);
    }

    if (eventType === 'reflection_answered') {
      await checkInsightDrop(userId);
    }

    if (eventType === 'leader_attestation_issued') {
      await awardBadge(userId, 'proof_pulse', 'Proof Pulse', { attestedBy: ctx.goalId });
    }
  } catch {
    // Badge processing must never break the main request
  }
}

/**
 * Troop-level check for Team Current badge.
 * Call after a batch weekly reset. Awards badge to all qualifying scouts.
 */
export async function processTroopWeeklyReset(troopMemberIds: string[], totalMembers: number): Promise<void> {
  try {
    const completionRate = troopMemberIds.length / Math.max(totalMembers, 1);
    if (completionRate >= 0.7) {
      for (const userId of troopMemberIds) {
        await awardBadge(userId, 'team_current', 'Team Current', { completionRate });
      }
    }
  } catch {
    // Never break
  }
}

export { computeDailyStreak };
