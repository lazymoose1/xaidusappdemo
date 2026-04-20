import React, { useEffect, useState } from 'react';
import { ParentGoalReviewModal } from './ParentGoalReviewModal';
import { toast } from './ui/use-toast';
import { Button } from './ui/button';

interface DashboardSummary {
  totalChildren: number;
  totalGoals: number;
  completedGoals: number;
  aiSuggestedGoals: number;
  averageProgress: number;
  byArchetype: Record<string, number>;
}

interface ParentDashboardComponentProps {
  onNavigate?: (page: string) => void;
}

export const ParentDashboardComponent: React.FC<ParentDashboardComponentProps> = ({
  onNavigate
}) => {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/parent/dashboard', {
        method: 'GET',
        credentials: 'include'
      });

      if (res.ok) {
        const data = await res.json();
        setSummary(data);
      } else {
        toast({
          title: 'Failed to load dashboard',
          description: 'Please try again.',
          variant: 'destructive'
        });
      }
    } catch (err) {
      console.error('Error loading dashboard:', err);
      toast({
        title: 'Error',
        description: 'Failed to load dashboard data.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className="sticky top-0 bg-white dark:bg-slate-900 z-10 p-4 border-b border-slate-200 dark:border-slate-700">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
          Parent Dashboard
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
          Monitor your teens' progress and AI coaching insights
        </p>
      </div>

      {/* Content */}
      <div className="px-4">
        {loading ? (
          <div className="text-center py-8">
            <p className="text-slate-600 dark:text-slate-400">Loading...</p>
          </div>
        ) : summary ? (
          <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-lg p-4 border border-blue-200 dark:border-blue-700">
                <p className="text-xs font-medium text-blue-600 dark:text-blue-400 uppercase">
                  Teens
                </p>
                <p className="text-2xl font-bold text-blue-900 dark:text-blue-100 mt-1">
                  {summary.totalChildren}
                </p>
              </div>

              <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 rounded-lg p-4 border border-purple-200 dark:border-purple-700">
                <p className="text-xs font-medium text-purple-600 dark:text-purple-400 uppercase">
                  Total Goals
                </p>
                <p className="text-2xl font-bold text-purple-900 dark:text-purple-100 mt-1">
                  {summary.totalGoals}
                </p>
              </div>

              <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-lg p-4 border border-green-200 dark:border-green-700">
                <p className="text-xs font-medium text-green-600 dark:text-green-400 uppercase">
                  Completed
                </p>
                <p className="text-2xl font-bold text-green-900 dark:text-green-100 mt-1">
                  {summary.completedGoals}
                </p>
                <p className="text-xs text-green-700 dark:text-green-300 mt-1">
                  {summary.totalGoals > 0
                    ? Math.round((summary.completedGoals / summary.totalGoals) * 100)
                    : 0}
                  % completion rate
                </p>
              </div>

              <div className="bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-900/20 dark:to-amber-800/20 rounded-lg p-4 border border-amber-200 dark:border-amber-700">
                <p className="text-xs font-medium text-amber-600 dark:text-amber-400 uppercase">
                  AI Suggested
                </p>
                <p className="text-2xl font-bold text-amber-900 dark:text-amber-100 mt-1">
                  {summary.aiSuggestedGoals}
                </p>
              </div>
            </div>

            {/* Average Progress */}
            <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
              <p className="text-sm font-semibold text-slate-900 dark:text-white mb-3">
                Average Progress Across All Goals
              </p>
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-3">
                    <div
                      className="bg-gradient-to-r from-blue-500 to-purple-500 h-3 rounded-full transition-all"
                      style={{ width: `${summary.averageProgress}%` }}
                    />
                  </div>
                </div>
                <span className="text-lg font-bold text-slate-900 dark:text-white w-12">
                  {summary.averageProgress}%
                </span>
              </div>
            </div>

            {/* Archetypes Distribution */}
            {Object.keys(summary.byArchetype).length > 0 && (
              <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
                <p className="text-sm font-semibold text-slate-900 dark:text-white mb-4">
                  Teen Archetypes
                </p>
                <div className="space-y-2">
                  {Object.entries(summary.byArchetype).map(([archetype, count]) => (
                    <div key={archetype} className="flex items-center justify-between">
                      <span className="text-sm text-slate-600 dark:text-slate-400 capitalize">
                        {archetype}
                      </span>
                      <span className="bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white px-2 py-1 rounded text-sm font-medium">
                        {count} {count === 1 ? 'teen' : 'teens'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* AI Review Section */}
            <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 dark:from-indigo-900/20 dark:to-indigo-800/20 rounded-lg p-4 border border-indigo-200 dark:border-indigo-700">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-semibold text-indigo-900 dark:text-indigo-100">
                    TINY AI Coaching
                  </p>
                  <p className="text-xs text-indigo-700 dark:text-indigo-300 mt-1">
                    Review and provide feedback on AI-suggested goals
                  </p>
                </div>
              </div>
              <Button
                onClick={() => setReviewModalOpen(true)}
                className="w-full mt-4 bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                Review Suggestions
              </Button>
            </div>

            {/* Refresh Button */}
            <Button
              onClick={loadDashboard}
              variant="outline"
              className="w-full"
            >
              Refresh Dashboard
            </Button>
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-slate-600 dark:text-slate-400">
              No data available. Please try again.
            </p>
          </div>
        )}
      </div>

      {/* Parent Goal Review Modal */}
      <ParentGoalReviewModal
        isOpen={reviewModalOpen}
        onClose={() => setReviewModalOpen(false)}
        onRefresh={loadDashboard}
      />
    </div>
  );
};

export default ParentDashboardComponent;
