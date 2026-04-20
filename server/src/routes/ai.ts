import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import { aiLimiter } from '../middleware/rate-limiter';
import * as aiController from '../controllers/ai.controller';

const router = Router();

router.use(aiLimiter);

router.post('/tiny', authMiddleware, aiController.tinySuggest);
router.post('/tiny/advice', authMiddleware, aiController.tinyAdvice);
router.post('/goals/:goalId/mark-ai-adopted', authMiddleware, aiController.markAIAdopted);
router.post('/goals/:goalId/parent-feedback', authMiddleware, aiController.parentFeedback);
router.get('/user/goal-analytics', authMiddleware, aiController.getGoalAnalytics);

export default router;
