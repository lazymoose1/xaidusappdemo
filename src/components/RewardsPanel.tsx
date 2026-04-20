import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { apiFetch } from "@/api/client";
import { achievementsApi } from "@/api/endpoints";
import type { ApiAchievementsResponse } from "@/types/api";

interface RewardEntry {
  id: string;
  title: string;
  earnedAt: string;
  source: string;
}

interface RewardsData {
  marks: RewardEntry[];
  moments: RewardEntry[];
  totalMarks: number;
  totalMoments: number;
  moova: boolean;
  moovaEarnedAt: string | null;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

const RewardsPanel = () => {
  const [data, setData] = useState<RewardsData | null>(null);
  const [achievements, setAchievements] = useState<ApiAchievementsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    Promise.all([
      apiFetch<RewardsData>("/api/rewards"),
      achievementsApi.get().catch(() => null),
    ])
      .then(([rewards, achievementData]) => {
        if (cancelled) return;
        setData(rewards);
        setAchievements(achievementData);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return <div className="h-20 w-full rounded-xl bg-muted animate-pulse" />;
  }

  if (error || !data) return null;

  const recentMarks = data.marks.slice(0, 5);
  const recentMoments = data.moments.slice(0, 3);
  const earnedBadges = achievements?.badges.filter((badge) => badge.earned) ?? [];
  const featuredBadges = earnedBadges.slice(0, 3);

  return (
    <div className="w-full space-y-3">
      {achievements && (
        <Card className="border-border/80 bg-white/[0.025] shadow-soft">
          <CardContent className="pt-4 pb-4 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="eyebrow">
                  Momentum
                </p>
                <p className="text-base sm:text-lg font-semibold text-foreground mt-1 break-words">
                  {achievements.streak.current}-day streak
                </p>
                <p className="text-xs text-muted-foreground mt-1 break-words">
                  Longest streak: {achievements.streak.longest} days
                </p>
              </div>
              <div className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-xs font-semibold text-foreground shrink-0">
                {earnedBadges.length} badge{earnedBadges.length !== 1 ? "s" : ""}
              </div>
            </div>

            {featuredBadges.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {featuredBadges.map((badge) => (
                  <span
                    key={badge.id}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/[0.05] border border-white/10 text-xs text-foreground break-words"
                  >
                    🏅 {badge.title}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground break-words">
                Your streak and first badges will start showing up here as you check in.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {data.moova && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-white/[0.035] border border-white/10">
          <span className="text-base" aria-hidden>⚡</span>
          <p className="text-sm font-medium text-foreground break-words">You've built real momentum.</p>
        </div>
      )}

      <Card className="border-border/80 bg-white/[0.02] shadow-soft">
        <CardContent className="pt-4 pb-4 space-y-2">
          <div className="flex items-center justify-between gap-3">
            <p className="eyebrow">
              Check-in wins
            </p>
            <span className="text-xs text-muted-foreground shrink-0">{data.totalMarks} total</span>
          </div>
          {recentMarks.length === 0 ? (
            <p className="text-xs text-muted-foreground">No check-in wins yet — today is a good place to start.</p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {recentMarks.map((m) => (
                <span
                  key={m.id}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-accent/10 border border-accent/20 text-xs text-foreground break-words"
                >
                  {m.title}
                  <span className="text-muted-foreground">{formatDate(m.earnedAt)}</span>
                </span>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {data.totalMoments > 0 && (
        <Card className="border-border/80 bg-white/[0.02] shadow-soft">
          <CardContent className="pt-4 pb-4 space-y-2">
            <div className="flex items-center justify-between gap-3">
              <p className="eyebrow">
                Progress moments
              </p>
              <span className="text-xs text-muted-foreground shrink-0">{data.totalMoments} total</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {recentMoments.map((m) => (
                <span
                  key={m.id}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-white/[0.05] border border-white/10 text-xs font-medium text-foreground break-words"
                >
                  {m.title}
                  <span className="text-muted-foreground">{formatDate(m.earnedAt)}</span>
                </span>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default RewardsPanel;
