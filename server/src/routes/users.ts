import { Router } from 'express';
import { authMiddleware, requireRegistered } from '../middleware/auth';
import * as userController from '../controllers/user.controller';

const router = Router();

router.get('/', authMiddleware, requireRegistered, userController.searchUsers);

export default router;
