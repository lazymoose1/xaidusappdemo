import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import {
  authLimiter,
  signupLimiter,
  loginAccountLimiter,
  loginOrgLimiter,
} from '../middleware/rate-limiter';
import { validate } from '../middleware/validate';
import * as scoutAuthController from '../controllers/scout-auth.controller';
import { z } from 'zod';

const router = Router();

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

// Passphrase must be at least two words so it's memorable but not a single token.
const passphraseSchema = z
  .string()
  .min(6, 'Passphrase must be at least 6 characters')
  .max(100)
  .refine(
    (v) => v.trim().split(/\s+/).filter(Boolean).length >= 2,
    'Passphrase must be at least two words',
  );

const selfSignupSchema = z.object({
  username: z
    .string()
    .min(2)
    .max(30)
    .regex(/^[a-zA-Z0-9 _-]+$/, 'Use letters, numbers, spaces, - or _'),
  passphrase: passphraseSchema,
  reason: z.string().max(300).optional(),
  inviteCode: z.string().min(4).max(12).optional(),
});

const selfLoginSchema = z.object({
  username: z.string().min(2).max(30),
  passphrase: z.string().min(1).max(100),
});

// POST /api/scout-auth/login — group code + nickname + PIN. Rate-limited per
// account and per org (troop), not per IP, so shared school networks are fine.
router.post('/login', loginOrgLimiter, loginAccountLimiter, validate(loginSchema), scoutAuthController.scoutLogin);

// POST /api/scout-auth/signup — public self-service teen signup (IP-keyed abuse block)
router.post('/signup', signupLimiter, validate(selfSignupSchema), scoutAuthController.selfSignup);

// POST /api/scout-auth/login-username — self-signup teen login, rate-limited per account
router.post('/login-username', loginAccountLimiter, validate(selfLoginSchema), scoutAuthController.selfLogin);

// POST /api/scout-auth/create-scout — leader only (authed); keep the general auth limiter
router.post('/create-scout', authLimiter, authMiddleware, validate(createScoutSchema), scoutAuthController.createScout);

export default router;
