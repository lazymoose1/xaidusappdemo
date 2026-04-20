import { Request, Response, NextFunction } from 'express';
import * as reminderService from '../services/reminder.service';

export async function getReminders(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const reminders = await reminderService.getUserReminders(req.user.id);
    return res.json({
      total: reminders.length,
      reminders,
      nextDue: reminders.length > 0 ? reminders[0] : null,
    });
  } catch (err) {
    next(err);
  }
}

export async function getDueReminders(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const due = await reminderService.getDueReminders(req.user.id);
    return res.json({ due: due.length, reminders: due });
  } catch (err) {
    next(err);
  }
}

export async function analyzeGoal(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const analysis = await reminderService.analyzeGoalCadence(
      req.params.goalId,
      req.user.id,
    );
    const cadence = await reminderService.generateReminderCadence(
      analysis,
      req.user.id,
    );
    return res.json({
      analysis,
      cadence,
      nextReminderTime: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });
  } catch (err) {
    next(err);
  }
}

export async function respondToReminder(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const { response } = req.body;
    const newCadence = await reminderService.adaptReminderCadence(
      req.params.goalId,
      req.user.id,
      response,
    );
    return res.json({
      success: true,
      userResponse: response,
      adaptedCadence: newCadence,
      message: 'Reminder cadence adapted based on your response',
    });
  } catch (err) {
    next(err);
  }
}

export async function batchDueReminders(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const due = await reminderService.getDueReminders();
    return res.json({
      total: due.length,
      reminders: due,
      processedAt: new Date(),
    });
  } catch (err) {
    next(err);
  }
}
