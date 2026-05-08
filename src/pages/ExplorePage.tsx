import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, MessageCircle, Plus, RefreshCw, Sparkles, Trophy } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { forumsApi } from "@/api/endpoints";
import { toast } from "@/hooks/use-toast";
import type { ApiForumPost } from "@/types/api";

function timeAgo(ts: string) {
  const diff = Date.now() - new Date(ts).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

const ExplorePage = () => {
  const navigate = useNavigate();
  const [wins, setWins] = useState<ApiForumPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [showComposer, setShowComposer] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [posting, setPosting] = useState(false);

  const loadWins = useCallback(async () => {
    setLoading(true);
    try {
      const data = await forumsApi.listPosts(undefined, "Wins");
      setWins(data.posts);
    } catch (error) {
      toast({
        title: "Couldn't load Explore",
        description: error instanceof Error ? error.message : "Try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadWins();
  }, [loadWins]);

  const shareWin = async () => {
    if (!title.trim() || !body.trim()) return;
    setPosting(true);
    try {
      const data = await forumsApi.createPost({
        title: title.trim(),
        body: body.trim(),
        category: "Wins",
      });
      setWins((current) => [data.post, ...current]);
      setTitle("");
      setBody("");
      setShowComposer(false);
      toast({ title: "Win shared", description: "People can reflect on it in Explore." });
    } catch (error) {
      toast({
        title: "Couldn't share win",
        description: error instanceof Error ? error.message : "Try again.",
        variant: "destructive",
      });
    } finally {
      setPosting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <PageHeader title="Explore" />

      <main className="pt-[calc(15vh+1rem)] px-4 pb-24 max-w-3xl mx-auto space-y-5">
        <Card className="overflow-hidden border-white/10 bg-card shadow-soft">
          <div className="relative p-5 sm:p-6">
            <div className="absolute -right-10 -top-12 h-36 w-36 rounded-full bg-amber-300/20 blur-2xl" />
            <div className="absolute -bottom-16 -left-10 h-36 w-36 rounded-full bg-sky-300/20 blur-2xl" />
            <div className="relative space-y-3">
              <p className="eyebrow">Wins, reflections, momentum</p>
              <h2 className="display-title text-[2rem] sm:text-[2.6rem] leading-tight text-foreground">
                See what others finished. Share what you learned.
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed max-w-2xl">
                Explore is for goal wins and reflections. Celebrate effort, borrow ideas, and keep private details out of posts.
              </p>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button onClick={() => setShowComposer((value) => !value)} className="gap-2">
                  <Plus className="h-4 w-4" />
                  Share a win
                </Button>
                <Button variant="outline" onClick={loadWins} className="gap-2">
                  <RefreshCw className="h-4 w-4" />
                  Refresh
                </Button>
              </div>
            </div>
          </div>
        </Card>

        {showComposer && (
          <Card className="border-accent/25 bg-accent/5 p-4 space-y-3">
            <div>
              <p className="eyebrow">Share a goal win</p>
              <p className="text-sm text-muted-foreground mt-1">
                Post the win and one reflection. Others can reply with what they noticed or learned.
              </p>
            </div>
            <Input
              value={title}
              onChange={(event) => setTitle(event.target.value.slice(0, 200))}
              placeholder="Example: Finished my first week of math check-ins"
            />
            <Textarea
              value={body}
              onChange={(event) => setBody(event.target.value.slice(0, 1200))}
              placeholder="What helped? What changed? What would you tell someone trying the same thing?"
              rows={4}
            />
            <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
              <Button variant="outline" onClick={() => setShowComposer(false)} disabled={posting}>Cancel</Button>
              <Button onClick={shareWin} disabled={posting || !title.trim() || !body.trim()}>
                {posting ? "Sharing..." : "Share win"}
              </Button>
            </div>
          </Card>
        )}

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((item) => (
              <div key={item} className="h-28 rounded-2xl bg-muted/40 animate-pulse" />
            ))}
          </div>
        ) : wins.length === 0 ? (
          <Card className="border-dashed border-border p-8 text-center space-y-3">
            <Trophy className="mx-auto h-10 w-10 text-muted-foreground/50" />
            <p className="font-semibold text-foreground">No wins shared yet.</p>
            <p className="text-sm text-muted-foreground">When someone shares a completed goal, it will show up here.</p>
            <Button size="sm" onClick={() => setShowComposer(true)}>Start with yours</Button>
          </Card>
        ) : (
          <section className="space-y-3">
            {wins.map((win) => (
              <button
                key={win.id}
                onClick={() => navigate(`/forums/${win.id}`)}
                className="w-full text-left"
              >
                <Card className="group border-white/10 bg-white/[0.025] p-4 transition hover:border-accent/30 hover:bg-white/[0.045]">
                  <div className="flex items-start gap-3">
                    <div className="mt-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-300/15">
                      <Sparkles className="h-5 w-5 text-foreground" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                          <p className="text-base font-semibold text-foreground break-words">{win.title}</p>
                          <p className="mt-1 line-clamp-2 text-sm text-muted-foreground break-words">{win.body}</p>
                        </div>
                        <ArrowRight className="hidden h-4 w-4 text-muted-foreground transition group-hover:translate-x-0.5 sm:block" />
                      </div>
                      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <span>{win.authorName}</span>
                        <span>·</span>
                        <span>{timeAgo(win.createdAt)}</span>
                        <span>·</span>
                        <span className="inline-flex items-center gap-1">
                          <MessageCircle className="h-3 w-3" />
                          {win.replyCount} reflection{win.replyCount === 1 ? "" : "s"}
                        </span>
                      </div>
                    </div>
                  </div>
                </Card>
              </button>
            ))}
          </section>
        )}
      </main>
    </div>
  );
};

export default ExplorePage;
