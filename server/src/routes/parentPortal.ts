import { Router } from 'express';
import { authMiddleware, requireRole } from '../middleware/auth';
import * as parentPortalController from '../controllers/parent-portal.controller';

const router = Router();
const parentRoles = ['parent', 'educator', 'admin'];

router.get('/overview', authMiddleware, requireRole(parentRoles), parentPortalController.getOverview);
router.get('/children', authMiddleware, requireRole(parentRoles), parentPortalController.getChildren);
router.post('/children', authMiddleware, requireRole(parentRoles), parentPortalController.addChild);
router.get('/weekly-summary', authMiddleware, requireRole(parentRoles), parentPortalController.getWeeklySummary);
router.post('/weekly-summary/send', authMiddleware, requireRole(parentRoles), parentPortalController.sendWeeklySummary);
router.get('/ai-suggested-goals', authMiddleware, requireRole(parentRoles), parentPortalController.getAISuggestedGoals);
router.post('/children/:childId/goals/:goalId/feedback', authMiddleware, requireRole(parentRoles), parentPortalController.submitFeedback);
router.get('/dashboard', authMiddleware, requireRole(parentRoles), parentPortalController.getDashboard);

export default router;
