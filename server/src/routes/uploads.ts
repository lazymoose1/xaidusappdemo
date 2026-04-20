import { Router } from 'express';
import { authMiddleware, requireRole } from '../middleware/auth';
import * as uploadController from '../controllers/upload.controller';

const router = Router();

router.post(
  '/presign',
  authMiddleware,
  requireRole(['teen', 'parent', 'educator', 'admin']),
  uploadController.presign,
);

export default router;
