import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import * as achievementController from '../controllers/achievement.controller';

const router = Router();

router.get('/', authMiddleware, achievementController.getAchievements);

export default router;
