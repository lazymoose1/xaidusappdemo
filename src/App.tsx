import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BrowserRouter, Routes, Route, useNavigate, useLocation } from "react-router-dom";
import { AppProviders } from "@/providers/AppProviders";
import { useSwipe } from "@/hooks/use-swipe";
import { lazy, Suspense, useEffect } from "react";
import { PageSkeleton } from "@/components/PageSkeleton";
import BottomNav from "./components/BottomNav";
import ProtectedRoute from "./components/ProtectedRoute";
import NotFound from "./pages/NotFound";

const Index = lazy(() => import("./pages/Index"));
const FeedsPage = lazy(() => import("./pages/FeedsPage"));
const PostDetailPage = lazy(() => import("./pages/PostDetailPage"));
const CommentsPage = lazy(() => import("./pages/CommentsPage"));
const ProfilePage = lazy(() => import("./pages/ProfilePage"));
const UsersListPage = lazy(() => import("./pages/UsersListPage"));
const ParentPortalPage = lazy(() => import("./pages/ParentPortalPage"));
const SearchPage = lazy(() => import("./pages/SearchPage"));
const MembersPage = lazy(() => import("./pages/MembersPage"));
const ForumsPage = lazy(() => import("./pages/ForumsPage"));
const ForumTopicPage = lazy(() => import("./pages/ForumTopicPage"));
const SettingsPage = lazy(() => import("./pages/SettingsPage"));
const MessagesPage = lazy(() => import("./pages/MessagesPage"));
const ThreadDetailPage = lazy(() => import("./pages/ThreadDetailPage"));
const ParentDashboard = lazy(() => import("./pages/ParentDashboard"));
const AuthPage = lazy(() => import("./pages/AuthPage"));
const ParentSignupPage = lazy(() => import("./pages/ParentSignupPage"));
const OnboardingPage = lazy(() => import("./pages/OnboardingPage"));
const ParentOnboardingPage = lazy(() => import("./pages/ParentOnboardingPage"));
const LeaderOnboardingPage = lazy(() => import("./pages/LeaderOnboardingPage"));
const ScoutOnboardingPage = lazy(() => import("./pages/ScoutOnboardingPage"));
const LeaderDashboardPage = lazy(() => import("./pages/LeaderDashboardPage"));
const ParentAuthPage = lazy(() => import("./pages/auth/ParentAuthPage"));
const LeaderAuthPage = lazy(() => import("./pages/auth/LeaderAuthPage"));
const LeaderSettingsPage = lazy(() => import("./pages/settings/LeaderSettingsPage"));
const ParentSettingsPage = lazy(() => import("./pages/settings/ParentSettingsPage"));
const NotificationsPage = lazy(() => import("./pages/NotificationsPage"));

// Keep swipe navigation aligned with the focused return loop.
const navOrder = ["/", "/notifications", "/settings"];

const AppContent = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const swipeRef = useSwipe<HTMLDivElement>({
    onSwipeLeft: () => {
      const currentIndex = navOrder.indexOf(location.pathname);
      if (currentIndex !== -1 && currentIndex < navOrder.length - 1) {
        navigate(navOrder[currentIndex + 1]);
      }
    },
    onSwipeRight: () => {
      const currentIndex = navOrder.indexOf(location.pathname);
      if (currentIndex > 0) {
        navigate(navOrder[currentIndex - 1]);
      }
    },
  }, {
    minSwipeDistance: 75,
    maxSwipeTime: 400,
  });

  useEffect(() => {
    if (swipeRef.current) {
      swipeRef.current.style.minHeight = '100vh';
    }
  }, []);

  return (
    <div ref={swipeRef} className="min-h-screen">
      {import.meta.env.VITE_DEMO_MODE === 'true' && (
        <div className="fixed top-0 left-0 right-0 z-[60] bg-amber-500 text-amber-950 text-center text-xs py-1 font-medium">
          Demo Mode — data is not saved
        </div>
      )}
      <Suspense fallback={<PageSkeleton />}>
        <Routes>
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/auth/parent" element={<ParentAuthPage />} />
          <Route path="/auth/leader" element={<LeaderAuthPage />} />
          <Route path="/parent-signup" element={<ParentSignupPage />} />
          <Route path="/onboarding" element={<ProtectedRoute><OnboardingPage /></ProtectedRoute>} />
          <Route path="/onboarding/parent" element={<ProtectedRoute><ParentOnboardingPage /></ProtectedRoute>} />
          <Route path="/onboarding/leader" element={<ProtectedRoute><LeaderOnboardingPage /></ProtectedRoute>} />
          <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
        <Route path="/feeds" element={<ProtectedRoute><FeedsPage /></ProtectedRoute>} />
        <Route path="/feeds/:id" element={<ProtectedRoute><PostDetailPage /></ProtectedRoute>} />
        <Route path="/feeds/:id/comments" element={<ProtectedRoute><CommentsPage /></ProtectedRoute>} />
        <Route path="/profile/:username" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
        <Route path="/users" element={<ProtectedRoute><UsersListPage /></ProtectedRoute>} />
        <Route path="/parent-portal" element={<ProtectedRoute><ParentPortalPage /></ProtectedRoute>} />
        <Route path="/search" element={<ProtectedRoute><SearchPage /></ProtectedRoute>} />
        <Route path="/members" element={<ProtectedRoute><MembersPage /></ProtectedRoute>} />
        <Route path="/forums" element={<ProtectedRoute><ForumsPage /></ProtectedRoute>} />
        <Route path="/forums/:topicId" element={<ProtectedRoute><ForumTopicPage /></ProtectedRoute>} />
        <Route path="/messages" element={<ProtectedRoute><MessagesPage /></ProtectedRoute>} />
        <Route path="/messages/:threadId" element={<ProtectedRoute><ThreadDetailPage /></ProtectedRoute>} />
        <Route path="/notifications" element={<ProtectedRoute><NotificationsPage /></ProtectedRoute>} />
        <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
        <Route path="/dashboard" element={<ProtectedRoute><ParentDashboard /></ProtectedRoute>} />
        <Route path="/scout-onboarding" element={<ProtectedRoute><ScoutOnboardingPage /></ProtectedRoute>} />
        <Route path="/leader" element={<ProtectedRoute><LeaderDashboardPage /></ProtectedRoute>} />
        <Route path="/settings/leader" element={<ProtectedRoute><LeaderSettingsPage /></ProtectedRoute>} />
        <Route path="/settings/parent" element={<ProtectedRoute><ParentSettingsPage /></ProtectedRoute>} />
        <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
      {!location.pathname.startsWith('/auth') && location.pathname !== '/parent-signup' && !location.pathname.startsWith('/onboarding') && location.pathname !== '/scout-onboarding' && location.pathname !== '/leader' && (
        <BottomNav />
      )}
    </div>
  );
};

const App = () => (
  <AppProviders>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </TooltipProvider>
  </AppProviders>
);

export default App;
