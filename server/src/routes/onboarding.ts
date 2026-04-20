import { Router } from 'express';
import { authMiddleware, requireRegistered } from '../middleware/auth';
import { validate } from '../middleware/validate';
import * as onboardingController from '../controllers/onboarding.controller';
import { z } from 'zod';

const router = Router();

const onboardingSchema = z.object({
  interests: z.array(z.string()).max(10),
  archetype: z.string().max(50),
  troopCode: z.string().max(20).optional(),
  nickname: z.string().max(30).optional(),
  avatar: z.string().optional(),
});

router.post('/', authMiddleware, requireRegistered, validate(onboardingSchema), onboardingController.saveOnboarding);

export default router;
