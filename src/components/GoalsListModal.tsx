import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Target, Trash2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ARCHETYPE_SUGGESTIONS, DEFAULT_ARCHETYPE, normalizeArchetype } from "@/lib/archetypes";
import { Skeleton } from "@/components/ui/skeleton";
import { goalsApi } from "@/api/endpoints";
import { useAuth } from "@/providers/AuthProvider";
import type { ApiGoal } from "@/types/api";

interface GoalsListModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onProgressUpdate?: (totalProgress: number, attributes: string[]) => void;
}

type Goal = ApiGoal;

const categories = [
  { value: "health", label: "Health", color: "bg-green-100 text-green-700 border-green-200" },
  { value: "career", label: "Career", color: "bg-blue-100 text-blue-700 border-blue-200" },
  { value: "learning", label: "Learning", color: "bg-purple-100 text-purple-700 border-purple-200" },
  { value: "creativity", label: "Creativity", color: "bg-pink-100 text-pink-700 border-pink-200" },
  { value: "relationships", label: "Relationships", color: "bg-orange-100 text-orange-700 border-orange-200" },
  { value: "finance", label: "Finance", color: "bg-yellow-100 text-yellow-700 border-yellow-200" },
  { value: "personal", label: "Personal", color: "bg-indigo-100 text-indigo-700 border-indigo-200" },
];

const rewardBadges: Record<string, { label: string; description: string }> = {
  health: { label: "Healthy Habit Mark", description: "You kept your body moving and refueled well." },
  career: { label: "Career Climber Mark", description: "You shipped work that moves your path forward." },
  learning: { label: "Curious Mind Mark", description: "You invested in new skills or knowledge." },
  creativity: { label: "Creative Spark Mark", description: "You made something new—keep the momentum." },
  relationships: { label: "Connector Mark", description: "You strengthened ties with someone that matters." },
  finance: { label: "Resourceful Saver Mark", description: "You made a smart money move." },
  personal: { label: "Self-Aware Mark", description: "You acted on what matters most to you." },
};

const GoalsListModal = ({ open, onOpenChange, onProgressUpdate }: GoalsListModalProps) => {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(false);
  const [archetype, setArchetype] = useState<string | null>(null);
  const { user: authUser } = useAuth();
  const userId = authUser?.id || null;

  useEffect(() => {
    if (open && userId) {
      fetchGoals();
      setArchetype(normalizeArchetype(authUser?.archetype));
    }
  }, [open, userId]);

  const fetchGoals = async () => {
    setLoading(true);

    try {
      const goalsData = await goalsApi.getAll();
      const goals = Array.isArray(goalsData) ? goalsData : [];
      setGoals(goals);

      const completedGoals = goals.filter((g) => g.completed);
      const attributes = completedGoals.map((g) => {
        const categoryLabels: Record<string, string> = {
          health: "Healthy",
          career: "Ambitious",
          learning: "Knowledgeable",
          creativity: "Creative",
          relationships: "Connected",
          finance: "Resourceful",
          personal: "Self-aware",
        };
        return categoryLabels[g.category || ""] || "Determined";
      });

      const totalProgress = Math.min(attributes.length * 10, 100);
      onProgressUpdate?.(totalProgress, attributes);
    } catch (error) {
      console.error("Error fetching goals:", error);
    } finally {
      setLoading(false);
    }
  };

  const completeGoal = async (goalId: string) => {
    const badge = getRewardBadge(goals.find((g) => g.id === goalId || g.goal_id === goalId)?.category || null);

    try {
      await goalsApi.complete(goalId);

      toast({
        title: "Goal Completed! 🎉",
        description: `You earned the ${badge.label}. ${badge.description}`,
      });

      // Immediately update local state instead of re-fetching
      setGoals((prevGoals) =>
        prevGoals.map((g) =>
          (g.id === goalId || g.goal_id === goalId)
            ? { ...g, completed: true, completed_at: new Date().toISOString() }
            : g
        )
      );
    } catch (error) {
      console.error("Error completing goal:", error);
      toast({
        title: "Error",
        description: "Failed to complete goal. Please try again.",
        variant: "destructive",
      });
    }
  };

  const deleteGoal = async (goalId: string) => {
    try {
      await goalsApi.delete(goalId);

      toast({
        title: "Goal Deleted",
        description: "Goal has been removed successfully.",
      });

      setGoals((prevGoals) => prevGoals.filter((g) => g.id !== goalId && g.goal_id !== goalId));
    } catch (error) {
      console.error("Error deleting goal:", error);
      toast({
        title: "Error",
        description: "Failed to delete goal. Please try again.",
        variant: "destructive",
      });
    }
  };

  const addSuggestedGoal = async (suggestion: { title: string; description?: string; category?: string }) => {
    if (!userId) return;

    try {
      await goalsApi.create({
        title: suggestion.title,
        description: suggestion.description,
        category: suggestion.category || "personal",
      });

      toast({
        title: "Suggestion Added",
        description: `Added "${suggestion.title}" to your goals.`,
      });
      fetchGoals();
    } catch (err) {
      console.error("Error creating suggested goal", err);
      toast({
        title: "Error",
        description: "Failed to add goal. Please try again.",
        variant: "destructive",
      });
    }
  };

  const getCategoryColor = (categoryValue: string | null | undefined) => {
    return categories.find((cat) => cat.value === categoryValue)?.color || categories[6].color;
  };

  const getCategoryLabel = (categoryValue: string | null | undefined) => {
    return categories.find((cat) => cat.value === categoryValue)?.label || categoryValue || "Personal";
  };

  const getRewardBadge = (categoryValue: string | null | undefined) => {
    return rewardBadges[categoryValue || "personal"] || rewardBadges.personal;
  };

  const calculateProgress = (goal: Goal) => {
    if (goal.completed) return 100;
    const weekStart = (() => {
      const d = new Date();
      d.setDate(d.getDate() - d.getDay());
      d.setHours(0, 0, 0, 0);
      return d;
    })();
    const completedThisWeek = (goal.completedDates || []).filter(
      (d) => new Date(d) >= weekStart,
    ).length;
    const plannedCount =
      Object.values(goal.plannedDays || {}).filter(Boolean).length || 1;
    return Math.min(100, Math.round((completedThisWeek / plannedCount) * 100));
  };

  const completedCount = goals.filter((g) => g.completed).length;
  const activeCount = goals.filter((g) => !g.completed).length;
  const averageProgress = goals.length
    ? Math.round(goals.reduce((sum, g) => sum + calculateProgress(g), 0) / goals.length)
    : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-1.5rem)] max-w-2xl bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 border border-white/10 rounded-3xl max-h-[90vh] flex flex-col overflow-hidden text-white px-4 py-4 sm:px-6 sm:py-6">
        <DialogHeader className="-mx-4 -mt-4 px-4 py-5 mb-2 rounded-t-3xl bg-gradient-to-r from-accent/20 to-accent/5 border-b border-white/10 sm:-mx-6 sm:-mt-6 sm:px-6 sm:py-6">
          <DialogTitle className="text-lg sm:text-xl font-serif text-white text-center flex items-center justify-center gap-2 break-words">
            <Target className="w-5 h-5" />
            Your Goals
          </DialogTitle>
          <DialogDescription className="text-white/70 text-center text-xs sm:text-sm break-words">
            Tap “Mark done” on a card to signal completion and claim the mark shown for that goal.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 min-h-0 flex flex-col">
          <div className="px-2 sm:px-3 pb-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Card className="bg-white/5 border-white/10 shadow-inner">
                <div className="p-4 space-y-2">
                  <p className="text-xs uppercase tracking-wide text-white/70">Completed</p>
                  <p className="text-xl sm:text-2xl font-semibold text-white break-words">{completedCount}</p>
                  <p className="text-xs text-white/60">Win streaks start here.</p>
                </div>
              </Card>
              <Card className="bg-white/5 border-white/10 shadow-inner">
                <div className="p-4 space-y-2">
                  <p className="text-xs uppercase tracking-wide text-white/70">Active</p>
                  <p className="text-xl sm:text-2xl font-semibold text-white break-words">{activeCount}</p>
                  <p className="text-xs text-white/60">Focus on the next small move.</p>
                </div>
              </Card>
              <Card className="bg-white/5 border-white/10 shadow-inner">
                <div className="p-4 space-y-2">
                  <p className="text-xs uppercase tracking-wide text-white/70">Average progress</p>
                  <div className="flex items-center gap-2">
                    <p className="text-xl sm:text-2xl font-semibold text-white shrink-0">{averageProgress}%</p>
                    <Progress value={averageProgress} className="h-2 flex-1" />
                  </div>
                  <p className="text-xs text-white/60">Keep steady momentum.</p>
                </div>
              </Card>
            </div>
          </div>

          <ScrollArea className="flex-1 min-h-0 pr-4 overflow-y-auto max-h-[60vh] sm:max-h-none">
          {loading ? (
            <div className="space-y-3 py-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-28 w-full rounded-xl bg-white/10" />
              ))}
            </div>
          ) : goals.length === 0 ? (
            <div className="text-center py-8 text-white/70">
              <Target className="w-12 h-12 mx-auto mb-3 opacity-40" />
              <p>No goals yet. Add your first goal to get started!</p>
              {archetype && (
                <div className="mt-4 space-y-2">
                  <p className="text-sm text-white/70">Suggestions for your playstyle:</p>
                  <div className="space-y-2">
                    {(ARCHETYPE_SUGGESTIONS[archetype as keyof typeof ARCHETYPE_SUGGESTIONS] || ARCHETYPE_SUGGESTIONS[DEFAULT_ARCHETYPE])
                      .slice(0, 3)
                      .map((s) => (
                        <Card key={s.title} className="p-3 flex items-start justify-between gap-3 bg-white/5 border-white/10">
                          <span className="text-sm text-white break-words min-w-0">{s.title}</span>
                          <Button size="sm" variant="secondary" className="shrink-0" onClick={() => addSuggestedGoal(s)}>
                            Add
                          </Button>
                        </Card>
                      ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3 pb-4">
              {goals.map((goal) => {
                const progress = calculateProgress(goal);
                const isAISuggestion = goal.source === "ai";
                const reward = getRewardBadge(goal.category);
                const goalKey = goal.id || goal.goal_id || `${goal.title}-${goal.createdAt || goal.created_at || 'goal'}`;
                return (
                  <Card
                    key={goalKey}
                    className="p-4 border border-white/10 bg-white/5 hover:border-accent/40 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-3 gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 mb-1">
                          <h3 className={`font-semibold text-sm break-words ${goal.completed ? "line-through text-white/50" : "text-white"}`}>
                            {goal.title}
                          </h3>
                          <div className="flex flex-wrap gap-1">
                            <Badge
                              variant="outline"
                              className={`${getCategoryColor(goal.category)} bg-white/10 text-white text-xs px-2 py-0`}
                            >
                              {getCategoryLabel(goal.category)}
                            </Badge>
                            {isAISuggestion && (
                              <Badge className="bg-amber-200/80 text-amber-900 border-amber-200 text-xs px-2 py-0 flex items-center gap-1">
                                <Sparkles className="w-3 h-3" />
                                AI
                              </Badge>
                            )}
                            {goal.completed && (
                              <Badge className="bg-green-200/80 text-green-900 border-green-200 text-xs px-2 py-0">✓ Completed</Badge>
                            )}
                          </div>
                        </div>
                        {goal.description && <p className="text-xs text-white/70 break-words">{goal.description}</p>}
                        {isAISuggestion && goal.suggestion_title && (
                          <p className="text-xs text-amber-200 mt-1 break-words">Based on: {goal.suggestion_title}</p>
                        )}
                        <div className="flex flex-col gap-1 mt-2 text-xs text-white/70">
                          <Badge className="bg-accent/20 text-white border-white/20 text-[11px] px-2 py-0.5 self-start">
                            {goal.completed ? `Mark: ${reward.label}` : `Earn: ${reward.label}`}
                          </Badge>
                          <span className="text-white/60 break-words">{reward.description}</span>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Delete goal"
                        className="h-8 w-8 text-white/60 hover:text-red-400"
                        onClick={() => deleteGoal(goal.goal_id || goal.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center gap-3">
                        <Progress value={progress} className="flex-1" />
                        <span className="text-xs text-white/70 w-12 text-right">{progress}%</span>
                      </div>
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between text-xs text-white/70">
                        <div className="flex items-center gap-2">
                          <Sparkles className="w-4 h-4 text-accent" />
                          <span>{goal.completed ? "Completed" : "In progress"}</span>
                        </div>
                        {!goal.completed && (
                          <div className="flex items-center gap-2">
                            <Button size="sm" variant="secondary" className="w-full sm:w-auto whitespace-normal" onClick={() => completeGoal(goal.goal_id || goal.id)}>
                              Mark done
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default GoalsListModal;
