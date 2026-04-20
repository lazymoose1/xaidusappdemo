import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

/**
 * Animated hint component that educates users about swipe navigation
 * Shows on first visit and fades out after a few seconds
 */
const SwipeHint = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [hasSeenHint, setHasSeenHint] = useState(false);

  useEffect(() => {
    // Check if user has seen the hint before
    const seen = sessionStorage.getItem('swipeHintSeen');
    
    if (!seen) {
      // Show hint after a short delay
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 1000);

      // Hide hint after 4 seconds
      const hideTimer = setTimeout(() => {
        setIsVisible(false);
        sessionStorage.setItem('swipeHintSeen', 'true');
        setHasSeenHint(true);
      }, 5000);

      return () => {
        clearTimeout(timer);
        clearTimeout(hideTimer);
      };
    } else {
      setHasSeenHint(true);
    }
  }, []);

  // Don't render if user has seen the hint
  if (hasSeenHint) return null;

  return (
    <div
      className={`fixed bottom-20 left-0 right-0 z-50 flex items-center justify-center pointer-events-none transition-all duration-500 ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
      }`}
    >
      <div className="bg-accent/95 text-accent-foreground px-6 py-3 rounded-full shadow-medium flex items-center gap-3 backdrop-blur-sm">
        <ChevronLeft className="w-5 h-5 animate-[slide-in-right_1s_ease-in-out_infinite]" />
        <span className="text-sm font-medium">Swipe to navigate</span>
        <ChevronRight className="w-5 h-5 animate-[slide-out-right_1s_ease-in-out_infinite]" />
      </div>
    </div>
  );
};

export default SwipeHint;
