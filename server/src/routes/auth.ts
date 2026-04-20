import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import { authLimiter } from '../middleware/rate-limiter';
import { validate } from '../middleware/validate';
import * as authController from '../controllers/auth.controller';
import { env } from '../config/env';
import { z } from 'zod';

const router = Router();

router.use(authLimiter);

const registerProfileSchema = z.object({
  displayName: z.string().min(1).max(50),
  role: z.enum(['teen', 'parent', 'scout_leader']).default('teen'),
  leaderInviteCode: z.string().optional(),
  childName: z.string().optional(),
});

const sendRoleCodeSchema = z.object({
  targetRole: z.enum(['teen', 'parent', 'scout_leader']),
});

const applyRoleChangeSchema = z.object({
  targetRole: z.enum(['teen', 'parent', 'scout_leader']),
  code: z.string().min(10).max(10),
  leaderInviteCode: z.string().optional(),
});

// POST /api/auth/register-profile
router.post('/register-profile', authMiddleware, validate(registerProfileSchema), authController.registerProfile);

// GET /api/auth/me
router.get('/me', authMiddleware, authController.getMe);

// POST /api/auth/role-code/send — generate + email a 6-digit OTP
router.post('/role-code/send', authMiddleware, validate(sendRoleCodeSchema), authController.sendRoleCode);

// POST /api/auth/role-code/apply — validate OTP and switch role
router.post('/role-code/apply', authMiddleware, validate(applyRoleChangeSchema), authController.applyRoleChange);

// POST /api/auth/demo - Dev-only demo auth
if (env.NODE_ENV === 'development') {
  router.post('/demo', authController.demoAuth);
}

export default router;
