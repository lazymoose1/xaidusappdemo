import { Router } from 'express';
import { authMiddleware, requireRegistered } from '../middleware/auth';
import { validate } from '../middleware/validate';
import * as scoutController from '../controllers/scout.controller';
import { z } from 'zod';

const router = Router();

const nudgeBackSchema = z.object({
  nudgeId: z.string().min(1),
  goalCompleted: z.boolean().optional(),
});

const acknowledgeSchema = z.object({
  credentialId: z.string().min(1),
});

router.get('/today', authMiddleware, requireRegistered, scoutController.getScoutToday);
router.post('/nudge-back', authMiddleware, requireRegistered, validate(nudgeBackSchema), scoutController.nudgeBack);
router.get('/credentials', authMiddleware, requireRegistered, scoutController.getCredentials);
router.post('/acknowledge-credential', authMiddleware, requireRegistered, validate(acknowledgeSchema), scoutController.acknowledgeCredential);
router.post('/credentials/:id/anchor', authMiddleware, requireRegistered, scoutController.anchorCredential);
router.get('/credentials/:id/anchor', authMiddleware, requireRegistered, scoutController.getAnchorStatus);
router.post('/session-close', authMiddleware, requireRegistered, scoutController.sessionClose);

export default router;
