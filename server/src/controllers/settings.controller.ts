import { Request, Response, NextFunction } from 'express';
import * as userService from '../services/user.service';

export async function updatePreferences(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const result = await userService.updatePreferences(req.user.id, req.body);
    if (!result)
      return res.status(400).json({ error: 'No fields to update' });
    return res.json(result);
  } catch (err) {
    next(err);
  }
}
