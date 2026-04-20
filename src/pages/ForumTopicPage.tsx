import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, ThumbsUp, MessageSquare } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import PageHeader from "@/components/PageHeader";
import { forumsApi } from "@/api/endpoints";
import type { ApiForumPost, ApiForumReply } from "@/types/api";

function timeAgo(ts: string) {
  const diff = Date.now() - new Date(ts).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function Initials({ name }: { name: string }) {
  const parts = name.trim().split(" ");
  return <>{parts.map((p) => p[0]?.toUpperCase()).join("").slice(0, 2)}</>;
}

const ForumTopicPage = () => {
  const { topicId } = useParams<{ topicId: string }>();
  const navigate = useNavigate();
  const [post, setPost] = useState<ApiForumPost | null>(null);
  const [replies, setReplies] = useState<ApiForumReply[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!topicId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await forumsApi.getPost(topicId);
        if (cancelled) return;
        setPost(data.post);
        setReplies(data.replies);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load post");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [topicId]);

  const handleLikePost = async () => {
    if (!post) return;
    try {
      const result = await forumsApi.likePost(post.id);
      setPost((prev) => prev ? { ...prev, likes: Array(result.likes).fill(''), likedByMe: result.likedByMe } : prev);
    } catch { /* ignore */ }
  };

  const handleLikeReply = async (reply: ApiForumReply) => {
    if (!post) return;
    try {
      const result = await forumsApi.likeReply(post.id, reply.id);
      setReplies((prev) => prev.map((r) =>
        r.id === reply.id ? { ...r, likes: Array(result.likes).fill(''), likedByMe: result.likedByMe } : r
      ));
    } catch { /* ignore */ }
  };

  const handleReply = async () => {
    if (!topicId || !replyText.trim()) return;
    setSubmitting(true);
    try {
      const data = await forumsApi.createReply(topicId, replyText.trim());
      setReplies((prev) => [...prev, data.reply]);
      setPost((prev) => prev ? { ...prev, replyCount: prev.replyCount + 1 } : prev);
      setReplyText("");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to post reply");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen pb-24 bg-background">
      <PageHeader
        title="Discussion"
        leftAction={
          <button onClick={() => navigate("/forums")} className="text-accent">
            <ArrowLeft size={20} />
          </button>
        }
      />

      <main className="px-4 pt-[calc(15vh+1rem)] pb-24 space-y-5">
        {loading && (
          <div className="space-y-3">
            <div className="h-32 bg-muted/40 rounded-2xl animate-pulse" />
            <div className="h-16 bg-muted/40 rounded-2xl animate-pulse" />
          </div>
        )}

        {error && (
          <div className="text-center py-16 text-muted-foreground">
            <p>{error}</p>
          </div>
        )}

        {!loading && post && (
          <>
            {/* Original post */}
            <Card className="p-4 border border-border/50 shadow-sm space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-accent/20 text-accent flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-semibold"><Initials name={post.authorName} /></span>
                </div>
                <div>
                  <p className="font-semibold text-foreground text-sm">{post.authorName}</p>
                  <p className="text-xs text-muted-foreground">{timeAgo(post.createdAt)}</p>
                </div>
              </div>
              <h2 className="font-serif text-xl text-foreground">{post.title}</h2>
              <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{post.body}</p>
              <div className="flex items-center gap-4 pt-2 border-t border-border/30">
                <button
                  onClick={handleLikePost}
                  className={`flex items-center gap-1.5 transition-colors ${post.likedByMe ? "text-accent" : "text-muted-foreground hover:text-accent"}`}
                >
                  <ThumbsUp size={15} />
                  <span className="text-xs">{post.likes.length}</span>
                </button>
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <MessageSquare size={15} />
                  <span className="text-xs">{replies.length}</span>
                </div>
              </div>
            </Card>

            {/* Replies */}
            {replies.length > 0 && (
              <div className="space-y-3">
                <h3 className="font-serif text-lg text-foreground">
                  {replies.length} {replies.length === 1 ? "Reply" : "Replies"}
                </h3>
                {replies.map((reply) => (
                  <Card key={reply.id} className="p-4 border border-border/50 shadow-sm">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-accent/20 text-accent flex items-center justify-center flex-shrink-0">
                        <span className="text-xs font-semibold"><Initials name={reply.authorName} /></span>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-sm text-foreground">{reply.authorName}</span>
                          <span className="text-xs text-muted-foreground">· {timeAgo(reply.createdAt)}</span>
                        </div>
                        <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap mb-2">{reply.body}</p>
                        <button
                          onClick={() => handleLikeReply(reply)}
                          className={`flex items-center gap-1.5 transition-colors ${reply.likedByMe ? "text-accent" : "text-muted-foreground hover:text-accent"}`}
                        >
                          <ThumbsUp size={13} />
                          <span className="text-xs">{reply.likes.length}</span>
                        </button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}

            {/* Reply composer */}
            <div className="space-y-2">
              <h3 className="font-semibold text-sm text-foreground">Leave a reply</h3>
              <Textarea
                value={replyText}
                onChange={(e) => setReplyText(e.target.value.slice(0, 5000))}
                placeholder="Share your thoughts…"
                rows={3}
                className="resize-none border-accent/20 focus:border-accent"
              />
              <div className="flex justify-end">
                <Button
                  onClick={handleReply}
                  disabled={submitting || !replyText.trim()}
                  size="sm"
                >
                  {submitting ? "Posting…" : "Reply"}
                </Button>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
};

export default ForumTopicPage;
