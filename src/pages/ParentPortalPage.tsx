import { useEffect, useMemo, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import ParentDisclaimerModal from "@/components/ParentDisclaimerModal";
import BrandWordmark from "@/components/BrandWordmark";
import { parentPortalApi } from "@/api/endpoints";
import type { ApiParentChild, ApiWeeklySummary } from "@/types/api";

const fallbackSnapshot: ApiWeeklySummary = {
  goalsSet: 0,
  goalsCompleted: 0,
  trend: [0, 0, 0, 0, 0, 0, 0],
  cadence: "Sundays at 7:00pm",
  conversationStarters: [
    "Ask what helped this week feel smoother.",
    "Notice one small win together.",
    "Ask what tomorrow's focus might be.",
  ],
  coachStyle: "calm",
};

const ParentPortalPage = () => {
  const navigate = useNavigate();
  const [showDisclaimer, setShowDisclaimer] = useState(true);
  const [teens, setTeens] = useState<ApiParentChild[]>([]);
  const [weeklySnapshot, setWeeklySnapshot] = useState<ApiWeeklySummary>(fallbackSnapshot);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadPortal = async () => {
      setLoading(true);
      const [childrenResult, snapshotResult] = await Promise.allSettled([
        parentPortalApi.getChildren(),
        parentPortalApi.getWeeklySummary(),
      ]);

      if (childrenResult.status === "fulfilled") {
        setTeens(Array.isArray(childrenResult.value) ? childrenResult.value : []);
      } else {
        setTeens([]);
      }

      if (snapshotResult.status === "fulfilled") {
        const data = snapshotResult.value;
        setWeeklySnapshot({
          goalsSet: Number(data?.goalsSet) || 0,
          goalsCompleted: Number(data?.goalsCompleted) || 0,
          trend: Array.isArray(data?.trend) && data.trend.length > 0 ? data.trend : fallbackSnapshot.trend,
          cadence: typeof data?.cadence === "string" ? data.cadence : fallbackSnapshot.cadence,
          conversationStarters:
            Array.isArray(data?.conversationStarters) && data.conversationStarters.length > 0
              ? data.conversationStarters
              : fallbackSnapshot.conversationStarters,
          coachStyle: typeof data?.coachStyle === "string" ? data.coachStyle : fallbackSnapshot.coachStyle,
        });
      } else {
        setWeeklySnapshot(fallbackSnapshot);
      }

      setLoading(false);
    };

    void loadPortal();
  }, []);

  const totalGoals = teens.reduce((sum, teen) => sum + teen.goals.length, 0);
  const completedGoals = teens.reduce((sum, teen) => sum + teen.goals.filter((goal) => goal.completed).length, 0);

  const trendSummary = useMemo(() => {
    const trend = weeklySnapshot.trend || [];
    if (teens.length === 0) {
      return "Link a teen from home first. This page will then stay focused on goal follow-through and conversation support.";
    }
    if ((weeklySnapshot.goalsSet || totalGoals) === 0) {
      return "This week is still taking shape. You’ll see more here once goals and check-ins start to accumulate.";
    }
    const midpoint = Math.max(1, Math.floor(trend.length / 2));
    const earlyAverage = trend.slice(0, midpoint).reduce((sum, value) => sum + value, 0) / midpoint;
    const lateSlice = trend.slice(midpoint);
    const lateAverage = lateSlice.reduce((sum, value) => sum + value, 0) / lateSlice.length;

    if (lateAverage > earlyAverage) return "Effort looks more consistent than it did earlier in the week.";
    if (lateAverage < earlyAverage) return "Momentum softened after midweek, so a calm reset may help.";
    return "The week looks steady so far.";
  }, [teens.length, totalGoals, weeklySnapshot.goalsSet, weeklySnapshot.trend]);

  return (
    <>
      <div className="min-h-screen pb-24 bg-background">
        <header className="app-shell-header h-[15vh] fixed top-0 left-0 right-0 z-40">
          <div className="flex items-center justify-center h-full relative px-4">
            <button
              aria-label="Go back"
              onClick={() => navigate(-1)}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-foreground"
            >
              <ArrowLeft size={20} />
            </button>
            <div className="flex flex-col items-center gap-1">
              <BrandWordmark compact />
              <h1 className="display-title text-sm text-foreground/72">Linked teens</h1>
            </div>
            <button
              onClick={() => navigate("/settings/parent")}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground"
            >
              Settings
            </button>
          </div>
        </header>

        <main className="pt-[calc(15vh+1rem)] px-4 pb-24 space-y-5 max-w-3xl mx-auto">
          <Card className="p-5 border-border bg-card">
            <div className="space-y-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Portal focus</p>
                <h2 className="mt-1 font-serif text-2xl text-foreground">Support without overreaching</h2>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                You’ll see goal follow-through, consistency, and conversation prompts here. Private messages, detailed reflections, and passive monitoring stay out of this view.
              </p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="rounded-xl border border-border bg-muted/30 px-4 py-3">
                  <p className="text-xs font-medium text-muted-foreground">Linked teens</p>
                  <p className="mt-1 text-2xl font-semibold text-foreground">{teens.length}</p>
                </div>
                <div className="rounded-xl border border-border bg-muted/30 px-4 py-3">
                  <p className="text-xs font-medium text-muted-foreground">Goals completed</p>
                  <p className="mt-1 text-2xl font-semibold text-foreground">{weeklySnapshot.goalsCompleted || completedGoals}</p>
                </div>
                <div className="rounded-xl border border-border bg-muted/30 px-4 py-3">
                  <p className="text-xs font-medium text-muted-foreground">Weekly cadence</p>
                  <p className="mt-1 text-sm font-medium text-foreground break-words">{weeklySnapshot.cadence}</p>
                </div>
              </div>
              <div className="rounded-xl border border-accent/20 bg-accent/5 px-4 py-3">
                <p className="text-xs font-medium text-accent">This week</p>
                <p className="mt-1 text-sm text-foreground break-words">{trendSummary}</p>
              </div>
            </div>
          </Card>

          {loading ? (
            <>
              <div className="h-28 rounded-xl bg-muted animate-pulse" />
              <div className="h-28 rounded-xl bg-muted animate-pulse" />
            </>
          ) : teens.length === 0 ? (
            <Card className="p-8 border-border text-center">
              <div className="space-y-3">
                <h3 className="font-semibold text-foreground">This week is just getting started</h3>
                <p className="text-sm text-muted-foreground">
                  Once your teen is linked from home, you’ll see effort trends and supportive prompts here.
                </p>
                <Button variant="outline" onClick={() => navigate("/")}>
                  Back to parent home
                </Button>
              </div>
            </Card>
          ) : (
            <section className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Connected teens</p>
                  <h3 className="mt-1 text-lg font-semibold text-foreground">Current effort view</h3>
                </div>
                <Button variant="outline" size="sm" onClick={() => navigate("/dashboard")}>
                  Weekly snapshot
                </Button>
              </div>

              <div className="space-y-3">
                {teens.map((teen) => {
                  const total = teen.goals.length;
                  const completed = teen.goals.filter((goal) => goal.completed).length;
                  const activeGoals = teen.goals.filter((goal) => !goal.completed).slice(0, 3);

                  return (
                    <Card key={teen.id} className="p-5 border-border">
                      <div className="flex items-start gap-3">
                        {teen.avatarUrl ? (
                          <img
                            src={teen.avatarUrl}
                            alt={teen.displayName}
                            className="w-12 h-12 rounded-full object-cover border border-border"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center text-sm text-muted-foreground">
                            {(teen.displayName || "—").charAt(0)}
                          </div>
                        )}
                        <div className="flex-1 min-w-0 space-y-3">
                          <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                            <div className="min-w-0">
                              <p className="font-semibold text-foreground break-words">{teen.displayName}</p>
                              <p className="text-xs text-muted-foreground capitalize break-words">
                                {teen.archetype ? `${teen.archetype} archetype` : "Supportive summary only"}
                              </p>
                            </div>
                            <div className="text-left sm:text-right">
                              <p className="text-sm font-medium text-foreground">{completed}/{total}</p>
                              <p className="text-xs text-muted-foreground">goals completed</p>
                            </div>
                          </div>

                          {activeGoals.length > 0 ? (
                            <div className="space-y-2">
                              {activeGoals.map((goal) => (
                                <div key={goal.id} className="flex items-center gap-2">
                                  <div className="w-1.5 h-1.5 rounded-full bg-accent flex-shrink-0" />
                                  <p className="text-sm text-foreground truncate">{goal.title}</p>
                                  {goal.progress > 0 && (
                                    <span className="ml-auto text-xs text-muted-foreground flex-shrink-0">
                                      {goal.progress}%
                                    </span>
                                  )}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-sm text-muted-foreground">
                              No active goals are visible yet. This space will fill in as the week gets going.
                            </p>
                          )}
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </section>
          )}
        </main>
      </div>

      <ParentDisclaimerModal open={showDisclaimer} onClose={() => setShowDisclaimer(false)} />
    </>
  );
};

export default ParentPortalPage;
