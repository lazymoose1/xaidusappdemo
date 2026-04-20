import { Router } from 'express';
import { authMiddleware, requireRole, requireRegistered } from '../middleware/auth';
import * as threadController from '../controllers/thread.controller';

const router = Router();
const allowedRoles = ['teen', 'parent', 'educator', 'admin', 'scout_leader'];

router.get('/', authMiddleware, requireRegistered, requireRole(allowedRoles), threadController.listThreads);
router.post('/', authMiddleware, requireRegistered, requireRole(allowedRoles), threadController.createThread);
router.get('/:threadId', authMiddleware, requireRegistered, requireRole(allowedRoles), threadController.getThread);
router.get('/:threadId/messages', authMiddleware, requireRegistered, requireRole(allowedRoles), threadController.getMessages);
router.post('/:threadId/messages', authMiddleware, requireRegistered, requireRole(allowedRoles), threadController.sendMessage);
router.post('/:threadId/read', authMiddleware, requireRegistered, requireRole(allowedRoles), threadController.markRead);

export default router;
