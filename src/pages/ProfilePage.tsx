import { ArrowLeft, Heart, MessageCircle, Play } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { getLifetimeBadges } from "@/lib/badges";

const ProfilePage = () => {
  const navigate = useNavigate();
  const { username } = useParams();
  const [userProfile, setUserProfile] = useState<{
    display_name?: string;
    archetype?: string;
    interests?: string[];
    [key: string]: unknown;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [completedCount, setCompletedCount] = useState(0);
  const [seasonComplete, setSeasonComplete] = useState(false);

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('user_id', session.user.id)
            .single();
          
          if (data && !error) {
            setUserProfile(data);
          }
        }
      } catch (error) {
        console.error('Error fetching profile:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserProfile();
  }, []);

  // Badge data is derived from goals count; no localStorage needed
  // completedCount and seasonComplete default to 0/false

  interface MockPost {
    id: number;
    content: string;
    time: string;
    likes: number;
    comments: number;
    type: string;
    image?: string;
    thumbnail?: string;
  }

  interface MockProfile {
    avatar: string;
    bio: string;
    posts: MockPost[];
  }

  // Mock user data
  const userProfiles: Record<string, MockProfile> = {
    "jobs jr": {
      avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop",
      bio: "Tech enthusiast and first-time poster",
      posts: [
        { 
          id: 1, 
          content: "wow my first post!",
          time: "3 months ago",
          likes: 0,
          comments: 0,
          type: "text"
        }
      ]
    },
    "testuser": {
      avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop",
      bio: "Lover of technology and innovation",
      posts: [
        { 
          id: 2, 
          content: "Technology at it's finest",
          time: "2 years ago",
          likes: 1,
          comments: 2,
          type: "image",
          image: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&h=600&fit=crop"
        }
      ]
    },
    "lazymoose3": {
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop",
      bio: "Just vibing and sharing cool stuff",
      posts: [
        { 
          id: 3, 
          content: "amaterasu",
          time: "3 months ago",
          likes: 0,
          comments: 0,
          type: "image",
          image: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800&h=600&fit=crop"
        }
      ]
    },
    "testuser2": {
      avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop",
      bio: "Binge-watcher and series fanatic",
      posts: [
        { 
          id: 4, 
          content: "watching Rome on Max. really bummed westworld is gone",
          time: "1 year ago",
          likes: 3,
          comments: 1,
          type: "video",
          thumbnail: "https://images.unsplash.com/photo-1574267432644-f610f5ef2d46?w=800&h=600&fit=crop"
        }
      ]
    }
  };

  const user = userProfiles[username || ""] || {
    avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop",
    bio: "New user",
    posts: []
  };

  return (
    <div className="min-h-screen pb-24 bg-background">
      {/* Header */}
      <header className="bg-primary border-b border-border h-[15vh] fixed top-0 left-0 right-0 z-40">
        <div className="flex items-center justify-center h-full relative">
          <button
            aria-label="Go back"
            onClick={() => navigate(-1)}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-accent"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="display-title text-2xl text-foreground">xaidus</h1>
        </div>
      </header>

      {/* Profile Content */}
      <main className="pt-[15vh]">
        {/* Profile Header */}
        <div className="bg-background border-b border-border p-6 space-y-4">
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-accent/30 flex-shrink-0 bg-muted">
              <img 
                src={user.avatar} 
                alt={userProfile?.display_name || username} 
                className="w-full h-full object-cover" 
              />
            </div>
            <div className="space-y-1">
              <h2 className="text-foreground font-serif text-2xl font-semibold flex items-center gap-2 flex-wrap">
                {userProfile?.display_name || username}
                {getLifetimeBadges(completedCount, seasonComplete).map((badge) => (
                  <span
                    key={badge.label}
                    className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold border shadow-sm ${badge.className}`}
                  >
                    🏆 {badge.label}
                  </span>
                ))}
              </h2>
              <p className="text-muted-foreground text-sm mt-1">{user.posts.length} posts</p>
            </div>
          </div>
          <p className="text-foreground text-sm leading-relaxed">{user.bio}</p>
          
          {/* Archetype Badge */}
          {userProfile?.archetype && (
            <div className="pt-2">
              <Badge variant="secondary" className="text-sm capitalize px-3 py-1">
                {userProfile.archetype}
              </Badge>
            </div>
          )}
          
          {/* Interests Tags */}
          {userProfile?.interests && userProfile.interests.length > 0 && (
            <div className="pt-2">
              <p className="text-xs text-muted-foreground mb-2 font-medium uppercase tracking-wide">Interests</p>
              <div className="flex flex-wrap gap-2">
                {userProfile.interests.map((interest: string) => (
                  <Badge 
                    key={interest} 
                    variant="outline" 
                    className="capitalize border-accent/50 text-accent bg-accent/5"
                  >
                    {interest}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* User Posts */}
        <div className="pt-8 pb-24">
          <h3 className="text-foreground font-serif text-2xl px-4 mb-6">posts</h3>
          {user.posts.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No posts yet</p>
            </div>
          ) : (
            user.posts.map((post) => (
              <div
                key={post.id}
                onClick={() => navigate(`/feeds/${post.id}`)}
                className="bg-background border-b border-border/30 p-4 cursor-pointer hover:bg-muted/20 transition-colors active:scale-[0.99]"
              >
                <div className="space-y-2">
                  <p className="text-foreground font-serif text-base">
                    <span className="font-semibold">{username}</span> – {post.content}
                  </p>
                  
                  <p className="text-muted-foreground text-sm">{post.time}</p>
                  
                  <div className="flex items-center gap-6 pt-1">
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <Heart className="w-4 h-4" />
                      <span className="text-sm">{post.likes}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-accent">
                      <MessageCircle className="w-4 h-4" />
                      <span className="text-sm">{post.comments}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-accent ml-auto">
                      <Play className="w-4 h-4" />
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  );
};

export default ProfilePage;
