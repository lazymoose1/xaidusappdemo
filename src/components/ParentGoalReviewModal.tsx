import React, { useEffect, useState } from 'react';
import { toast } from './ui/use-toast';
import { Button } from './ui/button';

interface AIGoal {
  id: string;
  userId: string;
  title: string;
  category: string;
  suggestionTitle?: string;
  progress: number;
  completed: boolean;
  milestones: { title: string; target: string; completed?: boolean }[];
  adoptedAt: string;
  feedback?: {
    parentReviewed: boolean;
    parentFeedback?: string;
    parentSuggestedMilestones?: { title: string; target: string }[];
    parentEncouragement?: string;
  };
}

interface ParentGoalReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRefresh?: () => void;
}

export const ParentGoalReviewModal: React.FC<ParentGoalReviewModalProps> = ({
  isOpen,
  onClose,
  onRefresh
}) => {
  const [goals, setGoals] = useState<AIGoal[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<AIGoal | null>(null);
  const [feedback, setFeedback] = useState('');
  const [encouragement, setEncouragement] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadAIGoals();
    }
  }, [isOpen]);

  const loadAIGoals = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/parent/ai-suggested-goals', {
        method: 'GET',
        credentials: 'include'
      });

      if (res.ok) {
        const data = await res.json();
        setGoals(data.goals || []);
      } else {
        toast({
          title: 'Failed to load AI goals',
          description: 'Please try again.',
          variant: 'destructive'
        });
      }
    } catch (err) {
      console.error('Error loading AI goals:', err);
      toast({
        title: 'Error',
        description: 'Failed to load AI suggestions.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitFeedback = async () => {
    if (!selectedGoal) return;

    try {
      setSubmitting(true);
      const res = await fetch(
        `/api/parent/children/${selectedGoal.userId}/goals/${selectedGoal.id}/feedback`,
        {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            feedback,
            encouragement,
            suggestedMilestones: []
          })
        }
      );

      if (res.ok) {
        toast({
          title: 'Feedback sent!',
          description: 'Your feedback has been recorded.',
          variant: 'default'
        });
        setFeedback('');
        setEncouragement('');
        setSelectedGoal(null);
        loadAIGoals();
        onRefresh?.();
      } else {
        toast({
          title: 'Failed to submit feedback',
          description: 'Please try again.',
          variant: 'destructive'
        });
      }
    } catch (err) {
      console.error('Error submitting feedback:', err);
      toast({
        title: 'Error',
        description: 'Failed to submit feedback.',
        variant: 'destructive'
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end">
      <div className="w-full bg-white dark:bg-slate-900 rounded-t-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold">AI-Suggested Goals</h2>
            <button
              onClick={onClose}
              className="text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
            >
              ✕
            </button>
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            Review and provide feedback on TINY's suggestions
          </p>
        </div>

        {/* Content */}
        <div className="p-4 pb-20">
          {loading ? (
            <div className="text-center py-8">
              <p className="text-slate-600 dark:text-slate-400">Loading...</p>
            </div>
          ) : selectedGoal ? (
            // Feedback Form
            <div className="space-y-4">
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white">
                  {selectedGoal.title}
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                  Category: {selectedGoal.category}
                </p>
                {selectedGoal.suggestionTitle && (
                  <p className="text-sm text-slate-500 dark:text-slate-500 italic mt-2">
                    Based on: {selectedGoal.suggestionTitle}
                  </p>
                )}
              </div>

              <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-lg">
                <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Progress: {selectedGoal.progress}%
                </p>
                <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                  <div
                    className="bg-blue-500 h-2 rounded-full transition-all"
                    style={{ width: `${selectedGoal.progress}%` }}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Your Feedback
                </label>
                <textarea
                  value={feedback}
                  onChange={e => setFeedback(e.target.value)}
                  placeholder="E.g., Great goal! Keep up the momentum with daily check-ins."
                  className="w-full border border-slate-200 dark:border-slate-700 rounded-lg p-3 text-sm dark:bg-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={4}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Encouragement (optional)
                </label>
                <textarea
                  value={encouragement}
                  onChange={e => setEncouragement(e.target.value)}
                  placeholder="E.g., I'm proud of your commitment to fitness!"
                  className="w-full border border-slate-200 dark:border-slate-700 rounded-lg p-3 text-sm dark:bg-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                />
              </div>

              <div className="flex gap-2 pt-4">
                <Button
                  onClick={() => {
                    setSelectedGoal(null);
                    setFeedback('');
                    setEncouragement('');
                  }}
                  variant="outline"
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSubmitFeedback}
                  disabled={submitting}
                  className="flex-1 bg-blue-500 hover:bg-blue-600 text-white"
                >
                  {submitting ? 'Sending...' : 'Send Feedback'}
                </Button>
              </div>
            </div>
          ) : goals.length > 0 ? (
            // Goals List
            <div className="space-y-3">
              {goals.map(goal => (
                <div
                  key={goal.id}
                  className="border border-slate-200 dark:border-slate-700 rounded-lg p-4 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <h4 className="font-semibold text-slate-900 dark:text-white">
                        {goal.title}
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        {goal.category}
                        {goal.completed && ' • ✓ Completed'}
                        {goal.feedback?.parentReviewed && ' • Reviewed'}
                      </p>
                    </div>
                    {!goal.feedback?.parentReviewed && (
                      <span className="bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200 text-xs font-medium px-2 py-1 rounded">
                        Needs Review
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 mb-3">
                    <div className="flex-1">
                      <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-1.5">
                        <div
                          className="bg-blue-500 h-1.5 rounded-full"
                          style={{ width: `${goal.progress}%` }}
                        />
                      </div>
                    </div>
                    <span className="text-xs font-medium text-slate-600 dark:text-slate-400 w-8">
                      {goal.progress}%
                    </span>
                  </div>

                  <Button
                    onClick={() => setSelectedGoal(goal)}
                    size="sm"
                    className="w-full bg-blue-500 hover:bg-blue-600 text-white"
                  >
                    Provide Feedback
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-slate-600 dark:text-slate-400">
                No AI-suggested goals yet. Check back soon!
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ParentGoalReviewModal;
