import { ArrowLeft, Heart, Plus, MessageCircle, Play } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState, useEffect, useRef, lazy, Suspense } from "react";

const NewPostModal = lazy(() => import("@/components/NewPostModal"));
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/providers/AuthProvider";
import SwipeHint from "@/components/SwipeHint";
import PullToRefreshIndicator from "@/components/PullToRefreshIndicator";
import { usePullToRefresh } from "@/hooks/use-pull-to-refresh";
import { triggerHaptic } from "@/utils/haptics";
import { postsApi } from "@/api/endpoints";
import { ApiPost } from "@/types/api";
import { FeedSkeleton } from "@/components/PageSkeleton";

const FeedsPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const isTeen = !user?.role || user.role === 'teen';
  const [newPostOpen, setNewPostOpen] = useState(false);
  const [feedType, setFeedType] = useState("all");
  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set());
  const [posts, setPosts] = useState<ApiPost[]>([]);
  const [loadingFeed, setLoadingFeed] = useState(false);
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const [isLongPressing, setIsLongPressing] = useState(false);

  const fetchPosts = async () => {
    setLoadingFeed(true);
    try {
      const data = await postsApi.getAll();
      setPosts(data || []);
    } catch (error) {
      console.error('Error loading posts:', error);
      toast({
        title: "Error loading feed",
        description: error instanceof Error ? error.message : "Unable to fetch posts right now.",
        variant: "destructive",
      });
    } finally {
      setLoadingFeed(false);
    }
  };

  const handleRefresh = async () => {
    triggerHaptic('light');
    await fetchPosts();
    triggerHaptic('success');
    toast({
      title: "Feed refreshed",
      description: "Your feed is up to date",
    });
  };

  // Pull to refresh setup
  const { elementRef, pullDistance, isRefreshing } = usePullToRefresh<HTMLDivElement>({
    onRefresh: handleRefresh,
    threshold: 80,
    enabled: true,
  });

  useEffect(() => {
    const savedFeedType = localStorage.getItem("contentMode") || "all";
    setFeedType(savedFeedType);
    fetchPosts();
  }, []);

  const handleLike = (e: React.MouseEvent, itemId: string) => {
    e.stopPropagation();
    triggerHaptic('light');
    setLikedPosts(prev => {
      const newLiked = new Set(prev);
      if (newLiked.has(itemId)) {
        newLiked.delete(itemId);
      } else {
        newLiked.add(itemId);
        triggerHaptic('success');
      }
      return newLiked;
    });
  };

  const handlePlusButtonStart = () => {
    if (isTeen) return;
    
    triggerHaptic('light');
    longPressTimer.current = setTimeout(() => {
      setIsLongPressing(true);
      triggerHaptic('heavy');
      navigate('/parent-portal');
    }, 600);
  };

  const handlePlusButtonEnd = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    
    if (!isLongPressing) {
      triggerHaptic('medium');
      setNewPostOpen(true);
    }
    setIsLongPressing(false);
  };

  const filteredItems = feedType === "all" 
    ? posts 
    : posts.filter(item => item.mediaType === feedType);

  return (
    <>
      <div ref={elementRef} className="min-h-screen pb-16 bg-background">
        <PullToRefreshIndicator 
          pullDistance={pullDistance} 
          isRefreshing={isRefreshing}
          threshold={80}
        />
        <SwipeHint />
        
        {/* Header */}
        <header className="bg-primary border-b border-border h-14 fixed top-0 left-0 right-0 z-40">
          <div className="flex items-center justify-center h-full relative">
            <button
              aria-label="Go back"
              onClick={() => {
                triggerHaptic('light');
                navigate("/");
              }}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-accent"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
            <h1 className="display-title text-2xl text-foreground">xaidus</h1>
          </div>
        </header>

        {/* Main content */}
        <main className="pt-14 relative">
          <div className="space-y-responsive">
            {loadingFeed ? (
              <FeedSkeleton />
            ) : filteredItems.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">No posts yet. Share the first one!</div>
            ) : filteredItems.map((item) => {
              const isLiked = likedPosts.has(item.id);
              const displayLikes = (isLiked ? 1 : 0);
              const authorName = item.author?.displayName || item.author?.email || 'Anonymous';
              const profileSlug = item.author?.id || item.authorId || 'unknown';
              const commentCount = item.commentsCount ?? 0;
              const timestamp = item.createdAt ? new Date(item.createdAt).toLocaleString() : "Just now";
              return (
              <div
                key={item.id}
                onClick={() => {
                  triggerHaptic('light');
                  navigate(`/feeds/${item.id}`);
                }}
                className="bg-background border-b border-border/30 p-responsive cursor-pointer hover:bg-muted/20 transition-colors active:scale-[0.99]"
              >
                <div className="space-y-2">
                  {/* Title line */}
                  <p className="text-foreground font-serif text-base">
                    <span 
                      className="font-semibold cursor-pointer hover:underline"
                      onClick={(e) => {
                        e.stopPropagation();
                        triggerHaptic('light');
                        navigate(`/profile/${profileSlug}`);
                      }}
                    >
                      {authorName}
                    </span> – {item.content}
                  </p>
                
                {/* Time */}
                <p className="text-muted-foreground text-sm">{timestamp}</p>
                
                  {/* Actions */}
                  <div className="flex items-center gap-6 pt-1">
                    <button
                      aria-label={isLiked ? "Unlike post" : "Like post"}
                      onClick={(e) => handleLike(e, item.id)}
                      className="flex items-center gap-1.5 transition-colors"
                    >
                      <Heart 
                        className={`w-4 h-4 ${isLiked ? 'fill-red-500 text-red-500' : 'text-muted-foreground'}`}
                      />
                      <span className={`text-sm ${isLiked ? 'text-red-500' : 'text-muted-foreground'}`}>
                        {displayLikes}
                      </span>
                    </button>
                  <div className="flex items-center gap-1.5 text-accent">
                    <Plus className="w-4 h-4" />
                  </div>
                  <div className="flex items-center gap-1.5 text-accent">
                    <MessageCircle className="w-4 h-4" />
                    <span className="text-sm">{commentCount}</span>
                  </div>
                    <div className="flex items-center gap-1.5 text-accent ml-auto">
                      <Play className="w-4 h-4" />
                    </div>
                  </div>
                </div>
              </div>
            );
            })}
          </div>
        </main>

        {/* Floating New Post Button */}
        <button
          aria-label="Create new post"
          onMouseDown={handlePlusButtonStart}
          onMouseUp={handlePlusButtonEnd}
          onMouseLeave={handlePlusButtonEnd}
          onTouchStart={handlePlusButtonStart}
          onTouchEnd={handlePlusButtonEnd}
          className="fixed bottom-24 right-6 w-14 h-14 rounded-full bg-accent text-accent-foreground shadow-medium flex items-center justify-center hover:scale-110 transition-transform active:scale-95 z-30"
        >
          <Plus className="w-6 h-6" />
        </button>
      </div>

      <Suspense fallback={null}>
        <NewPostModal open={newPostOpen} onOpenChange={setNewPostOpen} onCreated={fetchPosts} />
      </Suspense>
    </>
  );
};

export default FeedsPage;
