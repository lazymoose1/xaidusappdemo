import { useEffect, useMemo, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import PageHeader from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { parentPortalApi } from "@/api/endpoints";
import type { ApiParentChild, ApiWeeklySummary } from "@/types/api";

const fallbackSnapshot: ApiWeeklySummary = {
  goalsSet: 0,
  goalsCompleted: 0,
  trend: [0, 0, 0, 0, 0, 0, 0],
  cadence: "Sundays at 7:00pm",
  conversationStarters: [
    "Ask what helped this week feel smoother.",
    "Which small win are you proud of?",
    "What's one thing we could do to make next week easier?",
  ],
  coachStyle: "calm",
};

const ParentDashboard = () => {
  const navigate = useNavigate();
  const [weeklySnapshot, setWeeklySnapshot] = useState<ApiWeeklySummary>(fallbackSnapshot);
  const [teens, setTeens] = useState<ApiParentChild[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadWeeklySnapshot = async () => {
      setLoading(true);
      const [snapshotResult, childrenResult] = await Promise.allSettled([
        parentPortalApi.getWeeklySummary(),
        parentPortalApi.getChildren(),
      ]);

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

      if (childrenResult.status === "fulfilled") {
        setTeens(Array.isArray(childrenResult.value) ? childrenResult.value : []);
      } else {
        setTeens([]);
      }

      setLoading(false);
    };

    void loadWeeklySnapshot();
  }, []);

  const totalGoals = teens.reduce((sum, teen) => sum + teen.goals.length, 0);
  const completedGoals = teens.reduce((sum, teen) => sum + teen.goals.filter((goal) => goal.completed).length, 0);
  const snapshotGoalTarget = weeklySnapshot.goalsSet || totalGoals;
  const snapshotGoalCompleted = weeklySnapshot.goalsCompleted || completedGoals;
  const completionRate = snapshotGoalTarget > 0 ? snapshotGoalCompleted / snapshotGoalTarget : 0;

  const momentumLabel = useMemo(() => {
    if (teens.length === 0) return "Waiting to begin";
    if (snapshotGoalTarget === 0) return "Week is starting";
    if (completionRate >= 0.75) return "Steady";
    if (completionRate >= 0.4) return "Building";
    return "Needs a reset";
  }, [completionRate, snapshotGoalTarget, teens.length]);

  const trendSummary = useMemo(() => {
    const trend = weeklySnapshot.trend || [];
    if (teens.length === 0) {
      return "Link a teen from home first. Weekly follow-through and conversation prompts will appear here after that.";
    }
    if (snapshotGoalTarget === 0) {
      return "This week is just getting started, so there isn't much to read into yet.";
    }
    const midpoint = Math.max(1, Math.floor(trend.length / 2));
    const earlyAverage = trend.slice(0, midpoint).reduce((sum, value) => sum + value, 0) / midpoint;
    const lateSlice = trend.slice(midpoint);
    const lateAverage = lateSlice.reduce((sum, value) => sum + value, 0) / lateSlice.length;

    if (lateAverage > earlyAverage) return "Check-ins are more consistent than they were earlier in the week.";
    if (lateAverage < earlyAverage) return "Momentum dipped after midweek, so a light reset may help.";
    return "The week has been fairly even so far.";
  }, [snapshotGoalTarget, teens.length, weeklySnapshot.trend]);

  const supportAction = useMemo(() => {
    if (teens.length === 0) {
      return "Help starts with connection. Link your teen first so next week's snapshot feels useful instead of empty.";
    }
    if (snapshotGoalTarget === 0) {
      return "Try a supportive check-in like: “What would make this week feel manageable?”";
    }
    if (completionRate >= 0.75) {
      return "Celebrate the consistency and ask what helped it happen.";
    }
    if (completionRate >= 0.4) {
      return "Ask which part of the week felt easiest to start, then build from there.";
    }
    return "Help reset tomorrow by asking for one small next step instead of a full plan.";
  }, [completionRate, snapshotGoalTarget, teens.length]);

  return (
    <div className="min-h-screen pb-24 bg-background">
      <PageHeader
        title="Weekly Snapshot"
        leftAction={<ArrowLeft size={24} onClick={() => navigate("/")} />}
      />

      <main className="pt-[calc(15vh+1rem)] px-4 pb-24 max-w-3xl mx-auto space-y-5">
        <Card className="border-border shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <span className="text-lg font-semibold break-words">How your teen is doing this week</span>
              <span className="text-xs font-normal text-muted-foreground break-words">{weeklySnapshot.cadence}</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-border bg-muted/30 px-4 py-3">
                <p className="text-xs font-medium text-muted-foreground">Weekly momentum</p>
                <p className="mt-1 text-2xl font-semibold text-foreground">{momentumLabel}</p>
              </div>
              <div className="rounded-xl border border-border bg-muted/30 px-4 py-3">
                <p className="text-xs font-medium text-muted-foreground">Goals followed through</p>
                <p className="mt-1 text-2xl font-semibold text-foreground">
                  {snapshotGoalCompleted}/{snapshotGoalTarget || 0}
                </p>
              </div>
              <div className="rounded-xl border border-border bg-muted/30 px-4 py-3">
                <p className="text-xs font-medium text-muted-foreground">Linked teens</p>
                <p className="mt-1 text-2xl font-semibold text-foreground">{teens.length}</p>
              </div>
            </div>

            <div className="rounded-xl border border-accent/20 bg-accent/5 px-4 py-3">
              <p className="text-xs font-medium text-accent">Trend</p>
              <p className="mt-1 text-sm text-foreground break-words">{trendSummary}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-semibold">Conversation starters</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {(weeklySnapshot.conversationStarters || fallbackSnapshot.conversationStarters)
              .slice(0, 3)
              .map((starter, index) => (
                <div key={index} className="rounded-xl border border-border bg-muted/20 px-4 py-3">
                  <p className="text-sm text-foreground break-words">{starter}</p>
                </div>
              ))}
            <p className="text-xs text-muted-foreground">
              These prompts are meant to open a calm conversation, not to interrogate or inspect private details.
            </p>
          </CardContent>
        </Card>

        <Card className="border-border shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-semibold">How to help</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-xl border border-border bg-background px-4 py-3">
              <p className="text-sm text-foreground break-words">{supportAction}</p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button className="w-full sm:flex-1" onClick={() => navigate("/parent-portal")}>
                View linked teens
              </Button>
              <Button variant="outline" className="w-full sm:w-auto" onClick={() => navigate("/settings/parent")}>
                Settings
              </Button>
            </div>
          </CardContent>
        </Card>

        {loading && (
          <p className="text-sm text-muted-foreground text-center">Refreshing this week's snapshot…</p>
        )}
      </main>
    </div>
  );
};

export default ParentDashboard;
