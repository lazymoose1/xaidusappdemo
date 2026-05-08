import { Router } from 'express';
import { z } from 'zod';
import { authMiddleware, requireRegistered } from '../middleware/auth';
import { validate } from '../middleware/validate';
import * as feedbackController from '../controllers/feedback.controller';

const router = Router();

const feedbackSchema = z.object({
  category: z.enum(['bug', 'confusing', 'idea', 'praise', 'safety', 'other']),
  sentiment: z.enum(['blocked', 'frustrated', 'neutral', 'happy']).optional(),
  message: z.string().trim().min(5).max(2000),
  page: z.string().trim().max(300).optional(),
  contactAllowed: z.boolean().optional(),
}).strict();

router.post('/', authMiddleware, requireRegistered, validate(feedbackSchema), feedbackController.submitFeedback);

export default router;
