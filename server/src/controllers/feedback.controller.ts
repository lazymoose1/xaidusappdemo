import { Request, Response, NextFunction } from 'express';
import { AppFeedback } from '../models';

export async function submitFeedback(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

    const feedback = await AppFeedback.create({
      user_id: req.user.id,
      user_role: req.user.role,
      category: req.body.category,
      sentiment: req.body.sentiment,
      message: req.body.message.trim(),
      page: req.body.page,
      contact_allowed: Boolean(req.body.contactAllowed),
      metadata: {
        userAgent: req.get('user-agent')?.slice(0, 300),
      },
    });

    return res.status(201).json({
      id: feedback.id,
      received: true,
    });
  } catch (err) {
    next(err);
  }
}
