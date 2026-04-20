import { useEffect, useState } from "react";
import { scoutApi, rewardsApi } from "@/api/endpoints";
import type { ScoutTodayData, ApiRewardsData } from "@/types/api";
import { ScoutCheckinCard } from "./ScoutCheckinCard";
import { NudgeBanner } from "./NudgeBanner";
import { ScoutCredentialCard } from "./ScoutCredentialCard";
import { useAuth } from "@/providers/AuthProvider";

const STREAK_EMOJI = (n: number) => {
  if (n >= 30) return "🔥🔥🔥";
  if (n >= 14) return "🔥🔥";
  if (n >= 7) return "🔥";
  return "✨";
};

export const ScoutTodayView = () => {
  const { signOut } = useAuth();
  const [data, setData] = useState<ScoutTodayData | null>(null);
  const [rewards, setRewards] = useState<ApiRewardsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [nudges, setNudges] = useState<ScoutTodayData["nudges"]>([]);
  const [credentials, setCredentials] = useState<ScoutTodayData["credentials"]>([]);

  const fetchToday = async () => {
    try {
      const [d, r] = await Promise.all([scoutApi.getToday(), rewardsApi.get().catch(() => null)]);
      if (import.meta.env.DEV) {
        console.debug('[NUDGE DIAG] ScoutTodayView fetchToday', {
          nudgeCount: d.nudges.length,
          nudgeIds: d.nudges.map((nudge) => nudge.id),
          credentialCount: d.credentials.length,
        });
      }
      setData(d);
      setNudges(d.nudges);
      setCredentials(d.credentials);
      if (r) setRewards(r);
    } catch (err) {
      if (import.meta.env.DEV) {
        console.debug('[NUDGE DIAG] ScoutTodayView fetchToday error', {
          error: err instanceof Error ? err.message : String(err),
        });
      }
      // silently fail — show stale data
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchToday();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3 text-muted-foreground">
        <div className="w-6 h-6 rounded-full border-2 border-accent border-t-transparent animate-spin" />
        <p className="text-sm">Loading your day…</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 p-6 text-center">
        <p className="text-muted-foreground text-sm">Couldn't load your check-in. Tap to retry.</p>
        <button onClick={fetchToday} className="text-primary text-sm underline">Retry</button>
      </div>
    );
  }

  const weeklyPct = data.weeklyProgress.planned > 0
    ? Math.round((data.weeklyProgress.completed / data.weeklyProgress.planned) * 100)
    : 0;

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="bg-primary border-b border-border py-3 px-4 flex items-center justify-between">
        <h1 className="display-title text-xl text-foreground">xaidus</h1>
        <button
          onClick={signOut}
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          Sign out
        </button>
      </header>

      <div className="max-w-lg mx-auto px-4 pt-6 space-y-5">

        {/* Streak + weekly stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-border bg-card p-4 text-center space-y-1">
            <p className="text-3xl font-bold text-foreground">
              {STREAK_EMOJI(data.dailyCheckInStreak)}{data.dailyCheckInStreak}
            </p>
            <p className="text-xs text-muted-foreground">day streak</p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-4 text-center space-y-1">
            <p className="text-3xl font-bold text-foreground">{data.daysCheckedInThisWeek}/7</p>
            <p className="text-xs text-muted-foreground">days this week</p>
          </div>
        </div>

        {/* Weekly progress bar */}
        {data.weeklyProgress.planned > 0 && (
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Weekly goal</span>
              <span>{data.weeklyProgress.completed}/{data.weeklyProgress.planned} days done</span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-accent rounded-full transition-all"
                style={{ width: `${weeklyPct}%` }}
              />
            </div>
          </div>
        )}

        {/* Moova progress indicator */}
        {rewards && !rewards.moova && (
          <div className="rounded-2xl border border-border bg-card px-4 py-3 space-y-1.5">
            <div className="flex justify-between items-center">
              <p className="text-xs font-medium text-foreground">Building toward Moova 🏆</p>
              <p className="text-xs text-muted-foreground">{rewards.totalMarks} mark{rewards.totalMarks !== 1 ? "s" : ""}</p>
            </div>
            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-accent rounded-full transition-all"
                style={{ width: `${Math.min(100, Math.round((rewards.totalMarks / 21) * 100))}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              {Math.max(0, 21 - rewards.totalMarks)} more mark{Math.max(0, 21 - rewards.totalMarks) !== 1 ? "s" : ""} to unlock Moova
            </p>
          </div>
        )}
        {rewards?.moova && (
          <div className="rounded-2xl border border-accent/40 bg-accent/5 px-4 py-3 flex items-center gap-3">
            <span className="text-2xl">🏆</span>
            <div>
              <p className="text-sm font-semibold text-foreground">You earned Moova.</p>
              <p className="text-xs text-muted-foreground">You showed up consistently. That's real.</p>
            </div>
          </div>
        )}

        {/* Rewards strip */}
        {rewards && rewards.marks.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Your marks</p>
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
              {rewards.marks.slice(0, 12).map((mark) => (
                <div
                  key={mark.id}
                  title={mark.title}
                  className="flex-shrink-0 rounded-xl border border-border bg-card px-3 py-2 text-center min-w-[64px]"
                >
                  <p className="text-lg">🫸🏾</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5 leading-tight line-clamp-1">{mark.title}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Unread nudges */}
        {nudges.length > 0 && (
          <div className="space-y-3">
            {nudges.map((nudge) => (
              <NudgeBanner
                key={nudge.id}
                nudge={nudge}
                onDismiss={() => setNudges((prev) => prev.filter((n) => n.id !== nudge.id))}
              />
            ))}
          </div>
        )}

        {/* Unacknowledged credentials */}
        {credentials.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-foreground">New badges earned</h2>
            {credentials.map((cred) => (
              <ScoutCredentialCard
                key={cred.id}
                credential={cred}
                onAcknowledged={() =>
                  setCredentials((prev) => prev.filter((c) => c.id !== cred.id))
                }
              />
            ))}
          </div>
        )}

        {/* Check-in cards for today's goals */}
        {data.goals.length > 0 ? (
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-foreground">Check in</h2>
            {data.goals.map((goal) => (
              <ScoutCheckinCard key={goal.id} goal={goal} onCheckin={fetchToday} />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-border p-6 text-center space-y-2">
            <p className="text-muted-foreground text-sm">No goals scheduled for today.</p>
            <p className="text-xs text-muted-foreground">Your leader may set up a new week during your next meeting.</p>
          </div>
        )}

        {/* Privacy note */}
        <p className="text-xs text-muted-foreground text-center pb-4">
          Your reflections are private — only you can see them.
        </p>
      </div>
    </div>
  );
};
