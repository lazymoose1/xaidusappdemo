import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, MessageSquare, Users, ArrowRight, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { notificationsApi } from "@/api/endpoints";
import type { NotificationItem } from "@/types/api";
import BrandWordmark from "@/components/BrandWordmark";

const ALERT_REFRESH_MS = 10_000;

function timeAgo(ts: string) {
  const diff = Date.now() - new Date(ts).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

const TYPE_CONFIG: Record<NotificationItem["type"], { icon: React.ReactNode; accent: string }> = {
  nudge: {
    icon: <Bell className="w-4 h-4 text-foreground" />,
    accent: "border-white/12 bg-white/[0.04]",
  },
  thread_message: {
    icon: <MessageSquare className="w-4 h-4 text-foreground" />,
    accent: "border-white/12 bg-white/[0.04]",
  },
  forum_reply: {
    icon: <Users className="w-4 h-4 text-foreground" />,
    accent: "border-white/12 bg-white/[0.04]",
  },
};

const NotificationsPage = () => {
  const navigate = useNavigate();
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await notificationsApi.getAll();
      setItems(data.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load notifications");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();

    const handleVisibilityOrFocus = () => {
      if (document.visibilityState === "visible") {
        load();
      }
    };

    const interval = setInterval(load, ALERT_REFRESH_MS);
    window.addEventListener("focus", handleVisibilityOrFocus);
    document.addEventListener("visibilitychange", handleVisibilityOrFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", handleVisibilityOrFocus);
      document.removeEventListener("visibilitychange", handleVisibilityOrFocus);
    };
  }, []);

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="app-shell-header h-[15vh] min-h-[72px] fixed top-0 left-0 right-0 z-40 flex items-center px-4 justify-center">
        <BrandWordmark compact />
      </header>

      <main className="pt-[15vh] px-4 mt-5">
        <div className="flex items-center justify-between gap-3 mb-5">
          <h2 className="display-title text-3xl sm:text-4xl text-foreground break-words">Alerts</h2>
          <button
            onClick={load}
            className="text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {loading && (
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-16 rounded-xl bg-muted/40 animate-pulse" />
            ))}
          </div>
        )}

        {error && (
          <div className="text-center py-16 space-y-3 text-muted-foreground">
            <p>{error}</p>
            <Button variant="outline" size="sm" onClick={load}>Retry</Button>
          </div>
        )}

        {!loading && !error && items.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
            <Bell className="w-10 h-10 text-muted-foreground/40" />
            <p className="text-muted-foreground">You're all caught up.</p>
          </div>
        )}

        {!loading && items.length > 0 && (
          <div className="space-y-2">
            {items.map((item) => {
              const config = TYPE_CONFIG[item.type];
              return (
                <button
                  key={item.id}
                  onClick={() => navigate(item.linkTo)}
                  className={`w-full text-left rounded-xl border px-4 py-3 flex items-start gap-3 transition-colors hover:brightness-95 ${config.accent}`}
                >
                  <div className="mt-0.5 flex-shrink-0 w-5 h-5 flex items-center justify-center">
                    {config.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground leading-snug break-words">{item.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 break-words">{item.body}</p>
                    <p className="text-[10px] text-muted-foreground/70 mt-1">{timeAgo(item.createdAt)}</p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-1" />
                </button>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
};

export default NotificationsPage;
