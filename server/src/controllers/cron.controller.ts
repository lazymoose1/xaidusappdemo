import { Request, Response, NextFunction } from 'express';
import * as goalService from '../services/goal.service';
import * as socialService from '../services/social.service';
import * as reminderService from '../services/reminder.service';

export async function weeklyReset(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const updated = await goalService.resetAllGoals(false);
    return res.json({ ok: true, updated });
  } catch (err) {
    next(err);
  }
}

export async function cacheRefresh(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    return res.json({ ok: true, message: 'Cache refresh started' });
  } catch (err) {
    next(err);
  }
}

export async function cacheCleanup(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const result = await socialService.cleanExpiredCache();
    return res.json({ ok: true, ...result });
  } catch (err) {
    next(err);
  }
}

export async function reminderDelivery(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const dueReminders = await reminderService.getDueReminders();
    let delivered = 0;

    for (const reminder of dueReminders) {
      const goal = { title: reminder.goalTitle };
      const message = reminderService.formatReminderMessage(goal, reminder.cadence);
      console.log(`[Reminder] userId=${reminder.userId} goalId=${reminder.goalId}: ${message}`);
      delivered++;
    }

    return res.json({ ok: true, delivered, total: dueReminders.length });
  } catch (err) {
    next(err);
  }
}
