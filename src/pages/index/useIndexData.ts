import { useState, useCallback, useMemo } from "react";
import { goalsApi } from "@/api/endpoints";
import { useAuth } from "@/providers/AuthProvider";
import { getLifetimeBadges } from "@/lib/badges";
import { userNeedsOnboarding } from "@/lib/onboarding";
import { toast } from "@/hooks/use-toast";
import type { ApiGoal, ApiTodayGoal } from "@/types/api";

const categoryAttributes: Record<string, string> = {
  health: "Healthy",
  career: "Ambitious",
  learning: "Knowledgeable",
  creativity: "Creative",
  relationships: "Connected",
  finance: "Resourceful",
  personal: "Self-aware",
};

export function useIndexData() {
  const { user } = useAuth();
  const isTeen = !user?.role
    || user.role === "teen"
    || user.role === "scout"
    || Boolean(user?.isScoutAccount)
    || Boolean(user?.isScoutMember);

  const [progress, setProgress] = useState(0);
  const [attributes, setAttributes] = useState<string[]>([]);
  const [completedCount, setCompletedCount] = useState(0);
  const [allGoals, setAllGoals] = useState<ApiGoal[]>([]);
  const [todayGoals, setTodayGoals] = useState<ApiTodayGoal[]>([]);
  const [seasonComplete, setSeasonComplete] = useState(false);
  const [goalsLoading, setGoalsLoading] = useState(true);

  const fetchUserData = useCallback(async () => {
    try {
      const goalsResp = await goalsApi.getAll();
      const goals = Array.isArray(goalsResp) ? goalsResp : [];
      setAllGoals(goals);
      const completedGoals = goals.filter((goal) => goal?.completed);
      const completedTotal = completedGoals.length;
      setCompletedCount(completedTotal);
      const derivedAttributes = completedGoals.map(
        (goal) => categoryAttributes[goal.category || "personal"] || "Determined"
      );
      const calculatedProgress = Math.min(derivedAttributes.length * 10, 100);
      setProgress(calculatedProgress);
      setAttributes(derivedAttributes);
    } catch (error) {
      console.error("Error fetching user data:", error);
    }
  }, []);

  const fetchTodayGoals = useCallback(async () => {
    setGoalsLoading(true);
    try {
      const data = await goalsApi.getToday();
      setTodayGoals(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Error fetching today goals", err);
    } finally {
      setGoalsLoading(false);
    }
  }, []);

  const handleCheckin = useCallback(
    async (goalId: string, status: "yes" | "not_yet") => {
      try {
        const response = await goalsApi.checkin(goalId, { status }) as any;
        const rewardEarned = response?.rewardEarned;
        toast({
          title: status === "yes" && rewardEarned
            ? "You earned a Mark."
            : status === "yes"
            ? "Nice--effort counts."
            : "Logged for today.",
        });
        fetchTodayGoals();
        fetchUserData();
      } catch (err) {
        toast({
          title: "Check-in failed",
          description: err instanceof Error ? err.message : "Please try again.",
          variant: "destructive",
        });
      }
    },
    [fetchTodayGoals, fetchUserData]
  );

  const handleProgressUpdate = useCallback(
    (totalProgress: number, newAttributes: string[]) => {
      setProgress(totalProgress);
      setAttributes(newAttributes);

      if (totalProgress >= 100 && !seasonComplete) {
        setSeasonComplete(true);
        toast({
          title: "Season Complete!",
          description: "You filled your progress to 100% and earned the Silver Trophy.",
        });
      }
    },
    [seasonComplete]
  );

  const lifetimeBadges = useMemo(
    () => getLifetimeBadges(completedCount, seasonComplete),
    [completedCount, seasonComplete]
  );

  const needsOnboarding = useMemo(() => userNeedsOnboarding(user), [user]);

  return {
    user,
    isTeen,
    progress,
    attributes,
    allGoals,
    todayGoals,
    goalsLoading,
    seasonComplete,
    lifetimeBadges,
    needsOnboarding,
    fetchUserData,
    fetchTodayGoals,
    handleCheckin,
    handleProgressUpdate,
  };
}
