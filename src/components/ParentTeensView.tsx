import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Loader2, Plus, Settings, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { parentPortalApi } from "@/api/endpoints";
import type { ApiParentChild, ApiWeeklySummary } from "@/types/api";

const fallbackSnapshot: ApiWeeklySummary = {
  goalsSet: 0,
  goalsCompleted: 0,
  trend: [0, 0, 0, 0, 0, 0, 0],
  cadence: "Sundays at 7:00pm",
  conversationStarters: [
    "Ask what felt easier this week.",
    "Notice one small win together.",
    "Ask what tomorrow's focus might be.",
  ],
  coachStyle: "calm",
};

const ParentTeensView = () => {
  const navigate = useNavigate();
  const [teens, setTeens] = useState<ApiParentChild[]>([]);
  const [weeklySnapshot, setWeeklySnapshot] = useState<ApiWeeklySummary>(fallbackSnapshot);
  const [loading, setLoading] = useState(true);
  const [troopCode, setTroopCode] = useState("");
  const [nickname, setNickname] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);

  useEffect(() => {
    const loadParentHome = async () => {
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

    void loadParentHome();
  }, []);

  const handleAddTeen = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nickname.trim()) return;
    setSubmitting(true);
    try {
      const updated = await parentPortalApi.addChild(nickname.trim(), troopCode.trim() || undefined);
      setTeens(updated);
      setTroopCode("");
      setNickname("");
      setShowAddForm(false);
      toast({ title: "Teen linked", description: "Their weekly snapshot will show up here." });
    } catch (err) {
      toast({
        title: "Couldn't find teen",
        description: err instanceof Error ? err.message : "Check the troop code and nickname and try again.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const totalGoals = teens.reduce((sum, teen) => sum + teen.goals.length, 0);
  const completedGoals = teens.reduce((sum, teen) => sum + teen.goals.filter((goal) => goal.completed).length, 0);
  const activeGoals = teens.reduce((sum, teen) => sum + teen.goals.filter((goal) => !goal.completed && goal.progress > 0).length, 0);
  const snapshotGoalTarget = weeklySnapshot.goalsSet || totalGoals;
  const snapshotGoalCompleted = weeklySnapshot.goalsCompleted || completedGoals;
  const completionRate = snapshotGoalTarget > 0 ? snapshotGoalCompleted / snapshotGoalTarget : 0;

  const trendSummary = useMemo(() => {
    const trend = weeklySnapshot.trend || [];
    if (teens.length === 0) {
      return "Link your teen to see calm weekly updates and supportive prompts here.";
    }
    if (snapshotGoalTarget === 0) {
      return "This week is just getting started. You'll see effort trends once goals and check-ins begin.";
    }
    if (trend.length < 2) {
      return "Effort is starting to take shape this week.";
    }

    const midpoint = Math.max(1, Math.floor(trend.length / 2));
    const earlyAverage = trend.slice(0, midpoint).reduce((sum, value) => sum + value, 0) / midpoint;
    const lateSlice = trend.slice(midpoint);
    const lateAverage = lateSlice.reduce((sum, value) => sum + value, 0) / lateSlice.length;

    if (lateAverage > earlyAverage) {
      return "Check-ins are looking steadier than they did earlier in the week.";
    }
    if (lateAverage < earlyAverage) {
      return "Momentum dipped a bit after midweek. A gentle reset could help.";
    }
    return "The week looks steady so far, with a similar rhythm across days.";
  }, [snapshotGoalTarget, teens.length, weeklySnapshot.trend]);

  const supportAction = useMemo(() => {
    if (teens.length === 0) {
      return "Link your teen first so future snapshots stay simple and useful.";
    }
    if (snapshotGoalTarget === 0) {
      return "Supportive action: ask what they want this week to feel like before offering solutions.";
    }
    if (completionRate >= 0.75) {
      return "Supportive action: celebrate the consistency and ask what made it easier this week.";
    }
    if (completionRate >= 0.4) {
      return "Supportive action: ask which moment helped progress start moving.";
    }
    return "Supportive action: help them reset with one small next step for tomorrow.";
  }, [completionRate, snapshotGoalTarget, teens.length]);

  const primaryConversationStarter =
    weeklySnapshot.conversationStarters?.[0] || "Ask what felt a little easier this week.";

  if (loading) {
    return (
      <div className="w-full max-w-2xl space-y-4 pt-4">
        <div className="h-36 rounded-2xl bg-muted animate-pulse" />
        <div className="h-16 rounded-xl bg-muted animate-pulse" />
        <div className="h-28 rounded-xl bg-muted animate-pulse" />
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl space-y-5">
      <Card className="border-border/80 bg-card shadow-medium">
        <CardContent className="pt-5 pb-5 space-y-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <p className="eyebrow">Weekly snapshot</p>
              <h2 className="display-title mt-2 text-[1.95rem] sm:text-[2.35rem] text-foreground break-words">
                {teens.length === 0 ? "A calm place to support progress" : "How this week is feeling"}
              </h2>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed break-words max-w-xl">{trendSummary}</p>
            </div>
            <Button
              size="sm"
              variant="ghost"
              className="gap-1.5 shrink-0"
              onClick={() => navigate("/settings/parent")}
            >
              <Settings className="w-4 h-4" />
              Settings
            </Button>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-[1.2rem] border border-white/10 bg-white/[0.03] px-4 py-3">
              <p className="text-xs font-medium text-muted-foreground">Goals followed through</p>
              <p className="mt-1 text-2xl font-semibold text-foreground">
                {snapshotGoalCompleted}/{snapshotGoalTarget || 0}
              </p>
            </div>
            <div className="rounded-[1.2rem] border border-white/10 bg-white/[0.03] px-4 py-3">
              <p className="text-xs font-medium text-muted-foreground">Linked teens</p>
              <p className="mt-1 text-2xl font-semibold text-foreground">{teens.length}</p>
            </div>
            <div className="rounded-[1.2rem] border border-white/10 bg-white/[0.03] px-4 py-3">
              <p className="text-xs font-medium text-muted-foreground">Right now</p>
              <p className="mt-1 text-2xl font-semibold text-foreground">{activeGoals}</p>
              <p className="text-xs text-muted-foreground">active goals</p>
            </div>
          </div>

          <div className="rounded-[1.2rem] border border-white/10 bg-white/[0.04] px-4 py-3">
            <p className="eyebrow">Conversation starter</p>
            <p className="mt-1 text-sm text-foreground break-words">{primaryConversationStarter}</p>
          </div>

          <div className="rounded-[1.2rem] border border-white/10 bg-black/20 px-4 py-3">
            <p className="text-sm text-foreground break-words">{supportAction}</p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <Button className="w-full sm:flex-1" onClick={() => navigate("/dashboard")}>
              Open weekly snapshot
            </Button>
            <Button
              variant="outline"
              className="w-full sm:w-auto"
              onClick={() => setShowAddForm((value) => !value)}
            >
              {teens.length === 0 ? "Link your teen" : "Link another teen"}
            </Button>
          </div>

          <p className="text-xs text-muted-foreground leading-relaxed">
            This view stays focused on effort trends, consistency, and prompts that help you support without overreaching.
          </p>
        </CardContent>
      </Card>

      {showAddForm && (
        <Card className="border-border/80 bg-white/[0.02] shadow-soft">
          <CardContent className="pt-4 pb-4">
            <form onSubmit={handleAddTeen} className="space-y-3">
              <div className="flex flex-col gap-2 sm:flex-row">
                <Input
                  placeholder="Nickname"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  disabled={submitting}
                  className="flex-1"
                  autoFocus
                />
                <Button type="submit" disabled={submitting || !nickname.trim()} className="sm:w-auto">
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Link teen"}
                </Button>
              </div>
              <Input
                placeholder="Troop code (optional)"
                value={troopCode}
                onChange={(e) => setTroopCode(e.target.value.toUpperCase())}
                disabled={submitting}
                className="font-mono uppercase text-sm"
              />
              <p className="text-xs text-muted-foreground">
                Enter the nickname they use to sign in. Add a troop code only if the nickname needs help matching.
              </p>
            </form>
          </CardContent>
        </Card>
      )}

      <Card className="border-border/70 bg-white/[0.015] shadow-soft">
        <CardContent className="pt-4 pb-4 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="eyebrow">Linked teens</p>
              <h3 className="mt-2 text-lg font-semibold text-foreground">Respectful visibility</h3>
            </div>
            {teens.length > 0 && (
              <button
                onClick={() => navigate("/parent-portal")}
                className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 hover:underline shrink-0"
              >
                Deeper view <ArrowRight className="w-3 h-3" />
              </button>
            )}
          </div>

          {teens.length === 0 ? (
            <div className="flex flex-col items-center gap-4 py-6 text-center">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                <UserRound className="w-8 h-8 text-muted-foreground" />
              </div>
              <div className="space-y-1">
                <p className="text-foreground font-medium">This week is just getting started</p>
                <p className="text-sm text-muted-foreground">
                  Once your teen is linked, you’ll see effort trends and supportive prompts here.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {teens.map((teen) => {
                const total = teen.goals.length;
                const completed = teen.goals.filter((goal) => goal.completed).length;
                const active = teen.goals.filter((goal) => !goal.completed).slice(0, 2);

                return (
                  <div key={teen.id} className="rounded-[1.15rem] border border-white/10 bg-white/[0.03] px-4 py-3">
                    <div className="flex items-center gap-3">
                      {teen.avatarUrl ? (
                        <img
                          src={teen.avatarUrl}
                          alt={teen.displayName}
                          className="w-10 h-10 rounded-full object-cover border border-border"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-black/20 flex items-center justify-center flex-shrink-0">
                          <UserRound className="w-5 h-5 text-muted-foreground" />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-foreground truncate">{teen.displayName}</p>
                        <p className="text-xs text-muted-foreground">
                          {total === 0
                            ? "No goals yet"
                            : `${completed} of ${total} goals completed so far`}
                        </p>
                      </div>
                    </div>

                    {active.length > 0 && (
                      <div className="mt-3 space-y-1.5">
                        {active.map((goal) => (
                          <div key={goal.id} className="flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-white/70 flex-shrink-0" />
                            <p className="text-sm text-foreground truncate">{goal.title}</p>
                            {goal.progress > 0 && (
                              <span className="ml-auto text-xs text-muted-foreground flex-shrink-0">
                                {goal.progress}%
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ParentTeensView;
