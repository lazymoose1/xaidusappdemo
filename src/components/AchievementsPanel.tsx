import { useEffect, useState } from "react";
import { Trophy, Flame } from "lucide-react";
import { achievementsApi } from "@/api/endpoints";
import type { ApiAchievementBadge, ApiAchievementsResponse } from "@/types/api";

const tierColors: Record<ApiAchievementBadge['tier'], string> = {
  bronze: 'bg-amber-100 text-amber-900 border-amber-200',
  silver: 'bg-slate-100 text-slate-900 border-slate-200',
  gold: 'bg-yellow-100 text-yellow-900 border-yellow-200',
  platinum: 'bg-indigo-100 text-indigo-900 border-indigo-200'
};

export function AchievementsPanel() {
  const [data, setData] = useState<ApiAchievementsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const resp = await achievementsApi.get();
        if (!cancelled) setData(resp);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Could not load achievements');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return (
      <div className="w-full max-w-2xl px-4">
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm animate-pulse h-40" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="w-full max-w-2xl px-4">
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm text-sm text-muted-foreground">
          {error || 'Achievements unavailable right now.'}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl px-4">
      <div className="rounded-xl border border-border bg-card p-4 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Flame className="w-5 h-5 text-accent" />
            <div>
              <p className="text-sm text-muted-foreground">Current streak</p>
              <p className="text-xl font-semibold text-foreground">{data.streak.current} days</p>
              <p className="text-xs text-muted-foreground">Longest: {data.streak.longest} days</p>
            </div>
          </div>
          <div className="text-right text-xs text-muted-foreground">Updated {new Date(data.streak.lastUpdated).toLocaleDateString()}</div>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-semibold text-foreground flex items-center gap-2"><Trophy className="w-4 h-4 text-accent" /> Badges</p>
          <div className="flex flex-wrap gap-2">
            {data.badges.map((b) => (
              <div
                key={b.id}
                className={`px-3 py-2 rounded-full text-xs font-semibold border ${tierColors[b.tier]} ${b.earned ? '' : 'opacity-70'}`}
              >
                {b.earned ? '🏅' : '🔒'} {b.title}
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <p className="text-sm font-semibold text-foreground">Achievements in progress</p>
          {data.achievements.map((a) => (
            <div key={a.id} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-foreground">{a.title}</span>
                <span className="text-xs text-muted-foreground">{a.target}</span>
              </div>
              <p className="text-xs text-muted-foreground">{a.description}</p>
              <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-accent" style={{ width: `${Math.min(100, Math.max(0, a.progress))}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default AchievementsPanel;
