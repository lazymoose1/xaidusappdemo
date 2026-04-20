import React, { useState, useEffect } from 'react';
import { AlertCircle, Clock, TrendingDown, CheckCircle2 } from 'lucide-react';
import { toast } from './ui/use-toast';

interface GoalDeadline {
  id: string;
  title: string;
  targetDate?: string;
  progress: number;
  completed: boolean;
  status: 'on-track' | 'at-risk' | 'overdue';
  daysUntilDeadline: number;
  isAISourced?: boolean;
  category?: string;
}

interface DeadlineTrackerProps {
  goals?: GoalDeadline[];
  onGoalClick?: (goalId: string) => void;
  compact?: boolean;
}

export const DeadlineTracker: React.FC<DeadlineTrackerProps> = ({
  goals = [],
  onGoalClick,
  compact = false
}) => {
  const [deadlineGoals, setDeadlineGoals] = useState<GoalDeadline[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (goals && goals.length > 0) {
      setDeadlineGoals(goals);
      setLoading(false);
    } else {
      fetchDeadlineGoals();
    }
  }, [goals]);

  const fetchDeadlineGoals = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/goals', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        // Filter and sort by urgency
        const processed = (data.goals || [])
          .map((g: { id: string; title: string; targetDate?: string; progress: number; completed: boolean; source?: string; category?: string }) => ({
            id: g.id,
            title: g.title,
            targetDate: g.targetDate,
            progress: g.progress,
            completed: g.completed,
            isAISourced: g.source === 'ai',
            category: g.category,
            status: calculateStatus(g),
            daysUntilDeadline: calculateDaysUntilDeadline(g.targetDate)
          }))
          .filter((g: GoalDeadline) => g.targetDate && !g.completed)
          .sort((a: GoalDeadline, b: GoalDeadline) => a.daysUntilDeadline - b.daysUntilDeadline);
        
        setDeadlineGoals(processed);
      }
    } catch (err) {
      console.error('Error fetching goals:', err);
    } finally {
      setLoading(false);
    }
  };

  const calculateStatus = (goal: { targetDate?: string; progress: number }): 'on-track' | 'at-risk' | 'overdue' => {
    if (!goal.targetDate) return 'on-track';
    const daysLeft = calculateDaysUntilDeadline(goal.targetDate);
    if (daysLeft < 0) return 'overdue';
    if (daysLeft < 3 || goal.progress < 50) return 'at-risk';
    return 'on-track';
  };

  const calculateDaysUntilDeadline = (targetDate?: string): number => {
    if (!targetDate) return Infinity;
    const target = new Date(targetDate).getTime();
    const now = new Date().getTime();
    return Math.ceil((target - now) / (1000 * 60 * 60 * 24));
  };

  const overdue = deadlineGoals.filter(g => g.status === 'overdue');
  const atRisk = deadlineGoals.filter(g => g.status === 'at-risk');
  const onTrack = deadlineGoals.filter(g => g.status === 'on-track');

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-blue-600"></div>
      </div>
    );
  }

  if (deadlineGoals.length === 0) {
    return null;
  }

  if (compact) {
    return (
      <div className="space-y-2">
        {overdue.length > 0 && (
          <DeadlineAlert
            count={overdue.length}
            type="overdue"
            goals={overdue}
            onGoalClick={onGoalClick}
          />
        )}
        {atRisk.length > 0 && (
          <DeadlineAlert
            count={atRisk.length}
            type="at-risk"
            goals={atRisk}
            onGoalClick={onGoalClick}
          />
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {overdue.length > 0 && (
        <DeadlineSection
          title="Overdue"
          goals={overdue}
          type="overdue"
          onGoalClick={onGoalClick}
        />
      )}
      {atRisk.length > 0 && (
        <DeadlineSection
          title="At Risk"
          goals={atRisk}
          type="at-risk"
          onGoalClick={onGoalClick}
        />
      )}
      {onTrack.length > 0 && (
        <DeadlineSection
          title="On Track"
          goals={onTrack}
          type="on-track"
          onGoalClick={onGoalClick}
        />
      )}
    </div>
  );
};

interface DeadlineAlertProps {
  count: number;
  type: 'overdue' | 'at-risk';
  goals: GoalDeadline[];
  onGoalClick?: (goalId: string) => void;
}

const DeadlineAlert: React.FC<DeadlineAlertProps> = ({
  count,
  type,
  goals,
  onGoalClick
}) => {
  const [expanded, setExpanded] = useState(type === 'overdue');

  const typeConfig = {
    overdue: {
      icon: AlertCircle,
      bg: 'bg-red-50 dark:bg-red-950',
      border: 'border-red-200 dark:border-red-800',
      text: 'text-red-900 dark:text-red-100',
      title: 'Overdue Goals',
      badge: 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200'
    },
    'at-risk': {
      icon: TrendingDown,
      bg: 'bg-amber-50 dark:bg-amber-950',
      border: 'border-amber-200 dark:border-amber-800',
      text: 'text-amber-900 dark:text-amber-100',
      title: 'Goals At Risk',
      badge: 'bg-amber-100 dark:bg-amber-900 text-amber-800 dark:text-amber-200'
    }
  };

  const config = typeConfig[type];
  const Icon = config.icon;

  return (
    <div className={`rounded-lg border ${config.border} ${config.bg} p-3`}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between"
      >
        <div className="flex items-center gap-2">
          <Icon className="w-5 h-5 flex-shrink-0" />
          <span className={`font-semibold text-sm ${config.text}`}>{config.title}</span>
          <span className={`px-2 py-1 rounded-full text-xs font-semibold ${config.badge}`}>
            {count}
          </span>
        </div>
        <span className={`text-lg transition ${expanded ? 'rotate-180' : ''}`}>
          ▼
        </span>
      </button>

      {expanded && (
        <div className="mt-3 space-y-2 border-t border-inherit pt-3">
          {goals.slice(0, 3).map((goal) => (
            <div
              key={goal.id}
              onClick={() => onGoalClick?.(goal.id)}
              className="p-2 bg-white dark:bg-slate-800 rounded cursor-pointer hover:shadow-md transition"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="font-medium text-sm text-slate-900 dark:text-white">
                    {goal.title}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="flex-1 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500"
                        style={{ width: `${goal.progress}%` }}
                      />
                    </div>
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      {goal.progress}%
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
          {count > 3 && (
            <p className="text-xs text-slate-600 dark:text-slate-400 text-center py-2">
              +{count - 3} more
            </p>
          )}
        </div>
      )}
    </div>
  );
};

interface DeadlineSectionProps {
  title: string;
  goals: GoalDeadline[];
  type: 'overdue' | 'at-risk' | 'on-track';
  onGoalClick?: (goalId: string) => void;
}

const DeadlineSection: React.FC<DeadlineSectionProps> = ({
  title,
  goals,
  type,
  onGoalClick
}) => {
  const typeConfig = {
    overdue: {
      icon: AlertCircle,
      iconColor: 'text-red-600 dark:text-red-400',
      progressColor: 'bg-red-500',
      bgRow: 'hover:bg-red-50 dark:hover:bg-red-950'
    },
    'at-risk': {
      icon: TrendingDown,
      iconColor: 'text-amber-600 dark:text-amber-400',
      progressColor: 'bg-amber-500',
      bgRow: 'hover:bg-amber-50 dark:hover:bg-amber-950'
    },
    'on-track': {
      icon: Clock,
      iconColor: 'text-blue-600 dark:text-blue-400',
      progressColor: 'bg-blue-500',
      bgRow: 'hover:bg-blue-50 dark:hover:bg-blue-950'
    }
  };

  const config = typeConfig[type];
  const Icon = config.icon;

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700 flex items-center gap-2">
        <Icon className={`w-5 h-5 ${config.iconColor}`} />
        <h3 className="font-semibold text-slate-900 dark:text-white">
          {title} ({goals.length})
        </h3>
      </div>

      <div className="divide-y divide-slate-200 dark:divide-slate-700">
        {goals.map((goal) => (
          <div
            key={goal.id}
            onClick={() => onGoalClick?.(goal.id)}
            className={`p-4 cursor-pointer transition ${config.bgRow}`}
          >
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className="font-medium text-slate-900 dark:text-white truncate">
                    {goal.title}
                  </h4>
                  {goal.isAISourced && (
                    <span className="px-2 py-0.5 bg-amber-100 dark:bg-amber-900 text-amber-800 dark:text-amber-200 rounded text-xs font-semibold flex-shrink-0">
                      TINY
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  {goal.category}
                </p>
              </div>
              <div className="text-right ml-4 flex-shrink-0">
                {goal.daysUntilDeadline < 0 ? (
                  <p className="text-xs font-semibold text-red-600 dark:text-red-400">
                    {Math.abs(goal.daysUntilDeadline)} days overdue
                  </p>
                ) : (
                  <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                    {goal.daysUntilDeadline} days left
                  </p>
                )}
              </div>
            </div>

            {/* Progress Bar */}
            <div className="flex items-center gap-3">
              <div className="flex-1 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                <div
                  className={config.progressColor}
                  style={{ width: `${goal.progress}%` }}
                />
              </div>
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-300 min-w-[2.5rem]">
                {goal.progress}%
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DeadlineTracker;
