import * as goalRepo from '../repositories/goal.repo';
import * as userRepo from '../repositories/user.repo';

export interface ReminderCadence {
  frequency: 'daily' | 'every-2-days' | 'every-3-days' | 'weekly' | 'bi-weekly';
  preferredTime: string;
  reasoning: string;
  confidence: number;
}

export interface ReminderSchedule {
  goalId: string;
  userId: string;
  goalTitle: string;
  nextReminderAt: Date;
  cadence: ReminderCadence;
  lastReminderAt?: Date;
  remindersSent: number;
  adaptiveHistory: Array<{
    timestamp: Date;
    cadence: string;
    userResponse: 'completed' | 'completed-late' | 'ignored' | 'snoozed';
  }>;
}

export interface CadenceAnalysis {
  goalId: string;
  averageCompletionTime: number;
  milestoneCadence: string;
  userPattern: 'consistent' | 'bursty' | 'sporadic';
  recommendedFrequency: string;
  confidence: number;
  reasoning: string[];
}

export async function analyzeGoalCadence(
  goalId: string,
  userId: string,
): Promise<CadenceAnalysis> {
  const goal = await goalRepo.findById(goalId);
  if (!goal || goal.user_id !== userId) {
    throw new Error('Goal not found');
  }

  const reasoning: string[] = [];
  let recommendedFrequency = 'weekly';
  let confidence = 0.5;

  const milestones = (goal.milestones as any[]) || [];
  const totalMilestones = milestones.length;
  const completedMilestones = milestones.filter((m) => m.completed).length;

  if (totalMilestones === 0) {
    reasoning.push('No milestones set - recommending weekly check-ins');
    recommendedFrequency = 'weekly';
    confidence = 0.4;
  } else {
    const completedWithDates = milestones
      .filter((m) => m.completed && m.createdAt)
      .map((m) => new Date(m.createdAt).getTime());

    if (completedWithDates.length >= 2) {
      const intervals = [];
      for (let i = 1; i < completedWithDates.length; i++) {
        intervals.push(
          (completedWithDates[i] - completedWithDates[i - 1]) /
            (1000 * 60 * 60 * 24),
        );
      }

      const avgInterval =
        intervals.reduce((a, b) => a + b, 0) / intervals.length;

      reasoning.push(
        `Average ${Math.round(avgInterval)} days between milestone completions`,
      );

      if (avgInterval <= 1) {
        recommendedFrequency = 'daily';
        confidence = 0.85;
      } else if (avgInterval <= 2) {
        recommendedFrequency = 'every-2-days';
        confidence = 0.8;
      } else if (avgInterval <= 4) {
        recommendedFrequency = 'every-3-days';
        confidence = 0.75;
      } else if (avgInterval <= 7) {
        recommendedFrequency = 'weekly';
        confidence = 0.7;
      } else {
        recommendedFrequency = 'bi-weekly';
        confidence = 0.6;
      }

      const variance = Math.sqrt(
        intervals.reduce(
          (sum, val) => sum + Math.pow(val - avgInterval, 2),
          0,
        ) / intervals.length,
      );
      const cv = variance / avgInterval;

      if (cv < 0.3) {
        reasoning.push('Consistent completion pattern');
      } else if (cv > 0.8) {
        reasoning.push('Sporadic pattern - increase reminder frequency');
        if (recommendedFrequency === 'weekly')
          recommendedFrequency = 'every-3-days';
        if (recommendedFrequency === 'bi-weekly')
          recommendedFrequency = 'weekly';
      }
    }

    if (goal.source === 'ai') {
      reasoning.push('AI-suggested goals benefit from consistent reminders');
      if (recommendedFrequency === 'bi-weekly')
        recommendedFrequency = 'weekly';
      confidence += 0.1;
    }

    const progressRatio = (goal.progress || 0) / 100;
    if (progressRatio < 0.3) {
      reasoning.push('Low progress - increase reminder frequency');
      if (recommendedFrequency === 'weekly')
        recommendedFrequency = 'every-3-days';
      if (recommendedFrequency === 'bi-weekly')
        recommendedFrequency = 'weekly';
    } else if (progressRatio > 0.8) {
      reasoning.push('High progress - maintain frequency');
      confidence += 0.05;
    }
  }

  return {
    goalId,
    averageCompletionTime:
      completedMilestones > 0 ? Math.round(completedMilestones / 7) : 0,
    milestoneCadence: `${completedMilestones}/${totalMilestones} completed`,
    userPattern:
      completedMilestones / Math.max(totalMilestones, 1) > 0.7
        ? 'consistent'
        : completedMilestones > 0
          ? 'bursty'
          : 'sporadic',
    recommendedFrequency,
    confidence: Math.min(confidence, 1),
    reasoning,
  };
}

function pickPreferredTime(reminderWindows: string[] = []): string {
  if (reminderWindows.includes('before_school')) return '07:30';
  if (reminderWindows.includes('after_school')) return '16:00';
  if (reminderWindows.includes('evening')) return '19:30';
  return '09:00';
}

export async function generateReminderCadence(
  analysis: CadenceAnalysis,
  userId?: string,
): Promise<ReminderCadence> {
  let preferredTime = '09:00';
  if (userId) {
    const user = await userRepo.findById(userId);
    if (user && Array.isArray(user.reminder_windows)) {
      preferredTime = pickPreferredTime(user.reminder_windows);
    }
  }

  const frequencyMap: Record<string, ReminderCadence['frequency']> = {
    daily: 'daily',
    'every-2-days': 'every-2-days',
    'every-3-days': 'every-3-days',
    weekly: 'weekly',
    'bi-weekly': 'bi-weekly',
  };

  return {
    frequency: frequencyMap[analysis.recommendedFrequency] || 'weekly',
    preferredTime,
    reasoning: analysis.reasoning.join('; '),
    confidence: analysis.confidence,
  };
}

export function calculateNextReminderTime(
  lastReminderAt: Date,
  cadence: ReminderCadence['frequency'],
): Date {
  const now = new Date();
  const next = new Date(lastReminderAt || now);
  const daysMap = {
    daily: 1,
    'every-2-days': 2,
    'every-3-days': 3,
    weekly: 7,
    'bi-weekly': 14,
  };
  next.setDate(next.getDate() + (daysMap[cadence] || 7));
  next.setHours(9, 0, 0, 0);
  if (next <= now) next.setDate(next.getDate() + 1);
  return next;
}

export async function getUserReminders(
  userId: string,
): Promise<ReminderSchedule[]> {
  const goals = await goalRepo.findByUserId(userId);
  const aiGoals = goals.filter((g) => !g.completed && g.source === 'ai');
  const reminders: ReminderSchedule[] = [];

  for (const goal of aiGoals) {
    const analysis = await analyzeGoalCadence(goal.id, userId);
    const cadence = await generateReminderCadence(analysis, userId);
    const nextReminderAt = calculateNextReminderTime(new Date(), cadence.frequency);

    reminders.push({
      goalId: goal.id,
      userId,
      goalTitle: goal.title,
      nextReminderAt,
      cadence,
      remindersSent: 0,
      adaptiveHistory: [],
    });
  }

  return reminders.sort(
    (a, b) => a.nextReminderAt.getTime() - b.nextReminderAt.getTime(),
  );
}

export async function getDueReminders(
  userId?: string,
): Promise<ReminderSchedule[]> {
  const now = new Date();
  if (userId) {
    const reminders = await getUserReminders(userId);
    return reminders.filter((r) => r.nextReminderAt <= now);
  }

  const goals = await goalRepo.findIncompleteGoals(100);
  const dueReminders: ReminderSchedule[] = [];

  for (const goal of goals) {
    const analysis = await analyzeGoalCadence(goal.id, goal.user_id);
    const cadence = await generateReminderCadence(analysis, goal.user_id);
    const nextReminderAt = calculateNextReminderTime(new Date(), cadence.frequency);

    if (nextReminderAt <= now) {
      dueReminders.push({
        goalId: goal.id,
        userId: goal.user_id,
        goalTitle: goal.title,
        nextReminderAt,
        cadence,
        remindersSent: 0,
        adaptiveHistory: [],
      });
    }
  }

  return dueReminders;
}

export async function adaptReminderCadence(
  goalId: string,
  userId: string,
  userResponse: 'completed' | 'completed-late' | 'ignored' | 'snoozed',
): Promise<ReminderCadence> {
  const analysis = await analyzeGoalCadence(goalId, userId);
  const cadence = await generateReminderCadence(analysis, userId);

  if (userResponse === 'completed-late') {
    const frequencyOrder = [
      'bi-weekly',
      'weekly',
      'every-3-days',
      'every-2-days',
      'daily',
    ] as const;
    const currentIndex = frequencyOrder.indexOf(cadence.frequency);
    if (currentIndex > 0) {
      cadence.frequency = frequencyOrder[currentIndex - 1];
      cadence.reasoning += '; Increasing frequency due to late completion';
    }
  }

  return cadence;
}

export function formatReminderMessage(
  goal: any,
  cadence: ReminderCadence,
): string {
  const messages: Record<string, string> = {
    daily: `Daily check-in: How's your progress on "${goal.title}"?`,
    'every-2-days': `Quick check: Working on "${goal.title}"?`,
    'every-3-days': `Update time: Progress on "${goal.title}"?`,
    weekly: `Weekly check-in: Time to update "${goal.title}"`,
    'bi-weekly': `Bi-weekly reminder: Let's review "${goal.title}"`,
  };
  return messages[cadence.frequency] || messages['weekly'];
}
