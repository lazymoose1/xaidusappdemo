import { Request, Response, NextFunction } from 'express';
import * as goalService from '../services/goal.service';
import { processScoutEvent } from '../services/scout-badge.service';

export async function listGoals(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const goals = await goalService.listGoals(req.user.id);
    return res.json(goals);
  } catch (err) {
    next(err);
  }
}

export async function getTodayGoals(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const goals = await goalService.getTodayGoals(req.user.id);
    return res.json(goals);
  } catch (err) {
    next(err);
  }
}

export async function createGoal(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const goal = await goalService.createGoal(req.user.id, req.body);
    return res.status(201).json(goal);
  } catch (err) {
    next(err);
  }
}

export async function completeGoal(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const goal = await goalService.completeGoal(req.params.id, req.user.id);
    return res.json(goal);
  } catch (err) {
    next(err);
  }
}

export async function checkinGoal(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const { status, note, snoozes, effortLevel, reflection, checkInWindow } = req.body;
    const result = await goalService.checkinGoal(
      req.params.id,
      req.user.id,
      status,
      note,
      snoozes,
      effortLevel,
      reflection,
      checkInWindow,
    );

    // Fire badge events for scouts — fire-and-forget, never blocks response
    if (req.user.isScoutMember) {
      const eventType = status === 'yes' ? 'daily_checkin_yes' : 'daily_checkin_not_yet';
      processScoutEvent(req.user.id, eventType, { goalId: req.params.id, hasReflection: !!reflection });
    }

    return res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function addMilestone(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const { title, target } = req.body;
    const goal = await goalService.addMilestone(
      req.params.id,
      req.user.id,
      title,
      target,
    );
    return res.status(201).json(goal);
  } catch (err) {
    next(err);
  }
}

export async function deleteGoal(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const result = await goalService.deleteGoal(req.params.id, req.user.id);
    return res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function updateSchedule(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const goal = await goalService.updateSchedule(
      req.params.id,
      req.user.id,
      req.body,
    );
    return res.json(goal);
  } catch (err) {
    next(err);
  }
}

export async function weeklyReset(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const { shrinkToOneDay } = req.body || {};
    const result = await goalService.weeklyReset(
      req.user.id,
      Boolean(shrinkToOneDay),
    );
    return res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function completeMilestone(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const index = parseInt(req.params.milestoneIndex, 10);
    if (!Number.isFinite(index) || index < 0) {
      return res.status(400).json({ error: 'Invalid milestone index' });
    }
    const goal = await goalService.completeMilestone(
      req.params.goalId,
      req.user.id,
      index,
    );
    return res.json(goal);
  } catch (err) {
    next(err);
  }
}

export async function updateGoal(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const goal = await goalService.updateGoal(req.params.id, req.user.id, req.body);
    return res.json(goal);
  } catch (err) {
    next(err);
  }
}
