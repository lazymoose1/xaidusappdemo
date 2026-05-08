import { useState, useEffect, lazy, Suspense } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Bell, List } from "lucide-react";
import BrandWordmark from "@/components/BrandWordmark";
import SwipeHint from "@/components/SwipeHint";
import PullToRefreshIndicator from "@/components/PullToRefreshIndicator";
import { usePullToRefresh } from "@/hooks/use-pull-to-refresh";
import { triggerHaptic } from "@/utils/haptics";
import { notificationsApi, goalsApi, forumsApi } from "@/api/endpoints";
import { toast } from "@/hooks/use-toast";
import TodayGoalsCard from "./TodayGoalsCard";
import WelcomeSection from "./WelcomeSection";
import TeenHomeView from "./TeenHomeView";
import ParentTeensView from "@/components/ParentTeensView";
import RewardsPanel from "@/components/RewardsPanel";
import { useIndexData } from "./useIndexData";
import type { AiWrapperResponse } from "@/services/aiClient";
import { resolveTeenHomePrimaryAction } from "./resolveTeenHomePrimaryAction";

const SettingsModal = lazy(() => import("@/components/SettingsModal"));
const GoalModal = lazy(() => import("@/components/GoalModal"));
const NewPostModal = lazy(() => import("@/components/NewPostModal"));
const AddGoalModal = lazy(() => import("@/components/AddGoalModal"));
const GoalsListModal = lazy(() => import("@/components/GoalsListModal"));

const TINY_ADVICE_KEY = ['tinyAdvice'] as const;
const ALERT_REFRESH_MS = 10_000;

const IndexPage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const {
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
  } = useIndexData();

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [goalModalOpen, setGoalModalOpen] = useState(false);
  const [addGoalOpen, setAddGoalOpen] = useState(false);
  const [addGoalInitialTitle, setAddGoalInitialTitle] = useState('');
  const [addGoalInitialMicroStep, setAddGoalInitialMicroStep] = useState('');
  const [goalsListOpen, setGoalsListOpen] = useState(false);
  const [newPostOpen, setNewPostOpen] = useState(false);
  const [confettiOn, setConfettiOn] = useState(false);
  const [alertCount, setAlertCount] = useState(0);
  const [completedWin, setCompletedWin] = useState<{ title: string; microStep?: string } | null>(null);
  const [sharingWin, setSharingWin] = useState(false);

  const username = user?.displayName || "Lazy Moose";
  const profileImage =
    user?.avatarUrl ||
    "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&h=400&fit=crop";
  const bio = "Your 10-second daily pulse. Teen-led. Trust-first.";
  const teenHomeResolution = resolveTeenHomePrimaryAction({ allGoals, todayGoals });

  const { elementRef, pullDistance, isRefreshing } = usePullToRefresh<HTMLDivElement>({
    onRefresh: async () => {
      triggerHaptic("light");
      await fetchUserData();
      await fetchTodayGoals();
      triggerHaptic("success");
    },
    threshold: 80,
    enabled: true,
  });

  // Redirect leaders/parents as soon as the real role arrives from the background profile fetch
  useEffect(() => {
    if (user?.role === 'scout_leader') navigate('/leader');
  }, [user?.role]);

  useEffect(() => {
    fetchUserData();
    fetchTodayGoals();
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadAlerts = async () => {
      try {
        const data = await notificationsApi.getAll();
        if (!cancelled) setAlertCount(data.total);
      } catch {
        if (!cancelled) setAlertCount(0);
      }
    };

    loadAlerts();
    const handleVisibilityOrFocus = () => {
      if (document.visibilityState === 'visible') {
        loadAlerts();
      }
    };
    const interval = setInterval(loadAlerts, ALERT_REFRESH_MS);
    window.addEventListener('focus', handleVisibilityOrFocus);
    document.addEventListener('visibilitychange', handleVisibilityOrFocus);

    return () => {
      cancelled = true;
      clearInterval(interval);
      window.removeEventListener('focus', handleVisibilityOrFocus);
      document.removeEventListener('visibilitychange', handleVisibilityOrFocus);
    };
  }, []);

  const wrappedProgressUpdate = (totalProgress: number, newAttributes: string[]) => {
    handleProgressUpdate(totalProgress, newAttributes);
    if (totalProgress >= 100 && !seasonComplete) {
      setConfettiOn(true);
      setTimeout(() => setConfettiOn(false), 2400);
    }
  };

  const handleTinyClick = () => {
    triggerHaptic("light");
    setGoalModalOpen(true);
  };

  const handleAddGoalClick = () => {
    triggerHaptic("light");
    setAddGoalInitialTitle('');
    setAddGoalInitialMicroStep('');
    setAddGoalOpen(true);
  };

  const handleCreateGoalFromTiny = (title: string) => {
    triggerHaptic("light");
    const cached = queryClient.getQueryData<AiWrapperResponse>(TINY_ADVICE_KEY);
    setAddGoalInitialTitle(title);
    setAddGoalInitialMicroStep(cached?.nextStep || '');
    setAddGoalOpen(true);
  };

  const handleGoalAdded = () => {
    triggerHaptic("success");
    fetchUserData();
    fetchTodayGoals();
  };

  const scrollToCard = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handleStartWeeklyReset = async () => {
    try {
      await goalsApi.weeklyReset(false);
      toast({ title: "Week started", description: "Your goals are ready for a fresh check-in week." });
      await fetchUserData();
      await fetchTodayGoals();
    } catch (err) {
      toast({
        title: "Reset failed",
        description: err instanceof Error ? err.message : "Try again later.",
        variant: "destructive",
      });
    }
  };

  const handleButtonClick = (callback: () => void) => {
    triggerHaptic("medium");
    callback();
  };

  const handleTeenCheckin = async (goalId: string, status: "yes" | "not_yet") => {
    const response = await handleCheckin(goalId, status) as any;
    if (status === "yes" && response?.justCompleted) {
      triggerHaptic("success");
      setConfettiOn(true);
      setCompletedWin({ title: response.title || "Goal completed", microStep: response.microStep });
      setTimeout(() => setConfettiOn(false), 3200);
    }
  };

  const shareCompletedWin = async () => {
    if (!completedWin) return;
    setSharingWin(true);
    try {
      await forumsApi.createPost({
        title: `I finished: ${completedWin.title}`,
        body: completedWin.microStep
          ? `I completed this goal. The small step that helped was: ${completedWin.microStep}`
          : "I completed this goal and wanted to share the win.",
        category: "Wins",
      });
      toast({ title: "Win shared", description: "It is now in Explore for reflections." });
      setCompletedWin(null);
    } catch (error) {
      toast({
        title: "Couldn't share win",
        description: error instanceof Error ? error.message : "Try again.",
        variant: "destructive",
      });
    } finally {
      setSharingWin(false);
    }
  };

  return (
    <div ref={elementRef} className="min-h-screen pb-12 bg-background overflow-y-auto">
      <PullToRefreshIndicator
        pullDistance={pullDistance}
        isRefreshing={isRefreshing}
        threshold={80}
      />
      <SwipeHint />
      {confettiOn && (
        <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden">
          {[...Array(30)].map((_, i) => (
            <span
              key={i}
              className="confetti-piece"
              style={{
                left: `${(i / 30) * 100}%`,
                animationDelay: `${(i % 10) * 60}ms`,
              }}
            >
              {["🎉", "✨", "🏆", "💫", "🌈"][i % 5]}
            </span>
          ))}
        </div>
      )}

      {completedWin && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/55 px-4 backdrop-blur-sm">
          <div className="relative w-full max-w-md overflow-hidden rounded-[2rem] border border-white/15 bg-background p-6 text-center shadow-strong">
            <div className="absolute -left-10 -top-10 h-32 w-32 rounded-full bg-amber-300/30 blur-2xl" />
            <div className="absolute -right-10 -bottom-10 h-32 w-32 rounded-full bg-sky-300/30 blur-2xl" />
            <div className="relative space-y-4">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-white text-3xl text-black shadow-soft">
                🏆
              </div>
              <div>
                <p className="eyebrow">Goal accomplished</p>
                <h2 className="mt-2 display-title text-[2.1rem] leading-tight text-foreground">You did it.</h2>
                <p className="mt-2 text-sm text-muted-foreground break-words">
                  {completedWin.title}
                </p>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button variant="outline" className="flex-1" onClick={() => setCompletedWin(null)} disabled={sharingWin}>
                  Keep private
                </Button>
                <Button className="flex-1" onClick={shareCompletedWin} disabled={sharingWin}>
                  {sharingWin ? "Sharing..." : "Share win"}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Sharing posts your win to Explore so others can reflect and learn from it.
              </p>
            </div>
          </div>
        </div>
      )}

      <header className="app-shell-header py-2 fixed top-0 left-0 right-0 z-40 h-[15vh] min-h-[72px] flex items-center px-3 sm:px-4">
        <div className="flex items-center justify-between h-full w-full max-w-4xl mx-auto">
          <Button
            variant="ghost"
            size="icon"
            aria-label="View goals list"
            onClick={() => handleButtonClick(() => setGoalsListOpen(true))}
            className="text-foreground hover:bg-white/[0.06] flex-shrink-0"
          >
            <List className="w-6 h-6" />
          </Button>
          <BrandWordmark compact className="flex-shrink-0 scale-90 sm:scale-100" />
          <div className="flex-shrink-0">
            <button
              onClick={() => handleButtonClick(() => navigate('/notifications'))}
              aria-label={`View alerts${alertCount > 0 ? ` (${alertCount})` : ''}`}
              className="relative p-2 hover:bg-white/[0.06] rounded-full transition"
            >
              <Bell className="w-6 h-6 text-foreground" />
              {alertCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center px-1 leading-none">
                  {alertCount > 9 ? '9+' : alertCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      <div className="flex flex-col items-center px-responsive pt-[15vh] gap-4 pb-24">
        {user?.role === 'parent' ? (
          <ParentTeensView />
        ) : (
          <>
            {isTeen && (
              <>
                <TeenHomeView
                  progress={progress}
                  attributes={attributes}
                  todayGoals={todayGoals}
                  primaryAction={teenHomeResolution.primaryAction}
                  onTinyClick={handleTinyClick}
                  onAddGoalClick={handleAddGoalClick}
                  onNewPost={() => setNewPostOpen(true)}
                />

                <TodayGoalsCard
                  todayGoals={todayGoals}
                  loading={goalsLoading}
                  primaryAction={teenHomeResolution.primaryAction}
                  onCheckin={handleTeenCheckin}
                  onRefresh={async () => {
                    await fetchUserData();
                    await fetchTodayGoals();
                  }}
                />

                <div className="w-full max-w-2xl px-4">
                  <div className="surface-panel p-4 sm:p-5 space-y-3 bg-white/[0.02]">
                    <div>
                      <p className="eyebrow">Rewards support the loop ✨</p>
                      <p className="text-sm text-muted-foreground mt-2 break-words">
                        These show what you earn by setting a goal, checking in, and showing up again.
                      </p>
                    </div>
                    <RewardsPanel />
                  </div>
                </div>
              </>
            )}

            {!isTeen && (
              <>
                <WelcomeSection
                  username={username}
                  profileImage={profileImage}
                  bio={bio}
                  lifetimeBadges={lifetimeBadges}
                />

                <TodayGoalsCard
                  todayGoals={todayGoals}
                  loading={goalsLoading}
                  primaryAction={teenHomeResolution.primaryAction}
                  onCheckin={handleCheckin}
                  onRefresh={async () => {
                    await fetchUserData();
                    await fetchTodayGoals();
                  }}
                />
              </>
            )}

            {isTeen && (
              <WelcomeSection
                username={username}
                profileImage={profileImage}
                bio={bio}
                lifetimeBadges={lifetimeBadges}
              />
            )}

            {needsOnboarding && (
              <div className="w-full max-w-2xl px-4">
                <div
                  id="setup-secondary-card"
                  data-testid="setup-secondary-card"
                  className="rounded-xl border border-dashed border-border bg-muted/20 px-3 py-3 sm:px-4"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <p className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                        Optional personalization
                      </p>
                      <h3 className="text-sm font-semibold text-foreground mt-1 break-words">Resume setup</h3>
                      <p className="text-xs text-muted-foreground mt-1 break-words">
                        Finish interests and your archetype later if you want more personalized suggestions.
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      onClick={() => handleButtonClick(() => navigate("/onboarding"))}
                      className="h-9 w-full sm:w-auto shrink-0 text-sm whitespace-normal"
                    >
                      Finish optional setup
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <Suspense fallback={null}>
        <SettingsModal open={settingsOpen} onOpenChange={setSettingsOpen} />
        {isTeen && (
          <>
            <GoalModal
              open={goalModalOpen}
              onOpenChange={setGoalModalOpen}
              suggestedGoals={(() => {
                const cached = queryClient.getQueryData<AiWrapperResponse>(TINY_ADVICE_KEY);
                if (cached?.suggestion) return [{ title: cached.suggestion }];
                return (cached as any)?.goals || [];
              })()}
              onCreateGoal={handleCreateGoalFromTiny}
            />
            <AddGoalModal
              open={addGoalOpen}
              onOpenChange={setAddGoalOpen}
              onGoalAdded={handleGoalAdded}
              initialTitle={addGoalInitialTitle}
              initialMicroStep={addGoalInitialMicroStep}
            />
            <GoalsListModal
              open={goalsListOpen}
              onOpenChange={setGoalsListOpen}
              onProgressUpdate={wrappedProgressUpdate}
            />
          </>
        )}
        <NewPostModal open={newPostOpen} onOpenChange={setNewPostOpen} />
      </Suspense>
    </div>
  );
};

export default IndexPage;
