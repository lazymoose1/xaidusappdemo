import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { User, Image, Video, Type, Users, Target } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import ThemeModeRow from "@/components/ThemeModeRow";
import { supabase } from "@/integrations/supabase/client";

interface SettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface Goal {
  id: string;
  goal_id: string;
  title: string;
  description: string | null;
  category: string | null;
  completed: boolean | null;
  created_at: string | null;
}

const SettingsModal = ({ open, onOpenChange }: SettingsModalProps) => {
  const [userId, setUserId] = useState<string | null>(null);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [completedCount, setCompletedCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);

  // Mock user data - in production, this would come from Redux/state management
  const userData = {
    userType: "teen",
    contentMode: "all",
    recentFeedback: [
      "Great progress on your creative goals this week!",
      "You've been consistent with daily reflections",
      "Consider joining more forum discussions"
    ]
  };

  const contentModes = {
    text: { icon: Type, label: "Text Only" },
    photo: { icon: Image, label: "Photos" },
    video: { icon: Video, label: "Videos" },
    all: { icon: Users, label: "All Content" }
  };

  const CurrentModeIcon = contentModes[userData.contentMode as keyof typeof contentModes]?.icon || Users;

  // Fetch user session and goals
  useEffect(() => {
    const getUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUserId(session.user.id);
      }
    };
    getUser();
  }, []);

  // Fetch goals when modal opens or userId changes
  useEffect(() => {
    if (open && userId) {
      fetchGoals();
    }
  }, [open, userId]);

  const fetchGoals = async () => {
    if (!userId) return;
    setLoading(true);

    try {
      const { data, error } = await supabase
        .from('goals')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const goalsData = data || [];
      setGoals(goalsData);

      // Calculate completed goals and progress
      const completed = goalsData.filter((g) => g.completed).length;
      setCompletedCount(completed);
      
      // Progress calculation: 10% per completed goal (max 100%)
      const calculatedProgress = Math.min(completed * 10, 100);
      setProgress(calculatedProgress);
    } catch (error) {
      console.error('Error fetching goals:', error);
      setGoals([]);
      setCompletedCount(0);
      setProgress(0);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-background border-primary rounded-3xl max-h-[85vh] overflow-hidden">
        <DialogHeader className="bg-primary -m-6 p-6 mb-4 rounded-t-3xl">
          <DialogTitle className="text-2xl font-serif text-accent text-center">
            Your Xaidus profile
          </DialogTitle>
          <DialogDescription className="text-accent/70 text-center">
            Your personalized Xaidus experience
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[65vh] pr-4">
          <div className="space-y-6 pt-2 pb-4">
            <ThemeModeRow />

            {/* User Info */}
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground mb-3">User Info</h3>
              <div className="flex items-center gap-4 p-4 bg-primary/5 rounded-2xl border border-primary/20">
                <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-accent">
                  <img
                    src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&h=400&fit=crop"
                    alt="Profile"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div>
                  <p className="font-serif text-lg text-foreground">lazymoose1</p>
                  <p className="text-sm text-muted-foreground">biioooooooo</p>
                </div>
              </div>
            </div>

            {/* User Type */}
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground mb-2">User Type</h3>
              <Badge variant="secondary" className="text-base px-4 py-1 rounded-full">
                {userData.userType === "teen" ? "Teen" : "Parent"}
              </Badge>
            </div>

            {/* Content Mode */}
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground mb-2">Content Mode</h3>
              <div className="flex items-center gap-2">
                <CurrentModeIcon className="w-5 h-5 text-accent" />
                <Badge variant="outline" className="text-base px-4 py-1 border-accent rounded-full">
                  {contentModes[userData.contentMode as keyof typeof contentModes]?.label}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-2">This controls which type of content you see most.</p>
            </div>

            {/* Progress Summary - Now using real data */}
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground mb-2">Progress Summary</h3>
              <div className="flex items-center gap-3 mb-3">
                <div className="flex-1 h-3 bg-secondary rounded-full overflow-hidden">
                  <div
                    className="h-full bg-accent transition-all duration-500"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <span className="text-lg font-bold text-accent">{progress}%</span>
              </div>
              <ul className="space-y-1 text-sm text-muted-foreground">
                <li>• {goals.length} goals created</li>
                <li>• {completedCount} goals completed {completedCount > 0 ? "this month" : "yet"}</li>
              </ul>
            </div>

            {/* Active Goals - Real data from Supabase */}
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground mb-3">Your Goals</h3>
              {loading ? (
                <p className="text-xs text-muted-foreground">Loading goals...</p>
              ) : goals.length === 0 ? (
                <div className="text-center py-4">
                  <Target className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p className="text-xs text-muted-foreground">No goals yet. Start by adding one!</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {goals.slice(0, 5).map((goal) => (
                    <div key={goal.goal_id} className="flex items-start gap-3 p-3 bg-primary/5 rounded-lg border border-primary/10">
                      <div className="flex-1">
                        <p className={`text-sm font-medium ${goal.completed ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                          {goal.title}
                        </p>
                        {goal.category && (
                          <p className="text-xs text-muted-foreground capitalize">{goal.category}</p>
                        )}
                      </div>
                      {goal.completed && (
                        <Badge className="bg-green-500/20 text-green-700 text-xs">Done</Badge>
                      )}
                    </div>
                  ))}
                  {goals.length > 5 && (
                    <p className="text-xs text-muted-foreground text-center mt-2">
                      +{goals.length - 5} more goals
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

export default SettingsModal;
