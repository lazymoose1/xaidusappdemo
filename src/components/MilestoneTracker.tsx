import React, { useState } from 'react';
import { toast } from './ui/use-toast';

interface Milestone {
  title: string;
  target?: string;
  completed?: boolean;
  completedAt?: string;
}

interface MilestoneTrackerProps {
  goalId: string;
  milestones: Milestone[];
  onMilestoneComplete?: (index: number, milestone: Milestone) => void;
  isAISourced?: boolean;
}

export const MilestoneTracker: React.FC<MilestoneTrackerProps> = ({
  goalId,
  milestones,
  onMilestoneComplete,
  isAISourced
}) => {
  const [loading, setLoading] = useState<number | null>(null);

  const handleMarkComplete = async (index: number) => {
    try {
      setLoading(index);
      const res = await fetch(`/api/goals/${goalId}/milestones/${index}/complete`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' }
      });

      if (res.ok) {
        const updated = await res.json();
        onMilestoneComplete?.(index, milestones[index]);

        // Calculate progress percentage from response
        const progressPercentage = updated.progress || 0;
        const allCompleted = progressPercentage === 100;

        if (isAISourced) {
          if (allCompleted) {
            toast({
              title: '🎉 Goal Complete!',
              description: `TINY learned from your success and will refine future suggestions. Great work!`,
              variant: 'default'
            });
          } else {
            toast({
              title: '✨ Great progress!',
              description: `TINY is learning from your success (${progressPercentage}% complete).`,
              variant: 'default'
            });
          }
        } else {
          if (allCompleted) {
            toast({
              title: '🎉 Goal Complete!',
              description: 'You did it! All milestones are done.',
              variant: 'default'
            });
          } else {
            toast({
              title: '✅ Milestone completed!',
              description: `You're ${progressPercentage}% done with this goal. Keep going!`,
              variant: 'default'
            });
          }
        }
      } else {
        toast({
          title: 'Failed to update milestone',
          description: 'Please try again.',
          variant: 'destructive'
        });
      }
    } catch (err) {
      console.error('Error marking milestone complete:', err);
      toast({
        title: 'Error',
        description: 'Failed to update milestone.',
        variant: 'destructive'
      });
    } finally {
      setLoading(null);
    }
  };

  if (!milestones || milestones.length === 0) {
    return (
      <div className="text-center py-4 text-sm text-slate-500 dark:text-slate-400">
        No milestones yet. Add some to track your progress!
      </div>
    );
  }

  const completedCount = milestones.filter(m => m.completed).length;
  const progressPercent = Math.round((completedCount / milestones.length) * 100);

  return (
    <div className="space-y-3">
      {/* Progress Bar */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            Milestones Progress
          </p>
          <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
            {completedCount}/{milestones.length} ({progressPercent}%)
          </span>
        </div>
        <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
          <div
            className="bg-gradient-to-r from-green-400 to-green-500 h-2 rounded-full transition-all"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Milestones List */}
      <div className="space-y-2">
        {milestones.map((milestone, index) => (
          <div
            key={index}
            className={`p-3 rounded-lg border transition-all ${
              milestone.completed
                ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700'
                : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700'
            }`}
          >
            <div className="flex items-start gap-3">
              <button
                onClick={() => handleMarkComplete(index)}
                disabled={loading === index || milestone.completed}
                className={`flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                  milestone.completed
                    ? 'bg-green-500 border-green-500'
                    : 'border-slate-300 dark:border-slate-600 hover:border-green-400 dark:hover:border-green-500 cursor-pointer'
                }`}
              >
                {milestone.completed && (
                  <span className="text-white font-bold">✓</span>
                )}
                {loading === index && !milestone.completed && (
                  <span className="text-xs text-slate-400">...</span>
                )}
              </button>

              <div className="flex-1 min-w-0">
                <p
                  className={`text-sm font-medium transition-all ${
                    milestone.completed
                      ? 'text-green-700 dark:text-green-300 line-through'
                      : 'text-slate-900 dark:text-white'
                  }`}
                >
                  {milestone.title}
                </p>
                {milestone.target && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Target: {milestone.target}
                  </p>
                )}
                {milestone.completedAt && (
                  <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                    ✓ Completed {new Date(milestone.completedAt).toLocaleDateString()}
                  </p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* AI Sourced Badge */}
      {isAISourced && completedCount > 0 && (
        <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg">
          <p className="text-xs text-amber-800 dark:text-amber-200">
            💡 TINY is learning from your progress! Each completed milestone helps refine future suggestions.
          </p>
        </div>
      )}
    </div>
  );
};

export default MilestoneTracker;
