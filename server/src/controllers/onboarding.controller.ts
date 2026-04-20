import { Request, Response, NextFunction } from 'express';
import * as userService from '../services/user.service';

export async function saveOnboarding(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const result = await userService.updateOnboarding(req.user.id, req.body);
    if (!result) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }
    return res.json(result);
  } catch (err) {
    next(err);
  }
}
