import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckCircle2 } from "lucide-react";
import type { ApiTodayGoal } from "@/types/api";
import type { TeenHomePrimaryAction } from "./resolveTeenHomePrimaryAction";

interface TodayGoalsCardProps {
  todayGoals: ApiTodayGoal[];
  loading?: boolean;
  primaryAction: TeenHomePrimaryAction;
  onCheckin: (goalId: string, status: "yes" | "not_yet") => void;
  onRefresh: () => void;
}

const todayStr = new Date().toDateString();

function isCheckedInToday(g: ApiTodayGoal): boolean {
  if (g.completedDates?.some((d) => new Date(d).toDateString() === todayStr)) return true;
  if (g.lastCheckin?.date && new Date(g.lastCheckin.date).toDateString() === todayStr) return true;
  return false;
}

const TodayGoalsCard = ({ todayGoals, loading, primaryAction, onCheckin, onRefresh }: TodayGoalsCardProps) => {
  const goals = Array.isArray(todayGoals) ? todayGoals : [];
  const primaryGoal = goals.find((g) => !isCheckedInToday(g)) ?? goals[0];
  const secondaryGoals = primaryGoal ? goals.filter((g) => g.id !== primaryGoal.id) : [];
  const helperCopy =
    primaryAction === "CREATE_TODAY_GOAL"
      ? "Create today's goal first. Once it's saved, your check-in and next step will appear here."
      : "Check in here after TINY helps you shape the next small move.";

  return (
    <div className="w-full max-w-2xl px-4">
      <div
        id="today-focus-card"
        data-testid="today-focus-card"
        className="surface-panel p-4 sm:p-5"
      >
        <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="eyebrow">After TINY</p>
            <h3 className="display-title text-[1.9rem] sm:text-[2.3rem] font-semibold text-foreground break-words">Today's focus</h3>
            <p className="text-sm text-muted-foreground break-words mt-2 leading-relaxed">{helperCopy}</p>
          </div>
          <Button variant="ghost" size="sm" onClick={onRefresh} disabled={loading} className="self-start sm:self-auto">
            Refresh
          </Button>
        </div>

        {loading ? (
          <div className="space-y-3">
            <Skeleton className="h-40 w-full rounded-lg" />
            <Skeleton className="h-16 w-full rounded-lg" />
          </div>
        ) : goals.length === 0 ? (
          <div className="rounded-[1.35rem] border border-dashed border-white/14 bg-white/[0.025] p-4 space-y-3">
            <div className="min-w-0">
              <p className="eyebrow">
                No focus yet
              </p>
              <h4 className="display-title text-xl font-semibold text-foreground mt-2 break-words">
                No goal is planned for today yet.
              </h4>
              <p className="text-sm text-muted-foreground mt-2 break-words">
                Use the main button above to create today's goal first. Once it's saved, you'll see your check-in and next step here.
              </p>
            </div>
            <Button
              variant="ghost"
              className="w-full min-h-11 h-auto whitespace-normal text-muted-foreground hover:text-foreground"
              onClick={onRefresh}
            >
              Refresh goals
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {primaryGoal && (() => {
              const planned = primaryGoal.plannedCount || 1;
              const completed = primaryGoal.completedThisWeek || 0;
              const pct = Math.min(100, Math.round((completed / planned) * 100));
              const checkedIn = isCheckedInToday(primaryGoal);

              return (
                <div className={`rounded-[1.35rem] border p-4 bg-black/20 space-y-4 transition-colors ${
                  checkedIn ? 'border-white/20 bg-white/[0.05]' : 'border-white/10'
                }`}>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      {checkedIn && <CheckCircle2 className="w-4 h-4 text-white flex-shrink-0" />}
                      <span className="eyebrow">
                        Current goal
                      </span>
                    </div>
                    <p className="display-title text-xl sm:text-2xl font-semibold text-foreground break-words">
                      {primaryGoal.title}
                    </p>
                    <p className="text-sm text-muted-foreground leading-relaxed break-words">
                      {primaryGoal.microStep || "Take the smallest useful next step and check in when you're done."}
                    </p>
                  </div>

                  <div className="rounded-[1.1rem] bg-white/[0.025] px-3 py-3 min-w-0 border border-white/8">
                    <p className="eyebrow">
                      Check-in step
                    </p>
                    <p className="text-sm text-foreground mt-2 break-words">
                      {primaryGoal.microStep || "Show up for this goal today, even if it's only a few minutes."}
                    </p>
                  </div>

                  {checkedIn ? (
                    <p className="text-sm text-foreground font-medium">Done for today ✓</p>
                  ) : (
                    <div className="flex flex-col sm:flex-row gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 min-h-10 h-auto whitespace-normal"
                        onClick={() => onCheckin(primaryGoal.id, "not_yet")}
                      >
                        Not yet
                      </Button>
                      <Button
                        size="sm"
                        className="flex-1 min-h-10 h-auto whitespace-normal"
                        onClick={() => onCheckin(primaryGoal.id, "yes")}
                      >
                        Check in
                      </Button>
                    </div>
                  )}

                  <div className="space-y-1">
                    <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
                      <span>This week</span>
                      <span className="shrink-0">{completed}/{planned} check-ins</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-white/10">
                      <div
                        className="h-1.5 rounded-full bg-white transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })()}

            {secondaryGoals.length > 0 && (
              <div className="rounded-[1.1rem] border border-white/10 bg-white/[0.02] p-3 space-y-2">
                <p className="eyebrow">
                  Also on deck
                </p>
                <div className="space-y-2">
                  {secondaryGoals.map((g) => {
                    const checkedIn = isCheckedInToday(g);
                    return (
                      <div key={g.id} className="flex items-start gap-2">
                        <div className={`mt-1.5 w-2 h-2 rounded-full ${checkedIn ? 'bg-accent' : 'bg-muted-foreground/40'}`} />
                        <div className="min-w-0 flex-1">
                          <p className={`text-sm break-words ${checkedIn ? 'text-muted-foreground line-through' : 'text-foreground'}`}>
                            {g.title}
                          </p>
                          {g.microStep && (
                            <p className="text-xs text-muted-foreground break-words">{g.microStep}</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default TodayGoalsCard;
