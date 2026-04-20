import { useEffect, useState, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Search, MessageSquare, TrendingUp, Pin, Plus, X } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import PageHeader from "@/components/PageHeader";
import { forumsApi } from "@/api/endpoints";
import type { ApiForumPost, ForumCategory } from "@/types/api";

const CATEGORIES: ForumCategory[] = ["Help", "Ideas", "General", "Tips", "Announcement"];

const CATEGORY_COLORS: Record<string, string> = {
  Help: "bg-blue-100 text-blue-700 border-blue-200",
  Ideas: "bg-purple-100 text-purple-700 border-purple-200",
  General: "bg-gray-100 text-gray-700 border-gray-200",
  Tips: "bg-green-100 text-green-700 border-green-200",
  Announcement: "bg-yellow-100 text-yellow-700 border-yellow-200",
};

function timeAgo(ts: string) {
  const diff = Date.now() - new Date(ts).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

const ForumsPage = () => {
  const navigate = useNavigate();
  const [posts, setPosts] = useState<ApiForumPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("");

  // New post form
  const [showNewPost, setShowNewPost] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newBody, setNewBody] = useState("");
  const [newCategory, setNewCategory] = useState<ForumCategory>("General");
  const [posting, setPosting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await forumsApi.listPosts(search || undefined, activeCategory || undefined);
      setPosts(data.posts);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load posts");
    } finally {
      setLoading(false);
    }
  }, [search, activeCategory]);

  useEffect(() => {
    const t = setTimeout(load, search ? 350 : 0);
    return () => clearTimeout(t);
  }, [load, search]);

  const handleCreatePost = async () => {
    if (!newTitle.trim() || !newBody.trim()) return;
    setPosting(true);
    try {
      const data = await forumsApi.createPost({ title: newTitle.trim(), body: newBody.trim(), category: newCategory });
      setPosts((prev) => [data.post, ...prev]);
      setShowNewPost(false);
      setNewTitle("");
      setNewBody("");
      setNewCategory("General");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to create post");
    } finally {
      setPosting(false);
    }
  };

  const pinned = posts.filter((p) => p.isPinned);
  const regular = posts.filter((p) => !p.isPinned);

  return (
    <div className="min-h-screen pb-24 bg-background">
      <PageHeader title="Forums" />
      <main className="pt-[calc(15vh+1rem)] px-4 pb-24 space-y-6">

        {/* Search + new post */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
            <Input
              placeholder="Search topics…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-11 h-11 rounded-full border-accent/20 focus:border-accent"
            />
          </div>
          <Button
            size="icon"
            className="h-11 w-11 rounded-full flex-shrink-0"
            onClick={() => setShowNewPost(true)}
            aria-label="New post"
          >
            <Plus className="w-5 h-5" />
          </Button>
        </div>

        {/* Category filter */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          <button
            onClick={() => setActiveCategory("")}
            className={`flex-shrink-0 text-xs px-3 py-1.5 rounded-full border transition ${
              !activeCategory ? "bg-accent text-accent-foreground border-accent" : "border-border text-muted-foreground"
            }`}
          >
            All
          </button>
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat === activeCategory ? "" : cat)}
              className={`flex-shrink-0 text-xs px-3 py-1.5 rounded-full border transition ${
                activeCategory === cat ? "bg-accent text-accent-foreground border-accent" : "border-border text-muted-foreground"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* New post form */}
        {showNewPost && (
          <Card className="p-4 border border-accent/30 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-foreground">New discussion</h3>
              <button onClick={() => setShowNewPost(false)} className="text-muted-foreground hover:text-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>
            <Input
              placeholder="Title"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value.slice(0, 200))}
              className="border-accent/20"
            />
            <Textarea
              placeholder="What's on your mind?"
              value={newBody}
              onChange={(e) => setNewBody(e.target.value.slice(0, 5000))}
              rows={3}
              className="resize-none border-accent/20"
            />
            <div className="flex gap-2 flex-wrap">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setNewCategory(cat)}
                  className={`text-xs px-3 py-1 rounded-full border transition ${
                    newCategory === cat ? "bg-accent/10 border-accent text-accent" : "border-border text-muted-foreground"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setShowNewPost(false)}>Cancel</Button>
              <Button size="sm" disabled={posting || !newTitle.trim() || !newBody.trim()} onClick={handleCreatePost}>
                {posting ? "Posting…" : "Post"}
              </Button>
            </div>
          </Card>
        )}

        {loading && (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-muted/40 rounded-2xl animate-pulse" />
            ))}
          </div>
        )}

        {error && (
          <div className="text-center py-10 text-muted-foreground">
            <p className="mb-3">{error}</p>
            <Button variant="outline" size="sm" onClick={load}>Retry</Button>
          </div>
        )}

        {!loading && !error && (
          <>
            {/* Pinned */}
            {pinned.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Pin className="w-4 h-4 text-accent" />
                  <h2 className="font-serif text-lg text-foreground">Pinned</h2>
                </div>
                {pinned.map((post) => <PostCard key={post.id} post={post} onClick={() => navigate(`/forums/${post.id}`)} />)}
              </div>
            )}

            {/* Regular posts */}
            {regular.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-accent" />
                  <h2 className="font-serif text-lg text-foreground">
                    {activeCategory || "All discussions"}
                  </h2>
                </div>
                {regular.map((post) => <PostCard key={post.id} post={post} onClick={() => navigate(`/forums/${post.id}`)} />)}
              </div>
            )}

            {posts.length === 0 && (
              <div className="text-center py-16 space-y-3">
                <p className="text-muted-foreground">No posts yet.</p>
                <Button size="sm" onClick={() => setShowNewPost(true)}>Start the conversation</Button>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
};

function PostCard({ post, onClick }: { post: ApiForumPost; onClick: () => void }) {
  return (
    <Card
      onClick={onClick}
      className="p-3 border border-border/50 hover:border-accent/30 transition-colors cursor-pointer rounded-2xl shadow-sm"
    >
      <div className="flex items-start gap-3">
        <MessageSquare className="w-5 h-5 text-muted-foreground mt-0.5 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-2 mb-1">
            <h3 className="font-semibold text-sm text-foreground flex-1 leading-tight">{post.title}</h3>
            <Badge variant="outline" className={`text-xs px-2 py-0.5 flex-shrink-0 ${CATEGORY_COLORS[post.category] || CATEGORY_COLORS.General}`}>
              {post.category}
            </Badge>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
            <span>{post.authorName}</span>
            <span>·</span>
            <span>{post.replyCount} {post.replyCount === 1 ? "reply" : "replies"}</span>
            <span>·</span>
            <span>{post.viewCount} views</span>
            <span>·</span>
            <span>{timeAgo(post.createdAt)}</span>
          </div>
        </div>
      </div>
    </Card>
  );
}

export default ForumsPage;
