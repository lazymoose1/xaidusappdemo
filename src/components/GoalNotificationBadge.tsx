import React, { useState, useEffect } from 'react';
import { Bell, AlertCircle } from 'lucide-react';
import { apiFetch } from '@/api/client';

interface NotificationBadge {
  due: number;
  overdue: number;
  atRisk: number;
}

interface GoalNotificationBadgeProps {
  onClick?: () => void;
  showLabel?: boolean;
}

export const GoalNotificationBadge: React.FC<GoalNotificationBadgeProps> = ({
  onClick,
  showLabel = false
}) => {
  const [badge, setBadge] = useState<NotificationBadge>({
    due: 0,
    overdue: 0,
    atRisk: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60000); // Poll every minute
    return () => clearInterval(interval);
  }, []);

  const fetchNotifications = async () => {
    try {
      // Fetch due reminders
      try {
        const data = await apiFetch<{ reminders?: unknown[] }>('/api/reminders/due');
        setBadge(prev => ({ ...prev, due: data.reminders?.length || 0 }));
      } catch { /* non-critical */ }

      // Fetch goals for deadline info
      try {
        const goals = (await apiFetch<{ id: string; completed?: boolean; targetDate?: string; progress?: number }[]>('/api/goals'));
        
        let overdue = 0;
        let atRisk = 0;

        goals.forEach((g: { completed?: boolean; targetDate?: string; progress?: number }) => {
          if (g.completed) return;
          if (!g.targetDate) return;

          const daysLeft = Math.ceil(
            (new Date(g.targetDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
          );

          if (daysLeft < 0) {
            overdue++;
          } else if (daysLeft < 3 || (g.progress ?? 100) < 50) {
            atRisk++;
          }
        });

        setBadge(prev => ({
          ...prev,
          overdue,
          atRisk
        }));
      } catch { /* non-critical */ }
    } catch (err) {
      console.error('Error fetching notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  const total = badge.due + badge.overdue + badge.atRisk;

  if (loading || total === 0) {
    return (
      <button
        onClick={onClick}
        aria-label="Reminders and notifications"
        className="relative p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
      >
        <Bell className="w-6 h-6 text-slate-700 dark:text-slate-300" />
        {showLabel && <span className="text-xs font-medium ml-1">Reminders</span>}
      </button>
    );
  }

  const alertLevel = badge.overdue > 0 ? 'critical' : badge.atRisk > 0 ? 'warning' : 'info';
  const bgColor = alertLevel === 'critical' ? 'bg-red-500' : alertLevel === 'warning' ? 'bg-amber-500' : 'bg-blue-500';
  const icon = alertLevel === 'critical' ? <AlertCircle className="w-4 h-4" /> : <Bell className="w-4 h-4" />;

  return (
    <button
      onClick={onClick}
      aria-label={`${total} notification${total > 1 ? 's' : ''}`}
      className="relative p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
    >
      <div className="relative">
        <Bell className="w-6 h-6 text-slate-700 dark:text-slate-300" />
        <span className={`absolute -top-1 -right-1 ${bgColor} text-white rounded-full w-5 h-5 text-xs font-bold flex items-center justify-center`}>
          {total > 9 ? '9+' : total}
        </span>
      </div>
      {showLabel && (
        <span className="text-xs font-medium ml-1">
          {total} new
        </span>
      )}
    </button>
  );
};

export default GoalNotificationBadge;
