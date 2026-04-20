import { Loader2, ArrowDown } from "lucide-react";

interface PullToRefreshIndicatorProps {
  pullDistance: number;
  isRefreshing: boolean;
  threshold?: number;
}

/**
 * Visual indicator for pull-to-refresh gesture
 * Shows progress and loading state
 */
const PullToRefreshIndicator = ({
  pullDistance,
  isRefreshing,
  threshold = 80,
}: PullToRefreshIndicatorProps) => {
  const progress = Math.min((pullDistance / threshold) * 100, 100);
  const shouldShow = pullDistance > 0 || isRefreshing;

  if (!shouldShow) return null;

  return (
    <div
      className="fixed top-0 left-0 right-0 z-40 flex items-center justify-center bg-primary/80 backdrop-blur-sm transition-all duration-200"
      style={{
        height: `${Math.min(pullDistance, threshold * 1.2)}px`,
        opacity: isRefreshing ? 1 : Math.min(pullDistance / threshold, 1),
      }}
    >
      <div className="flex flex-col items-center gap-1">
        {isRefreshing ? (
          <Loader2 className="w-6 h-6 text-accent animate-spin" />
        ) : (
          <ArrowDown
            className="w-6 h-6 text-accent transition-transform duration-200"
            style={{
              transform: `rotate(${progress >= 100 ? 180 : 0}deg)`,
            }}
          />
        )}
        <span className="text-xs text-accent font-medium">
          {isRefreshing
            ? 'Refreshing...'
            : progress >= 100
            ? 'Release to refresh'
            : 'Pull to refresh'}
        </span>
      </div>
    </div>
  );
};

export default PullToRefreshIndicator;
