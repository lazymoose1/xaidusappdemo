import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import * as userController from '../controllers/user.controller';

const router = Router();

router.get('/', authMiddleware, userController.searchUsers);

export default router;
