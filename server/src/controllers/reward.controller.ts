import { Request, Response, NextFunction } from 'express';
import { getUserRewards } from '../services/reward.service';

export async function getRewards(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const data = await getUserRewards(req.user.id);
    return res.json(data);
  } catch (err) {
    next(err);
  }
}
