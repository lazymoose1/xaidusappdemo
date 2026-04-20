import type { ApiGoal, ApiTodayGoal } from "@/types/api";

export type TeenHomePrimaryAction =
  | "CHECK_IN"
  | "CREATE_TODAY_GOAL"
  | "DO_NEXT_STEP"
  | "START_WEEKLY_RESET"
  | "NONE";

export interface TeenHomePrimaryActionResolution {
  primaryAction: TeenHomePrimaryAction;
  primaryGoal: ApiGoal | ApiTodayGoal | null;
  hasGoalForToday: boolean;
  weeklyResetDue: boolean;
  nextStepText: string;
}

const todayStr = new Date().toDateString();

function getWeekStart(date: Date) {
  const next = new Date(date);
  const day = next.getUTCDay();
  const diff = (day + 6) % 7;
  next.setUTCDate(next.getUTCDate() - diff);
  next.setUTCHours(0, 0, 0, 0);
  return next;
}

function isSameWeek(dateA?: string | Date | null, dateB: Date = new Date()) {
  if (!dateA) return false;
  return getWeekStart(new Date(dateA)).getTime() === getWeekStart(dateB).getTime();
}

function isCheckedInToday(goal: ApiGoal | ApiTodayGoal) {
  if (goal.completedDates?.some((date) => new Date(date).toDateString() === todayStr)) return true;
  if (goal.lastCheckin?.date && new Date(goal.lastCheckin.date).toDateString() === todayStr) return true;
  return false;
}

export function resolveTeenHomePrimaryAction({
  allGoals,
  todayGoals,
}: {
  allGoals?: ApiGoal[];
  todayGoals?: ApiTodayGoal[];
}): TeenHomePrimaryActionResolution {
  const goals = Array.isArray(allGoals) ? allGoals : [];
  const todaysGoals = Array.isArray(todayGoals) ? todayGoals : [];
  const activeGoals = goals.filter((goal) => !goal.completed);
  const hasGoalForToday = todaysGoals.length > 0;
  const primaryGoal =
    todaysGoals.find((goal) => !isCheckedInToday(goal)) ??
    todaysGoals[0] ??
    activeGoals[0] ??
    null;

  const activeWeekStarted = activeGoals.some((goal) => isSameWeek(goal.weekStart || goal.createdAt || goal.created_at || null));
  const weeklyResetDue = activeGoals.length > 0 && !activeWeekStarted;
  const checkInDue = Boolean(primaryGoal && hasGoalForToday && !isCheckedInToday(primaryGoal));
  const nextStepText = primaryGoal?.microStep?.trim()
    ? primaryGoal.microStep.trim()
    : "Create today's goal first so TINY can give you one next step.";
  const hasNextStep = Boolean(primaryGoal?.microStep?.trim());

  if (weeklyResetDue && !activeWeekStarted) {
    return {
      primaryAction: "START_WEEKLY_RESET",
      primaryGoal,
      hasGoalForToday,
      weeklyResetDue,
      nextStepText,
    };
  }

  if (!hasGoalForToday) {
    return {
      primaryAction: "CREATE_TODAY_GOAL",
      primaryGoal,
      hasGoalForToday,
      weeklyResetDue,
      nextStepText,
    };
  }

  if (checkInDue) {
    return {
      primaryAction: "CHECK_IN",
      primaryGoal,
      hasGoalForToday,
      weeklyResetDue,
      nextStepText,
    };
  }

  if (hasNextStep) {
    return {
      primaryAction: "DO_NEXT_STEP",
      primaryGoal,
      hasGoalForToday,
      weeklyResetDue,
      nextStepText,
    };
  }

  return {
    primaryAction: "NONE",
    primaryGoal,
    hasGoalForToday,
    weeklyResetDue,
    nextStepText,
  };
}
