import { Router } from 'express';
import { authMiddleware, requireRegistered, requireRole } from '../middleware/auth';
import { aiLimiter } from '../middleware/rate-limiter';
import * as aiController from '../controllers/ai.controller';

const router = Router();

router.use(aiLimiter);

router.post('/tiny', authMiddleware, requireRegistered, aiController.tinySuggest);
router.post('/tiny/advice', authMiddleware, requireRegistered, aiController.tinyAdvice);
router.post('/goals/:goalId/mark-ai-adopted', authMiddleware, requireRegistered, aiController.markAIAdopted);
router.post('/goals/:goalId/parent-feedback', authMiddleware, requireRegistered, requireRole(['parent', 'educator', 'admin']), aiController.parentFeedback);
router.get('/user/goal-analytics', authMiddleware, requireRegistered, aiController.getGoalAnalytics);

export default router;
