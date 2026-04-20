import { Router } from 'express';
import { requireApiKey } from '../middleware/auth';
import * as metricsController from '../controllers/metrics.controller';

const router = Router();

router.use(requireApiKey);

router.get('/social-auth', metricsController.getSocialAuthMetrics);
router.get('/cache', metricsController.getCacheStats);
router.get('/health', metricsController.healthCheck);

export default router;
