import React, { useState, useEffect } from 'react';
import { toast } from './ui/use-toast';
import { Clock, CheckCircle, AlertCircle, Sparkles, X } from 'lucide-react';
import { apiFetch } from '@/api/client';

interface ReminderSchedule {
  goalId: string;
  userId: string;
  goalTitle: string;
  nextReminderAt: string;
  cadence: {
    frequency: 'daily' | 'every-2-days' | 'every-3-days' | 'weekly' | 'bi-weekly';
    preferredTime: string;
    reasoning: string;
    confidence: number;
  };
  lastReminderAt?: string;
  remindersSent: number;
  isAISourced?: boolean;
}

interface ReminderListResponse {
  reminders?: ReminderSchedule[];
}

interface RemindersModalProps {
  isOpen: boolean;
  onClose: () => void;
  goalId?: string;
}

const frequencyLabels: Record<string, string> = {
  'daily': 'Every day',
  'every-2-days': 'Every 2 days',
  'every-3-days': 'Every 3 days',
  'weekly': 'Weekly',
  'bi-weekly': 'Every 2 weeks'
};

const frequencyColors: Record<string, string> = {
  'daily': 'bg-red-50 text-red-700 border-red-200',
  'every-2-days': 'bg-orange-50 text-orange-700 border-orange-200',
  'every-3-days': 'bg-yellow-50 text-yellow-700 border-yellow-200',
  'weekly': 'bg-blue-50 text-blue-700 border-blue-200',
  'bi-weekly': 'bg-slate-50 text-slate-700 border-slate-200'
};

export const RemindersModal: React.FC<RemindersModalProps> = ({
  isOpen,
  onClose,
  goalId
}) => {
  const [reminders, setReminders] = useState<ReminderSchedule[]>([]);
  const [dueReminders, setDueReminders] = useState<ReminderSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'due' | 'all'>('due');

  useEffect(() => {
    if (isOpen) {
      fetchReminders();
    }
  }, [isOpen]);

  const fetchReminders = async () => {
    try {
      setLoading(true);
      const qs = goalId ? `?goalId=${encodeURIComponent(goalId)}` : '';
      const data = await apiFetch<ReminderListResponse>(`/api/reminders${qs}`);
      setReminders(data.reminders || []);

      const dueData = await apiFetch<ReminderListResponse>('/api/reminders/due');
      setDueReminders(dueData.reminders || []);
    } catch (err) {
      console.error('Error fetching reminders:', err);
      toast({
        title: 'Error',
        description: 'Failed to fetch reminders',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleReminderResponse = async (goalId: string, response: 'completed' | 'ignored' | 'snoozed') => {
    try {
      await apiFetch(`/api/reminders/${goalId}/respond`, {
        method: 'POST',
        body: JSON.stringify({ response })
      });
      toast({
        title: response === 'completed' ? '✅ Great work!' : response === 'snoozed' ? '⏰ Snoozed' : '👋 Noted',
        description: response === 'completed' 
          ? `Reminder helps TINY learn your pace`
          : response === 'snoozed'
          ? `We'll remind you later`
          : `We'll adjust future reminders`,
        variant: 'default'
      });
      await fetchReminders();
    } catch (err) {
      console.error('Error recording reminder response:', err);
      toast({
        title: 'Error',
        description: 'Failed to record response',
        variant: 'destructive'
      });
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = date.getTime() - now.getTime();
    const diffMins = Math.round(diffMs / 60000);
    const diffHours = Math.round(diffMs / 3600000);
    const diffDays = Math.round(diffMs / 86400000);

    if (diffMins < 0) {
      return 'Overdue';
    } else if (diffMins < 60) {
      return `In ${diffMins} mins`;
    } else if (diffHours < 24) {
      return `In ${diffHours}h`;
    } else if (diffDays < 7) {
      return `In ${diffDays} days`;
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  };

  const displayReminders = activeTab === 'due' ? dueReminders : reminders;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end z-50 sm:items-center sm:justify-center overflow-hidden">
      <div className="bg-white dark:bg-slate-900 rounded-t-2xl sm:rounded-2xl w-full sm:max-w-lg max-h-[90vh] flex flex-col shadow-2xl animate-in slide-in-from-bottom-10 sm:slide-in-from-center overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-slate-200 dark:border-slate-700 flex-shrink-0">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <h2 className="text-lg sm:text-xl font-bold">Reminders</h2>
            {dueReminders.length > 0 && (
              <span className="ml-2 px-2 py-1 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-200 rounded-full text-xs font-semibold">
                {dueReminders.length}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 px-4 sm:px-6 pt-4 border-b border-slate-200 dark:border-slate-700 flex-shrink-0">
          <button
            onClick={() => setActiveTab('due')}
            className={`px-4 py-2 font-medium text-sm transition rounded-lg ${
              activeTab === 'due'
                ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            Due ({dueReminders.length})
          </button>
          <button
            onClick={() => setActiveTab('all')}
            className={`px-4 py-2 font-medium text-sm transition rounded-lg ${
              activeTab === 'all'
                ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            All ({reminders.length})
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-blue-600 dark:border-blue-400"></div>
            </div>
          ) : displayReminders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center px-4">
              <CheckCircle className="w-12 h-12 text-green-500 mb-3" />
              <p className="font-semibold text-slate-900 dark:text-white">
                {activeTab === 'due' ? 'All caught up!' : 'No reminders yet'}
              </p>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                {activeTab === 'due' 
                  ? 'You have no reminders due right now.' 
                  : 'Reminders will appear as you set goal milestones.'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-200 dark:divide-slate-700">
              {displayReminders.map((reminder) => (
                <ReminderCard
                  key={reminder.goalId}
                  reminder={reminder}
                  isDue={activeTab === 'due' || dueReminders.some(r => r.goalId === reminder.goalId)}
                  onResponse={handleReminderResponse}
                  formatDate={formatDate}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

interface ReminderCardProps {
  reminder: ReminderSchedule;
  isDue: boolean;
  onResponse: (goalId: string, response: 'completed' | 'ignored' | 'snoozed') => void;
  formatDate: (dateString: string) => string;
}

const ReminderCard: React.FC<ReminderCardProps> = ({
  reminder,
  isDue,
  onResponse,
  formatDate
}) => {
  const [responding, setResponding] = useState(false);

  const handleResponse = async (response: 'completed' | 'ignored' | 'snoozed') => {
    setResponding(true);
    await onResponse(reminder.goalId, response);
    setResponding(false);
  };

  const frequency = reminder.cadence.frequency as keyof typeof frequencyLabels;
  const frequencyLabel = frequencyLabels[frequency] || frequency;
  const frequencyColor = frequencyColors[frequency] || 'bg-slate-50 text-slate-700 border-slate-200';

  return (
    <div className={`p-4 sm:p-5 transition ${isDue ? 'bg-amber-50 dark:bg-amber-950 border-l-4 border-amber-500' : ''}`}>
      {/* Goal Title and Status */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 flex items-start gap-2">
          {reminder.isAISourced && (
            <Sparkles className="w-4 h-4 text-amber-500 flex-shrink-0 mt-1" />
          )}
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-slate-900 dark:text-white truncate">
              {reminder.goalTitle}
            </h3>
            {isDue && (
              <div className="flex items-center gap-1 mt-1 text-amber-700 dark:text-amber-200 text-xs font-medium">
                <AlertCircle className="w-3 h-3" />
                Reminder due now
              </div>
            )}
          </div>
        </div>
        <div className="text-right ml-2 flex-shrink-0">
          <p className="text-sm font-medium text-slate-900 dark:text-white">
            {formatDate(reminder.nextReminderAt)}
          </p>
        </div>
      </div>

      {/* Cadence Info */}
      <div className="mb-3 space-y-2">
        <div className={`inline-block px-3 py-1 rounded-full text-xs font-medium border ${frequencyColor}`}>
          {frequencyLabel}
        </div>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          {reminder.cadence.reasoning}
        </p>
        {reminder.lastReminderAt && (
          <p className="text-xs text-slate-500 dark:text-slate-500">
            Last reminded {new Date(reminder.lastReminderAt).toLocaleDateString()}
          </p>
        )}
      </div>

      {/* Action Buttons */}
      {isDue && (
        <div className="flex gap-2 pt-3 border-t border-amber-200 dark:border-amber-800">
          <button
            onClick={() => handleResponse('completed')}
            disabled={responding}
            className="flex-1 px-3 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition"
          >
            ✅ Done
          </button>
          <button
            onClick={() => handleResponse('snoozed')}
            disabled={responding}
            className="flex-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition"
          >
            ⏰ Snooze
          </button>
          <button
            onClick={() => handleResponse('ignored')}
            disabled={responding}
            className="flex-1 px-3 py-2 bg-slate-300 hover:bg-slate-400 dark:bg-slate-700 dark:hover:bg-slate-600 disabled:opacity-50 text-slate-900 dark:text-white text-sm font-medium rounded-lg transition"
          >
            Skip
          </button>
        </div>
      )}
    </div>
  );
};
