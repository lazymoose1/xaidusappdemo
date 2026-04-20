import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import { validate } from '../middleware/validate';
import * as reminderController from '../controllers/reminder.controller';
import { z } from 'zod';

const router = Router();

const reminderResponseSchema = z.object({
  response: z.enum(['completed', 'completed-late', 'ignored', 'snoozed']),
  reason: z.string().max(500).optional(),
});

router.get('/', authMiddleware, reminderController.getReminders);
router.get('/due', authMiddleware, reminderController.getDueReminders);
router.get('/:goalId/analysis', authMiddleware, reminderController.analyzeGoal);
router.post(
  '/:goalId/respond',
  authMiddleware,
  validate(reminderResponseSchema),
  reminderController.respondToReminder,
);
// System batch endpoint (protected by x-api-key in the controller)
router.get('/batch/due', reminderController.batchDueReminders);

export default router;
