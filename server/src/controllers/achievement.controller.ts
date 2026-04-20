import { Request, Response, NextFunction } from 'express';
import * as achievementService from '../services/achievement.service';

export async function getAchievements(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const result = await achievementService.getAchievements(req.user.id);
    return res.json(result);
  } catch (err) {
    next(err);
  }
}
