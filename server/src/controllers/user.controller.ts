import { Request, Response, NextFunction } from 'express';
import * as userService from '../services/user.service';

export async function searchUsers(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const query = String(req.query.q || '').trim();
    const rawLimit = Number(req.query.limit);
    const limit = Number.isFinite(rawLimit) && rawLimit >= 1 && rawLimit <= 100
      ? Math.floor(rawLimit)
      : 50;
    const users = await userService.searchUsers(query, limit);
    return res.json({ users });
  } catch (err) {
    next(err);
  }
}
