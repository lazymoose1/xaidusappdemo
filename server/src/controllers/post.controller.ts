import { Request, Response, NextFunction } from 'express';
import * as postService from '../services/post.service';

export async function listPosts(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const posts = await postService.listPosts();
    return res.json(posts);
  } catch (err) {
    next(err);
  }
}

export async function getPost(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const post = await postService.getPost(req.params.id);
    return res.json(post);
  } catch (err) {
    next(err);
  }
}

export async function createPost(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const post = await postService.createPost(req.user.id, req.body);
    return res.status(201).json(post);
  } catch (err) {
    next(err);
  }
}

export async function getComments(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const comments = await postService.getComments(req.params.id);
    return res.json(comments);
  } catch (err) {
    next(err);
  }
}

export async function updatePost(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const post = await postService.updatePost(req.params.id, req.user.id, req.body);
    return res.json(post);
  } catch (err) {
    next(err);
  }
}

export async function deletePost(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const result = await postService.deletePost(req.params.id, req.user.id);
    return res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function createComment(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const { text } = req.body;
    const comment = await postService.createComment(
      req.params.id,
      req.user.id,
      text,
    );
    return res.status(201).json(comment);
  } catch (err) {
    next(err);
  }
}

export async function deleteComment(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const result = await postService.deleteComment(req.params.commentId, req.user.id);
    return res.json(result);
  } catch (err) {
    next(err);
  }
}
