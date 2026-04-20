import { ArrowLeft, Heart, MessageCircle, Share2, Plus, Play, Volume2, VolumeX, Maximize } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { postsApi } from "@/api/endpoints";
import { ApiPost } from "@/types/api";

const PostDetailPage = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isLiked, setIsLiked] = useState(false);
  const [post, setPost] = useState<ApiPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadPost = async () => {
      if (!id) {
        setError("Post not found");
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const data = await postsApi.get(id);
        setPost(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unable to load post");
      } finally {
        setLoading(false);
      }
    };

    loadPost();
  }, [id]);

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    if (videoRef.current) {
      videoRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const toggleFullscreen = () => {
    if (videoRef.current) {
      if (videoRef.current.requestFullscreen) {
        videoRef.current.requestFullscreen();
      }
    }
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const displayLikes = (isLiked ? 1 : 0);
  const authorName = post?.author?.displayName || post?.author?.email || 'Anonymous';
  const authorAvatar =
    post?.author?.avatarUrl || "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop";
  const authorProfileId = post?.author?.id || post?.authorId || 'unknown';
  const timestamp = post?.createdAt ? new Date(post.createdAt).toLocaleString() : '';
  const commentCount = post?.commentsCount ?? 0;

  return (
    <div className="min-h-screen pb-16 bg-background flex flex-col">
      {/* Header */}
      <header className="bg-primary border-b border-border h-[15vh] fixed top-0 left-0 right-0 z-40 flex-shrink-0">
        <div className="flex items-center justify-center h-full relative">
          <button
            onClick={() => navigate("/feeds")}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-accent"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="display-title text-2xl text-foreground">xaidus</h1>
        </div>
      </header>

      {/* Media Container */}
      <div className="flex-1 bg-black flex flex-col justify-center relative mt-[15vh]">
        {loading ? (
          <div className="text-white text-center w-full">Loading post...</div>
        ) : error || !post ? (
          <div className="text-white text-center w-full px-6 space-y-4">
            <p>{error || "Post not found."}</p>
            <button
              onClick={() => navigate("/feeds")}
              className="px-4 py-2 rounded-full bg-accent text-accent-foreground"
            >
              Back to feed
            </button>
          </div>
        ) : (
          <>
            {/* Author info at top-left of media */}
            <div 
              className="absolute top-4 left-4 flex items-center gap-2 z-10 cursor-pointer"
              onClick={() => navigate(`/profile/${authorProfileId}`)}
            >
              <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-white/30">
                <img src={authorAvatar} alt={authorName} className="w-full h-full object-cover" />
              </div>
              <p className="text-white font-semibold hover:underline">{authorName}</p>
            </div>

            {/* Media */}
            {post.mediaType === "image" && post.mediaUrl && (
              <div className="flex items-center justify-center">
                <img 
                  src={post.mediaUrl} 
                  alt={post.content}
                  className="max-w-full max-h-[50vh] md:max-h-[60vh] object-contain"
                />
              </div>
            )}

            {post.mediaType === "video" && post.mediaUrl && (
              <div className="relative">
                <video
                  ref={videoRef}
                  src={post.mediaUrl}
                  className="max-w-full max-h-[50vh] md:max-h-[60vh] object-contain mx-auto"
                  onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
                  onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
                  onClick={togglePlay}
                />
                {/* Play/Pause overlay */}
                {!isPlaying && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <button 
                      onClick={togglePlay}
                      className="w-20 h-20 rounded-full bg-accent/90 flex items-center justify-center hover:scale-110 transition-transform"
                    >
                      <Play className="w-10 h-10 text-white ml-1" />
                    </button>
                  </div>
                )}
                {/* Bottom video controls */}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
                  <div className="flex items-center gap-4">
                    <input
                      type="range"
                      min="0"
                      max={duration}
                      value={currentTime}
                      onChange={handleSeek}
                      className="flex-1 h-1 bg-white/30 rounded-full appearance-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white"
                    />
                    <span className="text-white text-sm min-w-[40px]">{formatTime(currentTime)}</span>
                    <button onClick={toggleMute}>
                      {isMuted ? (
                        <VolumeX className="w-5 h-5 text-white" />
                      ) : (
                        <Volume2 className="w-5 h-5 text-white" />
                      )}
                    </button>
                    <button onClick={toggleFullscreen}>
                      <Maximize className="w-5 h-5 text-white" />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Text-only posts */}
            {(!post.mediaType || !post.mediaUrl) && (
              <div className="px-6 text-center">
                <p className="text-white text-lg">{post.content}</p>
              </div>
            )}

            {/* Meta info at bottom */}
            <div className="absolute bottom-0 left-0 right-0 p-6 space-y-3">
              {timestamp && <p className="text-white/70 text-sm">{timestamp}</p>}
              <p className="text-white text-base">{post.content}</p>
              
              {/* Actions */}
              <div className="flex items-center gap-6">
                <button 
                  onClick={() => setIsLiked(!isLiked)}
                  className="flex items-center gap-2 transition-colors"
                >
                  <Heart className={`w-5 h-5 ${isLiked ? 'fill-red-500 text-red-500' : 'text-white'}`} />
                  <span className={`text-sm ${isLiked ? 'text-red-500' : 'text-white'}`}>{displayLikes}</span>
                </button>
                <div className="flex items-center gap-2 text-white">
                  <Plus className="w-5 h-5" />
                </div>
                <button 
                  onClick={() => navigate(`/feeds/${id}/comments`)}
                  className="flex items-center gap-2 text-white"
                >
                  <MessageCircle className="w-5 h-5" />
                  <span className="text-sm">{commentCount}</span>
                </button>
                <div className="flex items-center gap-2 text-white ml-auto">
                  <Share2 className="w-5 h-5" />
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default PostDetailPage;
