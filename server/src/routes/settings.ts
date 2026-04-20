import { Router } from 'express';
import { authMiddleware, requireRegistered } from '../middleware/auth';
import { validate } from '../middleware/validate';
import * as settingsController from '../controllers/settings.controller';
import { z } from 'zod';

const router = Router();

const preferencesSchema = z.object({
  theme: z.enum(['light', 'dark', 'system']).optional(),
  notifications: z.boolean().optional(),
  reminderTime: z.string().max(10).optional(),
  coachStyle: z.string().max(50).optional(),
  visibility: z.enum(['public', 'friends', 'private']).optional(),
}).strict();

router.post('/preferences', authMiddleware, requireRegistered, validate(preferencesSchema), settingsController.updatePreferences);

export default router;
