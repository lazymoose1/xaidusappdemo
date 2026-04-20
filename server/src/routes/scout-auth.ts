import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import { authLimiter } from '../middleware/rate-limiter';
import { validate } from '../middleware/validate';
import * as scoutAuthController from '../controllers/scout-auth.controller';
import { z } from 'zod';

const router = Router();

router.use(authLimiter);

const loginSchema = z.object({
  troopCode: z.string().min(3).max(20),
  nickname: z.string().min(1).max(30),
  pin: z.string().regex(/^\d{4,6}$/, 'PIN must be 4–6 digits'),
});

const createScoutSchema = z.object({
  nickname: z.string().min(1).max(30),
  pin: z.string().regex(/^\d{4,6}$/, 'PIN must be 4–6 digits'),
  badgeFocus: z.string().max(100).optional(),
});

// POST /api/scout-auth/login — public (no JWT required)
router.post('/login', validate(loginSchema), scoutAuthController.scoutLogin);

// POST /api/scout-auth/create-scout — leader only
router.post('/create-scout', authMiddleware, validate(createScoutSchema), scoutAuthController.createScout);

export default router;
