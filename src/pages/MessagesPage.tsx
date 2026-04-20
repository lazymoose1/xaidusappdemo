import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Edit, Search, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import ChannelsModal from "@/components/ChannelsModal";
import { threadsApi } from "@/api/endpoints";
import type { ApiThread } from "@/types/api";
import { ChatListSkeleton } from "@/components/PageSkeleton";

function formatRelative(ts?: string | Date | null) {
  if (!ts) return "";
  const date = typeof ts === "string" ? new Date(ts) : ts;
  const diff = Date.now() - date.getTime();
  const minutes = Math.floor(diff / (60 * 1000));
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

const MessagesPage = () => {
  const navigate = useNavigate();
  const [showChannels, setShowChannels] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [threads, setThreads] = useState<ApiThread[]>([]);
  const [error, setError] = useState<string | null>(null);
  const searchRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const data = await threadsApi.getAll();
        if (cancelled) return;
        setThreads(data.threads || []);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Failed to load messages");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  const filteredChats = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return threads;
    return threads.filter((t) => {
      const title = (t.title || "").toLowerCase();
      const last = (t.lastMessage?.text || "").toLowerCase();
      return title.includes(q) || last.includes(q);
    });
  }, [threads, searchQuery]);

  return (
    <>
      <div className="min-h-screen pb-20 bg-background">
        {/* Header */}
        <header className="bg-primary border-b border-border h-[15vh] fixed top-0 left-0 right-0 z-40">
          <div className="flex items-center justify-between h-full px-4">
            <button
              aria-label="Go back"
              onClick={() => navigate(-1)}
              className="text-accent"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
            <h1 className="display-title text-2xl text-foreground">xaidus</h1>
            {/* Edit/compose icon — opens new chat */}
            <button
              className="text-accent"
              aria-label="New chat"
              onClick={() => setShowChannels(true)}
            >
              <Edit className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* Main content */}
        <main className="pt-[15vh] px-4 mt-5">
          {/* Title row */}
          <div className="flex items-center mb-4">
            <h2 className="font-serif text-3xl text-foreground">Chats</h2>
          </div>

          {/* Search */}
          <div className="flex items-center gap-2 h-10 rounded-lg bg-muted px-3 mb-5 focus-within:ring-1 focus-within:ring-accent focus-within:bg-background transition-colors">
            <Search className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            <input
              ref={searchRef}
              placeholder="Search chats…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground text-foreground"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="text-muted-foreground hover:text-foreground flex-shrink-0"
                aria-label="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Chat list */}
          {loading ? (
            <ChatListSkeleton />
          ) : error ? (
            <div className="text-center py-16 text-muted-foreground">
              <p className="mb-4">{error}</p>
              <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
                Retry
              </Button>
            </div>
          ) : filteredChats.length > 0 ? (
            <div className="divide-y divide-border/50">
              {filteredChats.map((chat) => {
                const initials = (chat.title || "Ch").slice(0, 2).toUpperCase();
                return (
                  <div
                    key={chat.id}
                    className="flex items-center gap-3 py-3 cursor-pointer hover:bg-muted/40 -mx-4 px-4 transition-colors"
                    onClick={() => navigate(`/messages/${chat.id}`)}
                  >
                    <div className="w-11 h-11 rounded-full bg-accent/20 flex-shrink-0 flex items-center justify-center">
                      <span className="text-sm font-semibold text-accent">{initials}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-foreground truncate">{chat.title || "Chat"}</p>
                      <p className="text-xs text-muted-foreground truncate mt-0.5">
                        {chat.lastMessage?.text || "No messages yet"}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                      <span className="text-[11px] text-muted-foreground">{formatRelative(chat.lastMessageAt)}</span>
                      {chat.unreadCount ? (
                        <span className="text-[10px] min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-accent text-accent-foreground px-1">
                          {chat.unreadCount}
                        </span>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-20 space-y-4">
              <p className="text-muted-foreground">
                {searchQuery ? "No chats match your search" : "No messages yet"}
              </p>
              {!searchQuery && (
                <Button size="sm" onClick={() => setShowChannels(true)}>
                  Start a conversation
                </Button>
              )}
            </div>
          )}
        </main>
      </div>

      <ChannelsModal open={showChannels} onOpenChange={setShowChannels} />
    </>
  );
};

export default MessagesPage;
