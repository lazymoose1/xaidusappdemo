import { Router } from 'express';
import authRoutes from './auth';
import goalsRoutes from './goals';
import postsRoutes from './posts';
import threadsRoutes from './threads';
import remindersRoutes from './reminders';
import aiRoutes from './ai';
import uploadsRoutes from './uploads';
import usersRoutes from './users';
import achievementsRoutes from './achievements';
import parentPortalRoutes from './parentPortal';
import onboardingRoutes from './onboarding';
import settingsRoutes from './settings';
import cronRoutes from './cron';
import metricsRoutes from './metrics';
import scoutAuthRoutes from './scout-auth';
import troopsRoutes from './troops';
import scoutRoutes from './scout';
import rewardsRoutes from './rewards';
import forumRoutes from './forum';
import notificationsRoutes from './notifications';
import {
  uploadLimiter,
  cronLimiter,
  parentPortalLimiter,
  messagingLimiter,
} from '../middleware/rate-limiter';

export const apiRouter = Router();

apiRouter.use('/auth', authRoutes);
apiRouter.use('/goals', goalsRoutes);
apiRouter.use('/posts', postsRoutes);
apiRouter.use('/threads', messagingLimiter, threadsRoutes);
apiRouter.use('/reminders', remindersRoutes);
apiRouter.use('/ai', aiRoutes);
apiRouter.use('/uploads', uploadLimiter, uploadsRoutes);
apiRouter.use('/users', usersRoutes);
apiRouter.use('/achievements', achievementsRoutes);
apiRouter.use('/parent-portal', parentPortalLimiter, parentPortalRoutes);
apiRouter.use('/onboarding', onboardingRoutes);
apiRouter.use('/settings', settingsRoutes);
apiRouter.use('/cron', cronLimiter, cronRoutes);
apiRouter.use('/metrics', metricsRoutes);
apiRouter.use('/scout-auth', scoutAuthRoutes);
apiRouter.use('/troops', troopsRoutes);
apiRouter.use('/scout', scoutRoutes);
apiRouter.use('/rewards', rewardsRoutes);
apiRouter.use('/forum', forumRoutes);
apiRouter.use('/notifications', notificationsRoutes);
