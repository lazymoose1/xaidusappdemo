import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import mongoose from 'mongoose';
import { Troop, User, Checkin, ScoutNudge, ScoutCredential, LeaderSupportNote, Reward, writeAuditLog } from '../models';
import { processScoutEvent, processTroopWeeklyReset, computeDailyStreak } from '../services/scout-badge.service';
import { Goal } from '../models';

async function resolveTroopMembers(troop: { member_ids: mongoose.Types.ObjectId[]; troop_code: string }) {
  const explicitMemberIds = troop.member_ids.map((id) => id.toString());
  const troopCodeMembers = await User.find({
    troop_code: troop.troop_code,
    role: { $in: ['teen', 'scout'] },
  })
    .select('_id display_name avatar_url cohort_code interests')
    .lean();

  const byId = new Map<string, {
    _id: mongoose.Types.ObjectId;
    display_name?: string;
    avatar_url?: string | null;
    cohort_code?: string | null;
    interests?: string[];
  }>();

  for (const member of troopCodeMembers) {
    byId.set((member._id as any).toString(), member as any);
  }

  if (explicitMemberIds.length > 0) {
    const explicitMembers = await User.find({ _id: { $in: explicitMemberIds } })
      .select('_id display_name avatar_url cohort_code interests')
      .lean();

    for (const member of explicitMembers) {
      byId.set((member._id as any).toString(), member as any);
    }
  }

  return Array.from(byId.entries()).map(([id, member]) => ({
    id,
    displayName: member.display_name || 'Scout',
    avatarUrl: (member as any).avatar_url || null,
    cohortCode: member.cohort_code || null,
    interests: Array.isArray(member.interests) ? member.interests : [],
  }));
}

type ThemeSource = 'goal_category' | 'badge_focus' | 'interest';
type CaseloadStatus = 'needs_support' | 'follow_up_due' | 'on_track' | 'resolved';
type CaseloadPriority = 'high' | 'medium' | 'low';

function getWeekStart() {
  const d = new Date();
  d.setDate(d.getDate() - d.getDay());
  d.setHours(0, 0, 0, 0);
  return d;
}

function getLastSevenDayStart() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - 6);
  return d;
}

function incCount(map: Map<string, number>, value?: string | null) {
  if (!value) return;
  const cleaned = value.trim();
  if (!cleaned) return;
  map.set(cleaned, (map.get(cleaned) || 0) + 1);
}

function topLabelsFromMap(map: Map<string, number>, source: ThemeSource) {
  return Array.from(map.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([label, count]) => ({ label, count, source }));
}

function summarizeTrend(trend: number[]) {
  const early = trend.slice(0, 3).reduce((sum, value) => sum + value, 0);
  const late = trend.slice(-3).reduce((sum, value) => sum + value, 0);

  if (late >= early + 2) {
    return {
      trendDirection: 'up' as const,
      trendLabel: 'Goal follow-through improved later in the week.',
    };
  }

  if (early >= late + 2) {
    return {
      trendDirection: 'down' as const,
      trendLabel: 'Momentum dipped after the early part of the week.',
    };
  }

  return {
    trendDirection: 'steady' as const,
    trendLabel: 'The group stayed fairly steady across the week.',
  };
}

function formatDateLabel(value?: Date | string | null) {
  if (!value) return 'No recent check-in';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'No recent check-in';
  return date.toLocaleDateString();
}

// ─── Leader: create troop ──────────────────────────────────────────────────────

export async function createTroop(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user || req.user.role !== 'scout_leader') {
      return res.status(403).json({ error: 'Support leaders only' });
    }

    const existing = await Troop.findOne({ leader_id: req.user.id });
    if (existing) return res.status(409).json({ error: 'You already have a troop', troopCode: existing.troop_code });

    const { name, troopCode, weeklyResetDay } = req.body;

    const troop = await Troop.create({
      name,
      troop_code: troopCode.toUpperCase(),
      leader_id: req.user.id,
      member_ids: [],
      settings: {
        weekly_reset_day: weeklyResetDay || 'sun',
        check_in_windows: ['morning', 'evening'],
      },
    });

    await writeAuditLog({
      actor_id: req.user.id as any,
      actor_role: 'scout_leader',
      action: 'create_troop',
      troop_id: troop._id as any,
      metadata: { name, troopCode: troop.troop_code },
    });

    return res.status(201).json({
      id: (troop._id as any).toString(),
      troopCode: troop.troop_code,
      name: troop.name,
    });
  } catch (err: any) {
    if (err.code === 11000) return res.status(409).json({ error: 'Troop code already taken' });
    next(err);
  }
}

// ─── Leader: get my troop dashboard ───────────────────────────────────────────

export async function getTroopDashboard(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user || req.user.role !== 'scout_leader') {
      return res.status(403).json({ error: 'Support leaders only' });
    }

    const troop = await Troop.findOne({ leader_id: req.user.id }).lean();
    if (!troop) return res.status(404).json({ error: 'No troop found' });

    const weekStart = getWeekStart();
    const lastSevenDayStart = getLastSevenDayStart();

    const members = await resolveTroopMembers(troop);
    const memberIds = members.map((member) => member.id);
    const memberObjectIds = memberIds.map((memberId) => new mongoose.Types.ObjectId(memberId));

    // For each scout: did they check in this week?
    const segments: {
      active: { id: string; nickname: string; daysThisWeek: number }[];
      at_risk: { id: string; nickname: string; daysThisWeek: number }[];
      inactive: { id: string; nickname: string; daysThisWeek: number }[];
    } = { active: [], at_risk: [], inactive: [] };

    const [weeklyCheckinDays, weeklyResets, credentialCounts, goals, trendRows, checkinTrendRows, latestCheckins, supportNotes, weeklyCredentials, recentCredentials, weeklyRewardEvents] = await Promise.all([
      Checkin.aggregate([
        {
          $match: {
            user_id: { $in: memberObjectIds },
            status: 'yes',
            date: { $gte: weekStart },
            $or: [{ event_type: { $exists: false } }, { event_type: { $ne: 'weekly_reset_completed' } }],
          },
        },
        {
          $group: {
            _id: {
              userId: '$user_id',
              day: { $dateToString: { format: '%Y-%m-%d', date: '$date' } },
            },
          },
        },
        {
          $group: {
            _id: '$_id.userId',
            daysThisWeek: { $sum: 1 },
          },
        },
      ]),
      Checkin.aggregate([
        {
          $match: {
            user_id: { $in: memberObjectIds },
            event_type: 'weekly_reset_completed',
            date: { $gte: weekStart },
          },
        },
        { $group: { _id: '$user_id', count: { $sum: 1 } } },
      ]),
      ScoutCredential.aggregate([
        { $match: { user_id: { $in: memberObjectIds } } },
        { $group: { _id: '$user_id', count: { $sum: 1 } } },
      ]),
      Goal.find({ user_id: { $in: memberObjectIds } })
        .select('user_id category goal_category_tag badge_focus completed completed_at created_at')
        .lean(),
      Goal.aggregate([
        {
          $match: {
            user_id: { $in: memberObjectIds },
            completed: true,
            completed_at: { $gte: lastSevenDayStart },
          },
        },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$completed_at' } },
            count: { $sum: 1 },
          },
        },
      ]),
      Checkin.aggregate([
        {
          $match: {
            user_id: { $in: memberObjectIds },
            status: 'yes',
            date: { $gte: lastSevenDayStart },
            $or: [{ event_type: { $exists: false } }, { event_type: { $ne: 'weekly_reset_completed' } }],
          },
        },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$date' } },
            count: { $sum: 1 },
          },
        },
      ]),
      Checkin.aggregate([
        { $match: { user_id: { $in: memberObjectIds } } },
        { $sort: { date: -1 } },
        {
          $group: {
            _id: '$user_id',
            lastDate: { $first: '$date' },
            lastStatus: { $first: '$status' },
            lastEventType: { $first: '$event_type' },
          },
        },
      ]),
      LeaderSupportNote.find({
        troop_id: troop._id,
        youth_user_id: { $in: memberObjectIds },
      })
        .sort({ created_at: -1 })
        .lean(),
      ScoutCredential.find({
        user_id: { $in: memberObjectIds },
        earned_at: { $gte: weekStart },
      })
        .select('user_id credential_type title earned_at metadata')
        .lean(),
      ScoutCredential.find({
        user_id: { $in: memberObjectIds },
      })
        .select('user_id credential_type title earned_at metadata')
        .sort({ earned_at: -1 })
        .limit(8)
        .lean(),
      Reward.find({
        user_id: { $in: memberObjectIds },
        earned_at: { $gte: weekStart },
      })
        .select('user_id type earned_at')
        .lean(),
    ]);

    const daysByMember = new Map(weeklyCheckinDays.map((row) => [String(row._id), Number(row.daysThisWeek) || 0]));
    const resetByMember = new Map(weeklyResets.map((row) => [String(row._id), Number(row.count) || 0]));
    const credentialsByMember = new Map(credentialCounts.map((row) => [String(row._id), Number(row.count) || 0]));
    const latestCheckinByMember = new Map(
      latestCheckins.map((row) => [
        String(row._id),
        {
          lastDate: row.lastDate ? new Date(row.lastDate) : null,
          lastStatus: typeof row.lastStatus === 'string' ? row.lastStatus : null,
        },
      ]),
    );
    const supportNotesByMember = new Map<string, any[]>();
    for (const note of supportNotes) {
      const key = String(note.youth_user_id);
      const existing = supportNotesByMember.get(key) || [];
      existing.push(note);
      supportNotesByMember.set(key, existing);
    }

    let weeklyResetCount = 0;

    for (const member of members) {
      const daysThisWeek = daysByMember.get(member.id) || 0;
      if ((resetByMember.get(member.id) || 0) > 0) weeklyResetCount += 1;

      const entry = {
        id: member.id,
        nickname: member.displayName,
        daysThisWeek,
        credentialCount: credentialsByMember.get(member.id) || 0,
      };

      if (daysThisWeek >= 3) segments.active.push(entry);
      else if (daysThisWeek >= 1) segments.at_risk.push(entry);
      else segments.inactive.push(entry);
    }

    const weeklyResetRate = memberIds.length > 0 ? weeklyResetCount / memberIds.length : 0;
    const goalsCreatedThisWeek = goals.filter((goal) => goal.created_at && new Date(goal.created_at) >= weekStart).length;
    const goalsCompletedThisWeek = goals.filter((goal) => goal.completed && goal.completed_at && new Date(goal.completed_at) >= weekStart).length;
    const checkinsThisWeek = Array.from(daysByMember.values()).reduce((sum, value) => sum + value, 0);

    const trendCountByDay = new Map(trendRows.map((row) => [String(row._id), Number(row.count) || 0]));
    const checkinCountByDay = new Map(checkinTrendRows.map((row) => [String(row._id), Number(row.count) || 0]));
    const trend = Array.from({ length: 7 }, (_, index) => {
      const day = new Date(lastSevenDayStart);
      day.setDate(lastSevenDayStart.getDate() + index);
      const key = day.toISOString().slice(0, 10);
      return trendCountByDay.get(key) || 0;
    });
    const checkinTrend = Array.from({ length: 7 }, (_, index) => {
      const day = new Date(lastSevenDayStart);
      day.setDate(lastSevenDayStart.getDate() + index);
      const key = day.toISOString().slice(0, 10);
      return checkinCountByDay.get(key) || 0;
    });
    const trendSummary = summarizeTrend(trend);

    const rewardsIssuedThisWeek = weeklyCredentials.length;
    const youthRecognizedThisWeek = new Set(weeklyCredentials.map((credential) => String(credential.user_id))).size;
    const serviceHoursLoggedThisWeek = weeklyCredentials.reduce((sum, credential: any) => {
      if (credential.credential_type !== 'service_hours') return sum;
      const hours = Number((credential.metadata as any)?.hours || 0);
      return sum + (Number.isFinite(hours) ? hours : 0);
    }, 0);
    const marksEarnedThisWeek = weeklyRewardEvents.filter((event) => event.type === 'mark').length;
    const momentsEarnedThisWeek = weeklyRewardEvents.filter((event) => event.type === 'moment').length;
    const moovasUnlockedThisWeek = weeklyRewardEvents.filter((event) => event.type === 'moova').length;

    const categoryCounts = new Map<string, number>();
    const badgeFocusCounts = new Map<string, number>();
    const interestCounts = new Map<string, number>();
    const goalsByMember = new Map<string, typeof goals>();

    for (const goal of goals) {
      const memberId = String(goal.user_id);
      const existing = goalsByMember.get(memberId) || [];
      existing.push(goal);
      goalsByMember.set(memberId, existing);
      incCount(categoryCounts, goal.goal_category_tag || goal.category);
      incCount(badgeFocusCounts, goal.badge_focus);
    }

    for (const member of members) {
      for (const interest of member.interests || []) {
        incCount(interestCounts, interest);
      }
    }

    const topThemes = [
      ...topLabelsFromMap(categoryCounts, 'goal_category'),
      ...topLabelsFromMap(badgeFocusCounts, 'badge_focus'),
      ...topLabelsFromMap(interestCounts, 'interest'),
    ]
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);

    const cohortBuckets = new Map<string, {
      memberCount: number;
      activeScouts: number;
      goalsCompletedThisWeek: number;
      themeCounts: Map<string, number>;
    }>();

    for (const member of members) {
      const cohortCode = member.cohortCode || 'General group';
      const bucket = cohortBuckets.get(cohortCode) || {
        memberCount: 0,
        activeScouts: 0,
        goalsCompletedThisWeek: 0,
        themeCounts: new Map<string, number>(),
      };

      bucket.memberCount += 1;
      if ((daysByMember.get(member.id) || 0) > 0) bucket.activeScouts += 1;

      for (const goal of goalsByMember.get(member.id) || []) {
        if (goal.completed && goal.completed_at && new Date(goal.completed_at) >= weekStart) {
          bucket.goalsCompletedThisWeek += 1;
        }
        incCount(bucket.themeCounts, goal.goal_category_tag || goal.category);
        incCount(bucket.themeCounts, goal.badge_focus);
      }

      for (const interest of (member.interests || []).slice(0, 3)) {
        incCount(bucket.themeCounts, interest);
      }

      cohortBuckets.set(cohortCode, bucket);
    }

    const cohorts = Array.from(cohortBuckets.entries())
      .map(([cohortCode, bucket]) => ({
        cohortCode,
        memberCount: bucket.memberCount,
        activeScouts: bucket.activeScouts,
        goalsCompletedThisWeek: bucket.goalsCompletedThisWeek,
        themes: Array.from(bucket.themeCounts.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 3)
          .map(([label]) => label),
      }))
      .sort((a, b) => b.memberCount - a.memberCount);

    const supportSignal =
      segments.inactive.length > 0
        ? `${segments.inactive.length} youth may need a lighter restart this week.`
        : segments.at_risk.length > 0
        ? `${segments.at_risk.length} youth could use a short supportive nudge.`
        : 'The group is current enough to focus on celebration and consistency.';

    const conversationStarters = [
      goalsCompletedThisWeek > 0
        ? 'Call out one small win the group can repeat next week.'
        : 'Ask what made it easier to show up, even on one small day.',
      segments.at_risk.length > 0
        ? 'Prompt one simple reset for youth who dipped after midweek.'
        : 'Celebrate the routines that are starting to stick.',
      topThemes[0]
        ? `Notice that ${topThemes[0].label.toLowerCase()} keeps showing up across the group.`
        : 'Keep the conversation on effort trends, not individual reflections.',
    ];

    const now = new Date();
    const caseloadQueue = members
      .map((member) => {
        const daysThisWeek = daysByMember.get(member.id) || 0;
        const memberGoals = goalsByMember.get(member.id) || [];
        const activeGoalCount = memberGoals.filter((goal) => !goal.completed).length;
        const completedThisWeek = memberGoals.filter((goal) => goal.completed && goal.completed_at && new Date(goal.completed_at) >= weekStart).length;
        const stalled = activeGoalCount > 0 && daysThisWeek === 0 && completedThisWeek === 0;
        const latestNote = (supportNotesByMember.get(member.id) || [])[0];
        const latestCheckin = latestCheckinByMember.get(member.id);
        const followUpDate = latestNote?.follow_up_date ? new Date(latestNote.follow_up_date) : null;
        const overdueFollowUp = !!followUpDate && followUpDate < now && latestNote?.status !== 'resolved';

        let supportStatus: CaseloadStatus = 'on_track';
        let priority: CaseloadPriority = 'low';
        let reason = 'On track this week';

        if (latestNote?.status === 'resolved') {
          supportStatus = 'resolved';
          reason = 'Recent concern resolved';
        } else if (overdueFollowUp) {
          supportStatus = 'follow_up_due';
          priority = 'high';
          reason = 'Follow-up is overdue';
        } else if (daysThisWeek === 0 || stalled || segments.inactive.some((entry) => entry.id === member.id)) {
          supportStatus = 'needs_support';
          priority = 'high';
          reason = daysThisWeek === 0 ? 'No check-ins yet this week' : 'Progress looks stalled';
        } else if (segments.at_risk.some((entry) => entry.id === member.id) || latestNote?.status === 'follow_up_due') {
          supportStatus = latestNote?.status === 'follow_up_due' ? 'follow_up_due' : 'needs_support';
          priority = 'medium';
          reason = latestNote?.status === 'follow_up_due' ? 'Follow-up due soon' : 'Momentum dipped this week';
        }

        return {
          id: member.id,
          youthName: member.displayName,
          supportStatus,
          priority,
          reason,
          lastCheckInLabel: formatDateLabel(latestCheckin?.lastDate || null),
          lastCheckInStatus: latestCheckin?.lastStatus || null,
          missedCheckInSignal: Math.max(0, 3 - daysThisWeek),
          stalledProgress: stalled,
          currentGoalStatus: activeGoalCount > 0 ? `${activeGoalCount} active goal${activeGoalCount === 1 ? '' : 's'}` : 'No active goals',
          nextFollowUpDate: followUpDate ? followUpDate.toISOString() : null,
          assignedStaffLabel: 'You',
          latestNoteSnippet: latestNote?.note?.slice(0, 120) || null,
          nextStep: latestNote?.next_step || null,
        };
      })
      .sort((a, b) => {
        const priorityWeight = { high: 0, medium: 1, low: 2 };
        return priorityWeight[a.priority] - priorityWeight[b.priority];
      });

    const followUpsDue = caseloadQueue
      .filter((item) => item.nextFollowUpDate)
      .sort((a, b) => new Date(a.nextFollowUpDate as string).getTime() - new Date(b.nextFollowUpDate as string).getTime())
      .slice(0, 6)
      .map((item) => ({
        youthId: item.id,
        youthName: item.youthName,
        dueDate: item.nextFollowUpDate,
        nextStep: item.nextStep || 'Check in and confirm a next step',
        status: item.supportStatus,
      }));

    const recentSupportActivity = supportNotes.slice(0, 8).map((note: any) => {
      const member = members.find((entry) => entry.id === String(note.youth_user_id));
      return {
        id: String(note._id),
        youthId: String(note.youth_user_id),
        youthName: member?.displayName || 'Youth',
        note: note.note,
        tags: Array.isArray(note.tags) ? note.tags : [],
        createdAt: note.created_at,
        status: note.status,
      };
    });

    const caseloadSummary = {
      needsAttentionNow: caseloadQueue.filter((item) => item.priority === 'high').length,
      followUpsOverdue: caseloadQueue.filter((item) => item.supportStatus === 'follow_up_due').length,
      onTrackThisWeek: caseloadQueue.filter((item) => item.supportStatus === 'on_track' || item.supportStatus === 'resolved').length,
      stalledProgress: caseloadQueue.filter((item) => item.stalledProgress).length,
    };

    const recentRecognitions = recentCredentials.map((credential: any) => {
      const member = members.find((entry) => entry.id === String(credential.user_id));
      return {
        id: String(credential._id),
        youthId: String(credential.user_id),
        youthName: member?.displayName || 'Youth',
        title: credential.title,
        credentialType: credential.credential_type,
        earnedAt: credential.earned_at,
      };
    });

    return res.json({
      troop: { id: (troop._id as any).toString(), name: troop.name, troopCode: troop.troop_code },
      segments,
      weeklyResetRate,
      teamCurrentProgress: weeklyResetRate,
      totalScouts: memberIds.length,
      groupSnapshot: {
        activeScouts: segments.active.length + segments.at_risk.length,
        goalsCreatedThisWeek,
        goalsCompletedThisWeek,
        checkinsThisWeek,
        trend,
        checkinTrend,
        trendLabel: trendSummary.trendLabel,
        trendDirection: trendSummary.trendDirection,
        supportSignal,
      },
      recognitionSnapshot: {
        rewardsIssuedThisWeek,
        youthRecognizedThisWeek,
        serviceHoursLoggedThisWeek,
        marksEarnedThisWeek,
        momentsEarnedThisWeek,
        moovasUnlockedThisWeek,
        recentRecognitions,
      },
      themeSummary: {
        topThemes,
        cohorts,
        conversationStarters,
      },
      caseloadQueue,
      followUpsDue,
      recentSupportActivity,
      caseloadSummary,
    });
  } catch (err) {
    next(err);
  }
}

// ─── Leader: send nudge ────────────────────────────────────────────────────────

export async function sendNudge(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user || req.user.role !== 'scout_leader') {
      return res.status(403).json({ error: 'Support leaders only' });
    }

    const { toUserId, message } = req.body;

    const troop = await Troop.findOne({ leader_id: req.user.id }).lean();
    if (!troop) return res.status(404).json({ error: 'No troop found' });

    const members = await resolveTroopMembers(troop);
    const memberIds = members.map((member) => member.id);
    const isMember = memberIds.includes(toUserId);
    if (process.env.NODE_ENV !== 'production') {
      console.debug('[NUDGE DIAG] sendNudge request', {
        leaderId: req.user.id,
        troopId: troop._id?.toString(),
        toUserId,
        memberIds,
        isMember,
      });
    }
    if (!isMember) return res.status(403).json({ error: 'This youth is not in your group' });

    const nudge = await ScoutNudge.create({
      from_user_id: req.user.id,
      to_user_id: toUserId,
      troop_id: troop._id,
      type: 'leader_nudge',
      message: message?.slice(0, 200),
      acknowledged: false,
    });

    await writeAuditLog({
      actor_id: req.user.id as any,
      actor_role: 'scout_leader',
      action: 'send_nudge',
      target_user_id: toUserId,
      troop_id: troop._id as any,
    });

    if (process.env.NODE_ENV !== 'production') {
      console.debug('[NUDGE DIAG] sendNudge created', {
        nudgeId: (nudge._id as any).toString(),
        toUserId,
        fromUserId: req.user.id,
        type: nudge.type,
      });
    }

    return res.status(201).json({ id: (nudge._id as any).toString() });
  } catch (err) {
    next(err);
  }
}

// ─── Leader: trigger weekly reset for entire troop ────────────────────────────

export async function troopWeeklyReset(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user || req.user.role !== 'scout_leader') {
      return res.status(403).json({ error: 'Support leaders only' });
    }

    const troop = await Troop.findOne({ leader_id: req.user.id }).lean();
    if (!troop) return res.status(404).json({ error: 'No troop found' });

    const weekStart = (() => {
      const d = new Date();
      d.setDate(d.getDate() - d.getDay());
      d.setHours(0, 0, 0, 0);
      return d;
    })();

    const members = await resolveTroopMembers(troop);
    const memberIds = members.map((member) => member.id);
    const completedIds: string[] = [];

    for (const memberId of memberIds) {
      // Mark the reset event for badge tracking
      await Checkin.create({
        user_id: memberId,
        goal_id: (await Goal.findOne({ user_id: memberId }).select('_id').lean())?._id || memberId,
        status: 'yes',
        date: new Date(),
        event_type: 'weekly_reset_completed',
        created_at: new Date(),
      });
      completedIds.push(memberId);
    }

    await processTroopWeeklyReset(completedIds, memberIds.length);

    await writeAuditLog({
      actor_id: req.user.id as any,
      actor_role: 'scout_leader',
      action: 'troop_weekly_reset',
      troop_id: troop._id as any,
      metadata: { completedCount: completedIds.length, totalScouts: memberIds.length },
    });

    return res.json({
      success: true,
      completedCount: completedIds.length,
      totalScouts: memberIds.length,
      completionRate: completedIds.length / Math.max(memberIds.length, 1),
    });
  } catch (err) {
    next(err);
  }
}

// ─── Leader: award badge to scout ─────────────────────────────────────────────

export async function awardBadge(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user || req.user.role !== 'scout_leader') {
      return res.status(403).json({ error: 'Support leaders only' });
    }

    const { toUserId, badgeTitle, badgeFocus, credentialType } = req.body;

    const troop = await Troop.findOne({ leader_id: req.user.id }).lean();
    if (!troop) return res.status(404).json({ error: 'No troop found' });

    const members = await resolveTroopMembers(troop);
    const isMember = members.some((member) => member.id === toUserId);
    if (!isMember) return res.status(403).json({ error: 'This youth is not in your group' });

    const earnedAt = new Date();
    const hashInput = `${toUserId}|${credentialType || 'badge_milestone'}|${badgeTitle}|${earnedAt.toISOString()}`;
    const proofHash = crypto.createHash('sha256').update(hashInput).digest('hex');

    await ScoutCredential.create({
      user_id: toUserId,
      credential_type: credentialType || 'badge_milestone',
      title: badgeTitle,
      badge_focus: badgeFocus,
      earned_at: earnedAt,
      issued_by: req.user.id,
      proof_hash: proofHash,
      acknowledged: false,
    });

    await writeAuditLog({
      actor_id: req.user.id as any,
      actor_role: 'scout_leader',
      action: 'award_badge',
      target_user_id: toUserId,
      troop_id: troop._id as any,
      metadata: { badgeTitle, badgeFocus, credentialType },
    });

    // Trigger Proof Pulse badge check
    await processScoutEvent(toUserId, 'leader_attestation_issued');

    return res.status(201).json({ success: true, proofHash });
  } catch (err) {
    next(err);
  }
}

// ─── Leader: get scout's portable credential record ────────────────────────────

export async function getScoutRecord(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user || req.user.role !== 'scout_leader') {
      return res.status(403).json({ error: 'Support leaders only' });
    }

    const { scoutId } = req.params;
    const troop = await Troop.findOne({ leader_id: req.user.id }).lean();
    if (!troop) return res.status(404).json({ error: 'No troop found' });

    const members = await resolveTroopMembers(troop);
    const isMember = members.some((member) => member.id === scoutId);
    if (!isMember) return res.status(403).json({ error: 'This youth is not in your group' });

    const scout = members.find((member) => member.id === scoutId);
    if (!scout) return res.status(404).json({ error: 'Youth not found' });

    const credentials = await ScoutCredential.find({ user_id: scoutId })
      .sort({ earned_at: -1 })
      .lean();

    return res.json({
      scoutId,
      nickname: scout.displayName,
      avatarUrl: scout.avatarUrl || null,
      troopCode: troop.troop_code,
      credentials: credentials.map((c) => ({
        id: (c._id as any).toString(),
        credentialType: c.credential_type,
        badgeKey: c.badge_key,
        title: c.title,
        badgeFocus: c.badge_focus,
        earnedAt: c.earned_at,
        issuedBy: c.issued_by,
        proofHash: c.proof_hash,
        anchorStatus: c.anchor_status,
        anchorHandle: c.anchor_handle,
        metadata: c.metadata,
      })),
    });
  } catch (err) {
    next(err);
  }
}

// ─── Leader: get scout support profile ────────────────────────────────────────

export async function getScoutSupportProfile(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user || req.user.role !== 'scout_leader') {
      return res.status(403).json({ error: 'Support leaders only' });
    }

    const { scoutId } = req.params;
    const troop = await Troop.findOne({ leader_id: req.user.id }).lean();
    if (!troop) return res.status(404).json({ error: 'No troop found' });

    const members = await resolveTroopMembers(troop);
    const scout = members.find((member) => member.id === scoutId);
    if (!scout) return res.status(403).json({ error: 'This youth is not in your group' });

    const scoutObjectId = new mongoose.Types.ObjectId(scoutId);
    const weekStart = getWeekStart();

    const [goals, recentCheckins, supportNotes, credentials, totalCredentials, weeklyRecognitionCount, serviceHoursRows] = await Promise.all([
      Goal.find({ user_id: scoutObjectId })
        .select('title progress completed completed_at created_at micro_step badge_focus goal_category_tag')
        .sort({ created_at: -1 })
        .lean(),
      Checkin.find({ user_id: scoutObjectId })
        .select('date status event_type')
        .sort({ date: -1 })
        .limit(8)
        .lean(),
      LeaderSupportNote.find({ troop_id: troop._id, youth_user_id: scoutObjectId })
        .sort({ created_at: -1 })
        .limit(10)
        .lean(),
      ScoutCredential.find({ user_id: scoutObjectId })
        .select('title earned_at credential_type')
        .sort({ earned_at: -1 })
        .limit(5)
        .lean(),
      ScoutCredential.countDocuments({ user_id: scoutObjectId }),
      ScoutCredential.countDocuments({ user_id: scoutObjectId, earned_at: { $gte: weekStart } }),
      ScoutCredential.aggregate([
        {
          $match: {
            user_id: scoutObjectId,
            credential_type: 'service_hours',
          },
        },
        {
          $group: {
            _id: null,
            totalHours: { $sum: { $ifNull: ['$metadata.hours', 0] } },
          },
        },
      ]),
    ]);

    const daysThisWeek = await Checkin.aggregate([
      {
        $match: {
          user_id: scoutObjectId,
          status: 'yes',
          date: { $gte: weekStart },
          $or: [{ event_type: { $exists: false } }, { event_type: { $ne: 'weekly_reset_completed' } }],
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$date' } },
        },
      },
      { $count: 'count' },
    ]).then((rows) => rows[0]?.count ?? 0);

    const activeGoals = goals.filter((goal) => !goal.completed).slice(0, 5);
    const latestSupportNote = supportNotes[0];
    const followUpDate = latestSupportNote?.follow_up_date ? new Date(latestSupportNote.follow_up_date) : null;
    const followUpOverdue = !!followUpDate && followUpDate < new Date() && latestSupportNote?.status !== 'resolved';
    const completedThisWeek = goals.filter((goal) => goal.completed && goal.completed_at && new Date(goal.completed_at) >= weekStart).length;

    const supportFlags = [
      daysThisWeek === 0 ? 'No check-ins this week' : null,
      activeGoals.length > 0 && completedThisWeek === 0 && daysThisWeek === 0 ? 'Progress appears stalled' : null,
      followUpOverdue ? 'Follow-up overdue' : null,
      latestSupportNote?.status === 'needs_support' ? 'Needs support follow-through' : null,
    ].filter(Boolean);

    const timeline = [
      ...recentCheckins.map((checkin) => ({
        id: `checkin-${(checkin as any)._id?.toString?.() || checkin.date}`,
        type: 'checkin',
        label: checkin.status === 'yes' ? 'Checked in' : 'Missed check-in',
        detail: checkin.event_type === 'weekly_reset_completed' ? 'Weekly reset completed' : 'Daily pulse recorded',
        createdAt: checkin.date,
      })),
      ...supportNotes.map((note) => ({
        id: `note-${(note._id as any).toString()}`,
        type: 'support_note',
        label: 'Support note added',
        detail: note.note,
        createdAt: note.created_at,
      })),
      ...credentials.map((credential) => ({
        id: `credential-${(credential._id as any).toString()}`,
        type: 'credential',
        label: credential.title,
        detail: 'Documented achievement',
        createdAt: credential.earned_at,
      })),
    ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return res.json({
      scout: {
        id: scoutId,
        nickname: scout.displayName,
        avatarUrl: scout.avatarUrl || null,
        cohortCode: scout.cohortCode || null,
      },
      summary: {
        daysCheckedInThisWeek: daysThisWeek,
        activeGoalCount: activeGoals.length,
        completedThisWeek,
        supportStatus: latestSupportNote?.status || (daysThisWeek === 0 ? 'needs_support' : 'on_track'),
        lastCheckInLabel: recentCheckins[0]?.date ? formatDateLabel(recentCheckins[0].date) : 'No recent check-in',
      },
      supportFlags,
      recognition: {
        totalCredentials,
        recognitionsThisWeek: weeklyRecognitionCount,
        serviceHoursLogged: Number(serviceHoursRows[0]?.totalHours || 0),
        recentCredentials: credentials.map((credential: any) => ({
          id: String(credential._id),
          title: credential.title,
          credentialType: credential.credential_type,
          earnedAt: credential.earned_at,
        })),
      },
      activeGoals: activeGoals.map((goal) => ({
        id: (goal._id as any).toString(),
        title: goal.title,
        progress: goal.progress || 0,
        microStep: goal.micro_step || null,
        badgeFocus: goal.badge_focus || null,
        category: goal.goal_category_tag || goal.category || null,
      })),
      timeline: timeline.slice(0, 12),
      supportNotes: supportNotes.map((note) => ({
        id: (note._id as any).toString(),
        note: note.note,
        tags: note.tags || [],
        nextStep: note.next_step || null,
        followUpDate: note.follow_up_date || null,
        status: note.status,
        createdAt: note.created_at,
      })),
      nextFollowUp: followUpDate ? followUpDate.toISOString() : null,
    });
  } catch (err) {
    next(err);
  }
}

// ─── Leader: add support note / follow-up ────────────────────────────────────

export async function addSupportNote(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user || req.user.role !== 'scout_leader') {
      return res.status(403).json({ error: 'Support leaders only' });
    }

    const { scoutId } = req.params;
    const troop = await Troop.findOne({ leader_id: req.user.id }).lean();
    if (!troop) return res.status(404).json({ error: 'No troop found' });

    const members = await resolveTroopMembers(troop);
    const scout = members.find((member) => member.id === scoutId);
    if (!scout) return res.status(403).json({ error: 'This youth is not in your group' });
    const scoutObjectId = new mongoose.Types.ObjectId(scoutId);

    const note = await LeaderSupportNote.create({
      troop_id: troop._id,
      youth_user_id: scoutObjectId,
      created_by: req.user.id,
      note: req.body.note,
      tags: Array.isArray(req.body.tags) ? req.body.tags : [],
      next_step: req.body.nextStep?.trim() || undefined,
      follow_up_date: req.body.followUpDate ? new Date(req.body.followUpDate) : null,
      status: req.body.status || 'needs_support',
    });

    await writeAuditLog({
      actor_id: req.user.id as any,
      actor_role: 'scout_leader',
      action: 'add_support_note',
      target_user_id: scoutObjectId,
      troop_id: troop._id as any,
      metadata: { status: note.status, tags: note.tags },
    });

    return res.status(201).json({
      id: (note._id as any).toString(),
      note: note.note,
      tags: note.tags,
      nextStep: note.next_step || null,
      followUpDate: note.follow_up_date || null,
      status: note.status,
      createdAt: note.created_at,
    });
  } catch (err) {
    next(err);
  }
}

// ─── Leader: log service hours for a scout ────────────────────────────────────

export async function logServiceHours(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user || req.user.role !== 'scout_leader') {
      return res.status(403).json({ error: 'Support leaders only' });
    }

    const { toUserId, hours, description, projectName } = req.body;

    const troop = await Troop.findOne({ leader_id: req.user.id }).lean();
    if (!troop) return res.status(404).json({ error: 'No troop found' });

    const members = await resolveTroopMembers(troop);
    const isMember = members.some((member) => member.id === toUserId);
    if (!isMember) return res.status(403).json({ error: 'This youth is not in your group' });

    if (!hours || hours <= 0) return res.status(400).json({ error: 'Valid hour count required' });

    const earnedAt = new Date();
    const title = projectName ? `${hours}h — ${projectName}` : `${hours} service hours`;
    const hashInput = `${toUserId}|service_hours|${title}|${earnedAt.toISOString()}`;
    const proofHash = crypto.createHash('sha256').update(hashInput).digest('hex');

    const credential = await ScoutCredential.create({
      user_id: toUserId,
      credential_type: 'service_hours',
      title,
      badge_focus: 'Community Service',
      earned_at: earnedAt,
      issued_by: req.user.id,
      proof_hash: proofHash,
      acknowledged: false,
      metadata: { hours, description, projectName },
    });

    await writeAuditLog({
      actor_id: req.user.id as any,
      actor_role: 'scout_leader',
      action: 'award_badge',
      target_user_id: toUserId,
      troop_id: troop._id as any,
      metadata: { credentialType: 'service_hours', hours, projectName },
    });

    return res.status(201).json({ success: true, proofHash, id: (credential._id as any).toString() });
  } catch (err) {
    next(err);
  }
}
