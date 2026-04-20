import { Router } from 'express';
import { authMiddleware, requireRole, requireRegistered } from '../middleware/auth';
import { validate } from '../middleware/validate';
import * as postController from '../controllers/post.controller';
import { z } from 'zod';

const router = Router();

const createPostSchema = z.object({
  content: z.string().min(1).max(1000),
  mediaType: z.enum(['image', 'video', 'file']).optional(),
  mediaUrl: z.string().url().max(2000).optional().refine(
    (val) => !val || val.startsWith('https://'),
    { message: 'Only HTTPS URLs allowed' }
  ),
  visibility: z.enum(['public', 'friends', 'private']).optional(),
});

const createCommentSchema = z.object({
  text: z.string().min(1).max(1000),
});

router.get('/', authMiddleware, requireRegistered, postController.listPosts);
router.get('/:id', authMiddleware, requireRegistered, postController.getPost);
router.post(
  '/',
  authMiddleware,
  requireRegistered,
  requireRole(['teen', 'parent', 'educator', 'admin']),
  validate(createPostSchema),
  postController.createPost,
);
router.put(
  '/:id',
  authMiddleware,
  requireRegistered,
  validate(createPostSchema.partial()),
  postController.updatePost,
);
router.delete('/:id', authMiddleware, requireRegistered, postController.deletePost);
router.get('/:id/comments', authMiddleware, requireRegistered, postController.getComments);
router.post(
  '/:id/comments',
  authMiddleware,
  requireRegistered,
  validate(createCommentSchema),
  postController.createComment,
);
router.delete('/:id/comments/:commentId', authMiddleware, requireRegistered, postController.deleteComment);

export default router;
