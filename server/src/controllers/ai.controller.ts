import { Request, Response, NextFunction } from 'express';
import * as aiService from '../services/ai.service';

export async function tinySuggest(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const result = await aiService.tinySuggest(req.user.id, req.body.payload || {});
    return res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function getAdvice(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const result = await aiService.getAdvice(req.user.id, req.body);
    return res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function tinyAdvice(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const result = await aiService.tinyAdvice(req.user.id, req.body);
    return res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function markAIAdopted(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const result = await aiService.markGoalAIAdopted(
      req.params.goalId,
      req.user.id,
      req.body,
    );
    return res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function parentFeedback(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const result = await aiService.parentFeedback(
      req.params.goalId,
      req.user.id,
      req.body,
    );
    return res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function getGoalAnalytics(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const stats = await aiService.getGoalAnalytics(req.user.id);
    return res.json(stats);
  } catch (err) {
    next(err);
  }
}
