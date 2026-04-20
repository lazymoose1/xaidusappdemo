import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { threadsApi } from "@/api/endpoints";
import type { ApiThread, ApiThreadMessage } from "@/types/api";

const ThreadDetailPage = () => {
  const { threadId } = useParams<{ threadId: string }>();
  const navigate = useNavigate();
  const [thread, setThread] = useState<ApiThread | null>(null);
  const [messages, setMessages] = useState<ApiThreadMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!threadId) return;
      setLoading(true);
      setError(null);
      try {
        const [threadResp, messagesResp] = await Promise.all([
          threadsApi.get(threadId),
          threadsApi.getMessages(threadId)
        ]);
        if (cancelled) return;
        const ordered = (messagesResp.messages || []).slice().sort((a, b) => {
          const ta = new Date(a.createdAt || '').getTime();
          const tb = new Date(b.createdAt || '').getTime();
          return ta - tb;
        });
        setThread(threadResp.thread || null);
        setMessages(ordered);
        await threadsApi.markRead(threadId).catch(() => undefined);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Failed to load messages");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [threadId]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  const title = useMemo(() => thread?.title || "Messages", [thread]);

  async function handleSend() {
    if (!threadId || !input.trim()) return;
    const optimistic: ApiThreadMessage = {
      id: `local-${Date.now()}`,
      threadId,
      senderId: "me",
      text: input,
      createdAt: new Date().toISOString()
    };
    setMessages((prev) => [...prev, optimistic]);
    setInput("");
    try {
      const resp = await threadsApi.sendMessage(threadId, optimistic.text);
      setMessages((prev) => prev.map((m) => (m.id === optimistic.id ? resp.message : m)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send message");
      // remove optimistic if failed
      setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
    }
  }

  const renderMessages = () => {
    if (loading) {
      return (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, idx) => (
            <div key={idx} className="h-14 bg-muted/40 rounded-lg animate-pulse" />
          ))}
        </div>
      );
    }
    if (error) {
      return <p className="text-muted-foreground">{error}</p>;
    }
    if (!messages.length) {
      return <p className="text-muted-foreground">No messages yet</p>;
    }
    return (
      <div className="space-y-4">
        {messages.map((msg) => {
          const isSent = msg.senderId === 'me' || msg.senderId === 'demo-user';
          return (
            <div
              key={msg.id}
              className={`flex flex-col gap-1 ${isSent ? 'items-end' : 'items-start'}`}
            >
              <div className="text-xs text-muted-foreground px-3">
                {new Date(msg.createdAt || '').toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
              <div
                className={`rounded-2xl px-4 py-2 text-sm max-w-[80%] word-wrap break-words ${
                  isSent
                    ? 'bg-primary text-primary-foreground rounded-tr-none'
                    : 'bg-muted text-foreground rounded-tl-none'
                }`}
              >
                {msg.text}
              </div>
            </div>
          );
        })}
        <div ref={scrollRef} />
      </div>
    );
  };

  return (
    <div className="min-h-screen pb-20 bg-background flex flex-col">
      <header className="bg-primary border-b border-border h-[15vh] fixed top-0 left-0 right-0 z-40">
        <div className="flex items-center justify-between h-full px-4">
          <button onClick={() => navigate(-1)} className="text-accent">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="font-serif text-2xl text-accent">{title}</h1>
          <div className="w-6" />
        </div>
      </header>

      <main className="flex-1 px-4 pt-[16vh] pb-4 overflow-y-auto">
        {renderMessages()}
      </main>

      <div className="px-4 py-3 border-t border-border bg-background">
        <div className="flex items-center gap-2">
          <Input
            placeholder="Enter message"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleSend();
              }
            }}
            className="flex-1 border-0 bg-muted focus-visible:ring-0"
          />
          <Button variant="ghost" className="text-accent" onClick={handleSend}>
            <Send className="w-5 h-5" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ThreadDetailPage;
