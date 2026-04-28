import { Router } from 'express';
import { authMiddleware, requireRegistered } from '../middleware/auth';
import { validate } from '../middleware/validate';
import * as troopController from '../controllers/troop.controller';
import { z } from 'zod';

const router = Router();

const createTroopSchema = z.object({
  name: z.string().min(1).max(100),
  troopCode: z.string().min(3).max(20).regex(/^[A-Z0-9\-]+$/i),
  weeklyResetDay: z.enum(['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']).optional(),
});

const sendNudgeSchema = z.object({
  toUserId: z.string().min(1),
  message: z.string().max(200).optional(),
});

const awardBadgeSchema = z.object({
  toUserId: z.string().min(1),
  badgeTitle: z.string().min(1).max(100),
  badgeFocus: z.string().max(100).optional(),
  credentialType: z.enum(['badge_milestone', 'troop_award', 'bronze_award', 'silver_award', 'gold_award']).optional(),
});

const logServiceHoursSchema = z.object({
  toUserId: z.string().min(1),
  hours: z.number().min(0.5).max(500),
  projectName: z.string().max(100).optional(),
  description: z.string().max(500).optional(),
});

const supportNoteSchema = z.object({
  note: z.string().min(1).max(500),
  tags: z.array(z.enum([
    'outreach_attempted',
    'youth_responded',
    'missed_appointment',
    'goal_planning_help',
    'accountability_support',
    'needs_escalation',
    'resolved',
  ])).max(6).optional(),
  nextStep: z.string().max(200).optional(),
  followUpDate: z.string().datetime().optional(),
  status: z.enum(['needs_support', 'follow_up_due', 'on_track', 'resolved']).optional(),
});

router.post('/', authMiddleware, requireRegistered, validate(createTroopSchema), troopController.createTroop);
router.get('/mine/dashboard', authMiddleware, requireRegistered, troopController.getTroopDashboard);
router.post('/mine/nudge', authMiddleware, requireRegistered, validate(sendNudgeSchema), troopController.sendNudge);
router.post('/mine/weekly-reset', authMiddleware, requireRegistered, troopController.troopWeeklyReset);
router.post('/mine/award-badge', authMiddleware, requireRegistered, validate(awardBadgeSchema), troopController.awardBadge);
router.get('/mine/scouts/:scoutId/record', authMiddleware, requireRegistered, troopController.getScoutRecord);
router.get('/mine/scouts/:scoutId/support-profile', authMiddleware, requireRegistered, troopController.getScoutSupportProfile);
router.post('/mine/scouts/:scoutId/support-notes', authMiddleware, requireRegistered, validate(supportNoteSchema), troopController.addSupportNote);
router.post('/mine/log-service-hours', authMiddleware, requireRegistered, validate(logServiceHoursSchema), troopController.logServiceHours);

export default router;
