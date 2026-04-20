import { Router } from 'express';
import { authMiddleware, requireRegistered } from '../middleware/auth';
import * as rewardController from '../controllers/reward.controller';

const router = Router();
router.get('/', authMiddleware, requireRegistered, rewardController.getRewards);
export default router;
