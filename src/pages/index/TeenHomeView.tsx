import { Button } from "@/components/ui/button";
import CrystalBall from "@/components/CrystalBall";
import AttributesList from "@/components/AttributesList";
import { triggerHaptic } from "@/utils/haptics";
import type { ApiTodayGoal } from "@/types/api";
import type { TeenHomePrimaryAction } from "./resolveTeenHomePrimaryAction";

interface TeenHomeViewProps {
  progress: number;
  attributes: string[];
  todayGoals?: ApiTodayGoal[];
  primaryAction: TeenHomePrimaryAction;
  primaryActionLabel: string;
  onPrimaryAction: () => void | Promise<void>;
  onTinyClick: () => void;
  onAddGoalClick: () => void;
  onNewPost: () => void;
}

const TeenHomeView = ({
  progress,
  attributes,
  todayGoals,
  primaryAction,
  primaryActionLabel,
  onPrimaryAction,
  onTinyClick,
  onAddGoalClick,
  onNewPost,
}: TeenHomeViewProps) => {
  const goals = Array.isArray(todayGoals) ? todayGoals : [];
  const totalPlanned = goals.reduce((sum, goal) => sum + (goal.plannedCount || 0), 0);
  const totalCompleted = goals.reduce((sum, goal) => sum + (goal.completedThisWeek || 0), 0);
  const primaryGoal = goals.find((goal) => !(goal.lastCheckin?.date && new Date(goal.lastCheckin.date).toDateString() === new Date().toDateString())) ?? goals[0];
  const todayKey = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"][new Date().getDay()];
  const nextPlannedDay = (() => {
    if (!primaryGoal?.plannedDays) return null;
    const orderedDays = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
    const labels: Record<string, string> = {
      sun: "Sunday",
      mon: "Monday",
      tue: "Tuesday",
      wed: "Wednesday",
      thu: "Thursday",
      fri: "Friday",
      sat: "Saturday",
    };
    const startIndex = orderedDays.indexOf(todayKey);
    for (let offset = 1; offset <= orderedDays.length; offset += 1) {
      const key = orderedDays[(startIndex + offset) % orderedDays.length];
      if (primaryGoal.plannedDays[key]) return labels[key];
    }
    return null;
  })();
  const checkedInToday = goals.filter((goal) => goal.lastCheckin?.date && new Date(goal.lastCheckin.date).toDateString() === new Date().toDateString()).length;
  const loopTitle =
    primaryAction === "CREATE_TODAY_GOAL"
      ? "Let's create today's goal"
      : primaryAction === "START_WEEKLY_RESET"
      ? "Start this week's plan"
      : primaryAction === "CHECK_IN"
      ? "Today's check-in is ready"
      : primaryAction === "DO_NEXT_STEP"
      ? "Your next step is ready"
      : "You're caught up for now";
  const loopCopy =
    primaryAction === "CREATE_TODAY_GOAL"
      ? "Start with one goal for today. TINY will help shape it into something small and real."
      : primaryAction === "START_WEEKLY_RESET"
      ? "Reset the week first so today's effort lands in the right place."
      : primaryAction === "CHECK_IN"
      ? "Use today's focus right below to log the 10-second daily pulse."
      : primaryAction === "DO_NEXT_STEP"
      ? "You already have a next step. Do it, then check in right below."
      : "You finished the main loop. Review your rhythm, then leave with clarity.";

  return (
    <div className="w-full max-w-2xl px-4 space-y-5">
      <div
        id="tiny-loop-card"
        data-testid="tiny-loop-card"
        className="surface-panel p-5 sm:p-6 space-y-6"
      >
        <div className="text-center">
          <p className="eyebrow">
            Start here
          </p>
          <h3 className="display-title text-[2rem] sm:text-[2.5rem] font-semibold text-foreground mt-2 break-words">
            {loopTitle}
          </h3>
          <p className="text-sm text-muted-foreground mt-2 break-words max-w-lg mx-auto leading-relaxed">
            {loopCopy}
          </p>
        </div>

        <CrystalBall
          progress={progress}
          todayGoals={todayGoals}
          primaryAction={primaryAction}
          primaryActionLabel={primaryActionLabel}
          onPrimaryAction={onPrimaryAction}
          onTinyClick={onTinyClick}
          onAddGoalClick={onAddGoalClick}
        />

        {goals.length === 0 && (
          <div className="rounded-[1.35rem] border border-white/10 bg-white/[0.04] p-4 space-y-2">
            <div className="min-w-0">
              <p className="eyebrow">
                Next step
              </p>
              <h4 className="display-title text-xl font-semibold text-foreground mt-2 break-words">
                Add 1 goal day so you can check in today.
              </h4>
              <p className="text-sm text-muted-foreground mt-2 break-words">
                Start with today's goal first. Once it's saved, your next step and check-in will show up right here.
              </p>
            </div>
          </div>
        )}

        <div
          id="weekly-progress-card"
          data-testid="weekly-progress-card"
          className="rounded-[1.35rem] border border-white/10 bg-white/[0.02] p-4 space-y-4"
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
            <div className="min-w-0">
              <p className="eyebrow">
                Weekly progress
              </p>
              <h3 className="display-title text-xl sm:text-2xl font-semibold text-foreground mt-2 break-words">
                {totalPlanned > 0 ? `${totalCompleted}/${totalPlanned} wins this week` : "Start with 1 planned day this week"}
              </h3>
              <p className="text-sm text-muted-foreground mt-2 leading-relaxed break-words">
                {totalPlanned > 0
                  ? "Keep the loop small: ask TINY, check in once, and confirm your next day."
                  : "Set up one check-in day, ask TINY for the smallest step, and keep your week moving."}
              </p>
            </div>
            <div className="rounded-full bg-white text-black px-3 py-1 text-sm font-semibold shrink-0 border border-white/10 self-start">
              {progress}%
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div className="rounded-[1.1rem] bg-black/20 border border-white/10 px-3 py-3 min-w-0">
              <p className="eyebrow">
                Wins this week
              </p>
              <p className="text-lg sm:text-xl font-semibold text-foreground mt-2 break-words">{totalCompleted}</p>
            </div>
            <div className="rounded-[1.1rem] bg-black/20 border border-white/10 px-3 py-3 min-w-0">
              <p className="eyebrow">
                Checked in today
              </p>
              <p className="text-lg sm:text-xl font-semibold text-foreground mt-2 break-words">{checkedInToday}</p>
            </div>
            <div className="rounded-[1.1rem] bg-black/20 border border-white/10 px-3 py-3 min-w-0">
              <p className="eyebrow">
                Next planned day
              </p>
              <p className="text-lg sm:text-xl font-semibold text-foreground mt-2 break-words">{nextPlannedDay || "Set a day"}</p>
            </div>
          </div>

          <div
            id="tiny-next-step"
            data-testid="tiny-next-step"
            className="rounded-[1.1rem] bg-black/20 border border-white/10 px-3 py-3 min-w-0"
          >
            <p className="eyebrow">
              Next step
            </p>
            <p className="text-sm text-foreground mt-2 break-words">
              {primaryGoal?.microStep || "Next step: create today's goal so TINY can give you one small action to take."}
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <Button
            variant="outline"
            onClick={() => {
              triggerHaptic("medium");
              onAddGoalClick();
            }}
            className="w-full min-h-11 h-auto px-4 py-3 text-sm sm:text-base whitespace-normal break-words"
          >
            {goals.length === 0 ? "Create your first goal" : "Add or adjust a goal"}
          </Button>
          <button
            onClick={() => {
              triggerHaptic("medium");
              onNewPost();
            }}
            className="w-full text-center text-sm text-muted-foreground hover:text-foreground transition-colors py-1"
          >
            Community update
          </button>
        </div>
      </div>

      <div className="surface-panel p-4 sm:p-5 space-y-3 bg-white/[0.02]">
        <div>
          <p className="eyebrow">
            You're building
          </p>
          <p className="text-sm text-muted-foreground mt-2 break-words">
            Progress traits update as you keep showing up.
          </p>
        </div>
        <AttributesList attributes={attributes} />
      </div>
    </div>
  );
};

export default TeenHomeView;
