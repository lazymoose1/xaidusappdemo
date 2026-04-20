import { Router } from 'express';
import { authMiddleware, requireRegistered } from '../middleware/auth';
import { validate } from '../middleware/validate';
import * as goalController from '../controllers/goal.controller';
import { z } from 'zod';

const router = Router();

const createGoalSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  category: z.string().max(100).optional(),
  progress: z.number().int().min(0).max(100).optional(),
  source: z.enum(['ai', 'manual']).optional().default('manual'),
  suggestionId: z.string().optional(),
  suggestionTitle: z.string().optional(),
  archetypeAligned: z.boolean().optional(),
  plannedDays: z
    .object({
      mon: z.boolean().optional(),
      tue: z.boolean().optional(),
      wed: z.boolean().optional(),
      thu: z.boolean().optional(),
      fri: z.boolean().optional(),
      sat: z.boolean().optional(),
      sun: z.boolean().optional(),
    })
    .optional(),
  microStep: z.string().max(200).optional(),
  // Scout fields
  badgeFocus: z.string().max(100).optional(),
  goalCategoryTag: z.enum(['school', 'skill', 'community', 'personal']).optional(),
  sizePreset: z.enum(['5min', '10min', '20min', 'custom']).optional(),
  checkInWindows: z.array(z.string()).optional(),
  shrunkFrom: z.string().max(200).optional(),
});

const addMilestoneSchema = z.object({
  title: z.string().min(1).max(200),
  target: z.string().max(500).optional(),
});

const checkinSchema = z.object({
  status: z.enum(['yes', 'not_yet']),
  note: z.string().optional(),
  snoozes: z.number().optional(),
  // Scout fields
  effortLevel: z.union([z.literal(1), z.literal(2), z.literal(3)]).optional(),
  reflection: z.string().max(500).optional(),
  checkInWindow: z.enum(['morning', 'afternoon', 'evening']).optional(),
});

const updateGoalSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).optional(),
  category: z.string().max(100).optional(),
});

const scheduleSchema = z.object({
  plannedDays: z
    .object({
      mon: z.boolean().optional(),
      tue: z.boolean().optional(),
      wed: z.boolean().optional(),
      thu: z.boolean().optional(),
      fri: z.boolean().optional(),
      sat: z.boolean().optional(),
      sun: z.boolean().optional(),
    })
    .optional(),
  microStep: z.string().max(200).optional(),
  reminderWindow: z.string().optional(),
});

router.get('/', authMiddleware, requireRegistered, goalController.listGoals);
router.get('/today', authMiddleware, requireRegistered, goalController.getTodayGoals);
router.post('/', authMiddleware, requireRegistered, validate(createGoalSchema), goalController.createGoal);
router.post('/:id/complete', authMiddleware, requireRegistered, goalController.completeGoal);
router.post('/:id/checkin', authMiddleware, requireRegistered, validate(checkinSchema), goalController.checkinGoal);
router.post('/:id/milestones', authMiddleware, requireRegistered, validate(addMilestoneSchema), goalController.addMilestone);
router.put('/:id', authMiddleware, requireRegistered, validate(updateGoalSchema), goalController.updateGoal);
router.delete('/:id', authMiddleware, requireRegistered, goalController.deleteGoal);
router.put('/:id/schedule', authMiddleware, requireRegistered, validate(scheduleSchema), goalController.updateSchedule);
router.post('/weekly/reset', authMiddleware, requireRegistered, goalController.weeklyReset);
router.post('/:goalId/milestones/:milestoneIndex/complete', authMiddleware, requireRegistered, goalController.completeMilestone);

export default router;
