import { Router } from 'express';
import { requireApiKey } from '../middleware/auth';
import * as cronController from '../controllers/cron.controller';

const router = Router();

router.use(requireApiKey);

router.post('/weekly-reset', cronController.weeklyReset);
router.post('/cache-refresh', cronController.cacheRefresh);
router.post('/cache-cleanup', cronController.cacheCleanup);
router.post('/reminder-delivery', cronController.reminderDelivery);

export default router;
