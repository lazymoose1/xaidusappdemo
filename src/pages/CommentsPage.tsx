import { ArrowLeft, MessageSquare, Search, X, Loader2, Paperclip } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import BottomNav from "@/components/BottomNav";
import { postsApi } from "@/api/endpoints";
import { ApiComment, ApiPost } from "@/types/api";

const CommentsPage = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [comments, setComments] = useState<ApiComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [postContent, setPostContent] = useState("");
  const [postAuthor, setPostAuthor] = useState("post");

  useEffect(() => {
    if (!id) return;
    fetchPost();
    fetchComments();
  }, [id]);

  const fetchPost = async () => {
    if (!id) return;
    try {
      const data = await postsApi.get(id);
      setPostContent(data.content);
      setPostAuthor(data.author?.displayName || data.author?.email || "post");
    } catch (error) {
      console.error('Error loading post snippet:', error);
    }
  };

  const fetchComments = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const data = await postsApi.getComments(id);
      setComments(data || []);
    } catch (error) {
      console.error('Error loading comments:', error);
      toast.error(error instanceof Error ? error.message : "Unable to load comments");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!comment.trim()) return;
    
    setIsSubmitting(true);
    try {
      await postsApi.addComment(id!, comment);
      toast.success("Comment posted!");
      setComment("");
      fetchComments();
    } catch (error) {
      console.error('Error posting comment:', error);
      toast.error(error instanceof Error ? error.message : "Failed to post comment");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen pb-12 bg-background flex flex-col">
      {/* Header */}
      <header className="bg-primary border-b border-border h-[15vh] fixed top-0 left-0 right-0 z-40 flex items-center">
        <div className="flex items-center justify-center h-full relative w-full">
          <button
            onClick={() => navigate(`/feeds/${id}`)}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-accent"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="display-title text-xl text-foreground">xaidus</h1>
          <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
            <MessageSquare className="w-6 h-6 text-accent" />
            <Search className="w-6 h-6 text-accent" />
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 px-responsive pt-[15vh] overflow-y-auto">
        {/* Spacing from header - 24px */}
        <div className="pt-6 space-y-6">
          {/* Original post snippet */}
          <div className="text-foreground text-base">
            <span className="font-semibold">{postAuthor}</span> – {postContent || "No content available"}
          </div>

          {/* Comments heading with close */}
          <div className="flex items-center justify-center relative py-4">
            <h2 className="font-serif text-4xl text-foreground">comments</h2>
            <button 
              onClick={() => navigate(`/feeds/${id}`)}
              className="absolute right-0 top-1/2 -translate-y-1/2 min-w-[44px] min-h-[44px] flex items-center justify-center"
            >
              <X className="w-6 h-6 text-muted-foreground" />
            </button>
          </div>

          {/* Comment input */}
          <div className="space-y-3">
            <Textarea
              placeholder="Enter Comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="min-h-[120px] resize-none text-base rounded-lg"
            />
            
            <div className="flex items-center gap-3">
              <Button
                onClick={handleSubmit}
                disabled={!comment.trim() || isSubmitting}
                className="flex-1 bg-accent hover:bg-accent/90 text-accent-foreground h-12 text-base font-semibold rounded-lg"
              >
                post
              </Button>
              <Button
                variant="outline"
                className="flex-1 border-2 border-accent text-accent hover:bg-accent/10 h-12 text-base font-semibold rounded-lg bg-transparent"
              >
                <Paperclip className="w-5 h-5 mr-2" />
                add file
              </Button>
            </div>

            {isSubmitting && (
              <div className="flex items-center justify-center py-2">
                <Loader2 className="w-5 h-5 text-accent animate-spin" />
              </div>
            )}
          </div>

          {/* Comments list */}
          <div className="space-y-4">
            {loading ? (
              <div className="text-center py-6 text-muted-foreground">Loading comments...</div>
            ) : comments.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">No comments yet</div>
            ) : (
              comments.map((item) => (
                <div key={item.id} className="border border-border rounded-lg p-4 space-y-1">
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span className="font-semibold text-foreground">
                      {item.author?.displayName || item.author?.email || "Anonymous"}
                    </span>
                    {item.createdAt && (
                      <span>{new Date(item.createdAt).toLocaleString()}</span>
                    )}
                  </div>
                  <p className="text-foreground text-base">{item.text}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </main>
      
      <BottomNav />
    </div>
  );
};

export default CommentsPage;
