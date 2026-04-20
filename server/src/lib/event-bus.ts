import { EventEmitter } from 'events';
import { logger } from './logger';

export interface MilestoneCompletionEvent {
  goalId: string;
  userId: string;
  milestoneIndex: number;
  milestoneTitle: string;
  goalTitle: string;
  goalCategory: string;
  progressPercentage: number;
  isAISourced: boolean;
  completedAt: Date;
  totalMilestones: number;
  completedCount: number;
}

class AppEventBus extends EventEmitter {
  emitMilestoneCompleted(event: MilestoneCompletionEvent) {
    this.emit('milestone:completed', event);
  }

  onMilestoneCompleted(handler: (event: MilestoneCompletionEvent) => Promise<void>) {
    this.on('milestone:completed', async (event: MilestoneCompletionEvent) => {
      try {
        await handler(event);
      } catch (err) {
        logger.error({ err }, 'Event handler error');
      }
    });
  }
}

export const eventBus = new AppEventBus();
