import { Router } from 'express';
import { authMiddleware, requireRegistered } from '../middleware/auth';
import * as notificationsController from '../controllers/notifications.controller';

const router = Router();

router.get('/', authMiddleware, requireRegistered, notificationsController.getNotifications);

export default router;
