import { Router } from 'express';
import { authMiddleware, requireRegistered } from '../middleware/auth';
import * as forumController from '../controllers/forum.controller';

const router = Router();

router.get('/', authMiddleware, requireRegistered, forumController.listPosts);
router.post('/', authMiddleware, requireRegistered, forumController.createPost);
router.get('/:postId', authMiddleware, requireRegistered, forumController.getPost);
router.post('/:postId/replies', authMiddleware, requireRegistered, forumController.createReply);
router.post('/:postId/like', authMiddleware, requireRegistered, forumController.likePost);
router.post('/:postId/replies/:replyId/like', authMiddleware, requireRegistered, forumController.likeReply);

export default router;
