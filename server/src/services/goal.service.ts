import * as goalRepo from '../repositories/goal.repo';
import * as checkinRepo from '../repositories/checkin.repo';
import * as aiGoalFeedbackRepo from '../repositories/ai-goal-feedback.repo';
import { eventBus } from '../lib/event-bus';
import { NotFoundError, ForbiddenError } from '../lib/errors';
import { logger } from '../lib/logger';

// Week utilities
function getWeekStart(d: Date): Date {
  const date = new Date(d);
  const day = date.getUTCDay();
  const diff = (day + 6) % 7;
  date.setUTCDate(date.getUTCDate() - diff);
  date.setUTCHours(0, 0, 0, 0);
  return date;
}

function isSameWeek(dateA: Date, dateB: Date): boolean {
  return getWeekStart(dateA).getTime() === getWeekStart(dateB).getTime();
}

function todayKey(): string {
  return ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][new Date().getDay()];
}

type PlannedDays = {
  sun?: boolean;
  mon?: boolean;
  tue?: boolean;
  wed?: boolean;
  thu?: boolean;
  fri?: boolean;
  sat?: boolean;
};

function mapGoal(goal: any) {
  return {
    id: goal.id,
    title: goal.title,
    description: goal.description,
    category: goal.category || 'personal',
    progress: typeof goal.progress === 'number' ? goal.progress : 0,
    completed: Boolean(goal.completed),
    status: goal.status,
    weekStart: goal.week_start,
    resized: goal.resized,
    carriedOverFrom: goal.carried_over_from,
    createdAt: goal.created_at,
    completedAt: goal.completed_at,
    milestones: goal.milestones || [],
    plannedDays: goal.planned_days || {},
    microStep: goal.micro_step || '',
    lastCheckin: goal.last_checkin || {},
    completedDates: goal.completed_dates || [],
  };
}

export async function listGoals(userId: string) {
  const goals = await goalRepo.findByUserId(userId);
  return goals.map(mapGoal);
}

export async function getTodayGoals(userId: string) {
  const key = todayKey();
  const now = new Date();
  const goals = await goalRepo.findActiveByUserId(userId);
  const weekStart = getWeekStart(now);

  return goals
    .filter((g) => {
      const pd = g.planned_days as PlannedDays | null;
      return pd && (pd as any)[key];
    })
    .map((g) => {
      const completedThisWeek = (g.completed_dates || []).filter((d: any) =>
        isSameWeek(new Date(d), now),
      ).length;
      const pd = (g.planned_days as PlannedDays) || {};
      const plannedCount =
        Object.values(pd).filter(Boolean).length || 1;
      return { ...mapGoal(g), plannedCount, completedThisWeek, weekStart };
    });
}

export async function createGoal(
  userId: string,
  data: {
    title: string;
    description?: string;
    category?: string;
    progress?: number;
    source?: string;
    suggestionId?: string;
    suggestionTitle?: string;
    archetypeAligned?: boolean;
    plannedDays?: PlannedDays;
    microStep?: string;
  },
) {
  const isComplete = typeof data.progress === 'number' && data.progress >= 100;
  const today = new Date();
  const weekStart = getWeekStart(today);
  const dayIdx = today.getDay();
  const tomorrowIdx = (dayIdx + 1) % 7;
  const dayKeys = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
  const defaultDays: any = {
    sun: false,
    mon: false,
    tue: false,
    wed: false,
    thu: false,
    fri: false,
    sat: false,
  };
  defaultDays[dayKeys[dayIdx]] = true;
  defaultDays[dayKeys[tomorrowIdx]] = true;

  const goal = await goalRepo.create({
    user_id: userId,
    title: data.title,
    description: data.description || '',
    category: data.category || 'personal',
    progress: typeof data.progress === 'number' ? data.progress : 0,
    completed: isComplete,
    status: isComplete ? 'completed' : 'active',
    completed_at: isComplete ? new Date() : null,
    week_start: weekStart,
    planned_days: data.plannedDays || defaultDays,
    micro_step: data.microStep || '',
    completed_dates: [],
    source: data.source || 'manual',
    suggestion_id: data.source === 'ai' ? data.suggestionId : undefined,
    suggestion_title: data.source === 'ai' ? data.suggestionTitle : undefined,
    adopted_at: data.source === 'ai' ? new Date() : undefined,
    archetype_aligned: data.source === 'ai' ? (data.archetypeAligned ?? false) : false,
    milestones: [],
  });

  if (data.source === 'ai') {
    await aiGoalFeedbackRepo.create({
      userId,
      goalId: goal.id,
      adoptionReason: `Adopted TINY suggestion: ${data.suggestionTitle}`,
    });
  }

  return mapGoal(goal);
}

export async function completeGoal(goalId: string, userId: string) {
  const goal = await goalRepo.findById(goalId);
  if (!goal) throw new NotFoundError('Goal');
  if (goal.user_id !== userId) throw new ForbiddenError();

  const updated = await goalRepo.update(goalId, {
    completed: true,
    status: 'completed',
    progress: 100,
    completed_at: new Date(),
  });

  const { awardMark } = await import('./reward.service');
  await awardMark(userId, goalId, goal.title || 'Goal completed').catch(() => null);

  return mapGoal(updated);
}

export async function checkinGoal(
  goalId: string,
  userId: string,
  status: 'yes' | 'not_yet',
  note?: string,
  snoozes?: number,
  effortLevel?: 1 | 2 | 3,
  reflection?: string,
  checkInWindow?: string,
) {
  const goal = await goalRepo.findById(goalId);
  if (!goal) throw new NotFoundError('Goal');
  if (goal.user_id !== userId) throw new ForbiddenError();

  const today = new Date();
  const weekStart = getWeekStart(today);
  let completedDates = [...(goal.completed_dates || [])];

  const lastCheckin: any =
    status === 'yes'
      ? { status: 'yes', date: today.toISOString(), snoozes: snoozes || 0 }
      : { status: 'not_yet', date: today.toISOString(), snoozes: snoozes || 0 };

  if (status === 'yes') {
    const already = completedDates.some(
      (d) =>
        isSameWeek(new Date(d), today) &&
        new Date(d).toDateString() === today.toDateString(),
    );
    if (!already) {
      completedDates.push(today);
    }
  }

  const updated = await goalRepo.update(goalId, {
    completed_dates: completedDates,
    last_checkin: lastCheckin,
  });

  // Best-effort checkin log
  try {
    await checkinRepo.create({
      userId,
      goalId,
      status,
      date: today,
      note,
      snoozes: snoozes || 0,
      effortLevel,
      reflection,
      checkInWindow,
    });
  } catch (e) {
    logger.warn({ err: e }, 'Checkin log skipped');
  }

  const completedThisWeek = completedDates.filter((d) =>
    isSameWeek(new Date(d), today),
  ).length;
  const pd = (updated.planned_days as PlannedDays) || {};
  const plannedCount = Object.values(pd).filter(Boolean).length || 1;

  // Award Mark for yes check-ins
  let rewardEarned: { type: string; title: string } | null = null;
  if (status === 'yes') {
    const { awardMark } = await import('./reward.service');
    rewardEarned = await awardMark(userId, goalId, goal.title || 'Goal check-in').catch(() => null);
  }

  return {
    ...mapGoal(updated),
    completedThisWeek,
    plannedCount,
    weekStart,
    rewardEarned,
  };
}

export async function addMilestone(
  goalId: string,
  userId: string,
  title: string,
  target?: string,
) {
  const goal = await goalRepo.findById(goalId);
  if (!goal) throw new NotFoundError('Goal');
  if (goal.user_id !== userId) throw new ForbiddenError();

  const updated = await goalRepo.addMilestone(goalId, {
    title,
    target: target || '',
    createdAt: new Date(),
  });
  if (!updated) throw new NotFoundError('Goal');
  return mapGoal(updated);
}

export async function deleteGoal(goalId: string, userId: string) {
  const goal = await goalRepo.findById(goalId);
  if (!goal) throw new NotFoundError('Goal');
  if (goal.user_id !== userId) throw new ForbiddenError();
  await goalRepo.remove(goalId);
  return { success: true };
}

export async function updateSchedule(
  goalId: string,
  userId: string,
  data: { plannedDays?: PlannedDays; microStep?: string; reminderWindow?: string },
) {
  const goal = await goalRepo.findById(goalId);
  if (!goal) throw new NotFoundError('Goal');
  if (goal.user_id !== userId) throw new ForbiddenError();

  const updateData: any = {};
  if (data.plannedDays) updateData.planned_days = data.plannedDays;
  if (data.microStep !== undefined) updateData.micro_step = data.microStep;
  if (data.reminderWindow !== undefined)
    updateData.reminder_window = data.reminderWindow;

  const updated = await goalRepo.update(goalId, updateData);
  return mapGoal(updated);
}

export async function weeklyReset(userId: string, shrinkToOneDay: boolean) {
  const now = new Date();
  const currentWeek = getWeekStart(now);
  const goals = await goalRepo.findActiveByUserId(userId);
  let updatedCount = 0;

  for (const goal of goals) {
    const ws = goal.week_start ? new Date(goal.week_start) : null;
    const needsReset = !ws || !isSameWeek(ws, currentWeek);
    if (!needsReset) continue;

    const data = resetGoal(goal, currentWeek, shrinkToOneDay);
    await goalRepo.update(goal.id, data);
    updatedCount++;
  }

  return { ok: true, updated: updatedCount };
}

export async function completeMilestone(
  goalId: string,
  userId: string,
  milestoneIndex: number,
) {
  const goal = await goalRepo.findById(goalId);
  if (!goal) throw new NotFoundError('Goal');
  if (goal.user_id !== userId) throw new ForbiddenError();

  const milestones = (goal.milestones as any[]) || [];
  if (milestoneIndex < 0 || milestoneIndex >= milestones.length) {
    throw new NotFoundError('Milestone');
  }

  milestones[milestoneIndex].completed = true;
  milestones[milestoneIndex].completedAt = new Date();

  const totalMilestones = milestones.length;
  const completedCount = milestones.filter((m: any) => m.completed).length;
  const newProgress =
    totalMilestones > 0
      ? Math.round((completedCount / totalMilestones) * 100)
      : 0;

  const updated = await goalRepo.update(goalId, {
    milestones,
    progress: newProgress,
  });

  eventBus.emitMilestoneCompleted({
    goalId,
    userId,
    milestoneIndex,
    milestoneTitle: milestones[milestoneIndex]?.title || '',
    goalTitle: goal.title,
    goalCategory: goal.category || 'personal',
    progressPercentage: newProgress,
    isAISourced: goal.source === 'ai',
    completedAt: new Date(),
    totalMilestones,
    completedCount,
  });

  return mapGoal(updated);
}

/** Shared weekly reset logic for a single goal */
function resetGoal(
  goal: any,
  currentWeek: Date,
  shrinkToOneDay: boolean,
): Record<string, any> {
  let planned = (goal.planned_days as PlannedDays) || {};
  if (shrinkToOneDay) {
    const firstDay = Object.entries(planned).find(
      ([_, v]) => Boolean(v),
    )?.[0];
    planned = {
      sun: false,
      mon: false,
      tue: false,
      wed: false,
      thu: false,
      fri: false,
      sat: false,
    };
    if (firstDay) (planned as any)[firstDay] = true;
  }

  return {
    completed_dates: [],
    last_checkin: {},
    week_start: currentWeek,
    resized: shrinkToOneDay,
    carried_over_from: goal.carried_over_from || goal.id,
    planned_days: planned,
  };
}

/** Batch weekly reset for cron (all users) */
export async function resetAllGoals(shrinkToOneDay: boolean) {
  const now = new Date();
  const currentWeek = getWeekStart(now);
  const goals = await goalRepo.findIncompleteGoals(10000);
  let updatedCount = 0;

  for (const goal of goals) {
    const ws = goal.week_start ? new Date(goal.week_start) : null;
    const needsReset = !ws || !isSameWeek(ws, currentWeek);
    if (!needsReset) continue;

    const data = resetGoal(goal, currentWeek, shrinkToOneDay);
    await goalRepo.update(goal.id, data);
    updatedCount++;
  }

  return updatedCount;
}

export async function updateGoal(
  goalId: string,
  userId: string,
  data: { title?: string; description?: string; category?: string },
) {
  const goal = await goalRepo.findById(goalId);
  if (!goal) throw new NotFoundError('Goal');
  if (goal.user_id !== userId) throw new ForbiddenError();

  const updateData: any = {};
  if (data.title !== undefined) updateData.title = data.title;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.category !== undefined) updateData.category = data.category;

  const updated = await goalRepo.update(goalId, updateData);
  return mapGoal(updated);
}
