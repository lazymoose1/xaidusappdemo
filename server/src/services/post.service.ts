import * as postRepo from '../repositories/post.repo';
import * as commentRepo from '../repositories/comment.repo';
import { NotFoundError, ForbiddenError } from '../lib/errors';

export async function listPosts(limit: number = 50) {
  const posts = await postRepo.findAll(limit);

  // No email in author response objects
  return posts.map((p) => ({
    id: p.id,
    authorId: p.author_id,
    content: p.content,
    mediaType: p.media_type,
    mediaUrl: p.media_url,
    visibility: p.visibility,
    createdAt: p.created_at,
    author: p.author
      ? {
          id: p.author.id,
          displayName: p.author.display_name || 'User',
          avatarUrl: p.author.avatar_url,
        }
      : null,
    commentsCount: (p as any)._count?.comments ?? 0,
  }));
}

export async function getPost(postId: string) {
  const post = await postRepo.findById(postId);
  if (!post) throw new NotFoundError('Post');

  const commentsCount = await commentRepo.countByPostId(postId);

  return {
    id: post.id,
    authorId: post.author_id,
    content: post.content,
    mediaType: post.media_type,
    mediaUrl: post.media_url,
    visibility: post.visibility,
    createdAt: post.created_at,
    author: post.author
      ? {
          id: post.author.id,
          displayName: post.author.display_name || 'User',
          avatarUrl: post.author.avatar_url,
        }
      : null,
    commentsCount,
  };
}

export async function createPost(
  authorId: string,
  data: {
    content: string;
    mediaType?: string;
    mediaUrl?: string;
    visibility?: string;
  },
) {
  const post = await postRepo.create({
    author: { connect: { id: authorId } },
    content: data.content,
    media_type: data.mediaType || null,
    media_url: data.mediaUrl || null,
    visibility: data.visibility || 'public',
  });
  return post;
}

export async function getComments(postId: string) {
  const comments = await commentRepo.findByPostId(postId);
  // No email in comment author
  return comments.map((c) => ({
    id: c.id,
    postId: c.post_id,
    text: c.text,
    createdAt: c.created_at,
    author: c.author
      ? {
          id: c.author.id,
          displayName: c.author.display_name || 'User',
          avatarUrl: c.author.avatar_url,
        }
      : null,
  }));
}

export async function updatePost(
  postId: string,
  authorId: string,
  data: { content?: string; mediaType?: string; mediaUrl?: string; visibility?: string },
) {
  const post = await postRepo.findById(postId);
  if (!post) throw new NotFoundError('Post');
  if (post.author_id !== authorId) throw new ForbiddenError();

  await postRepo.updateByAuthor(postId, authorId, {
    content: data.content,
    media_type: data.mediaType ?? undefined,
    media_url: data.mediaUrl ?? undefined,
    visibility: data.visibility,
  });

  const updated = await postRepo.findById(postId);
  if (!updated) throw new NotFoundError('Post');
  return {
    id: updated.id,
    authorId: updated.author_id,
    content: updated.content,
    mediaType: updated.media_type,
    mediaUrl: updated.media_url,
    visibility: updated.visibility,
    createdAt: updated.created_at,
  };
}

export async function deletePost(postId: string, authorId: string) {
  const post = await postRepo.findById(postId);
  if (!post) throw new NotFoundError('Post');
  if (post.author_id !== authorId) throw new ForbiddenError();

  await postRepo.deleteByAuthor(postId, authorId);
  return { success: true };
}

export async function deleteComment(commentId: string, authorId: string) {
  const comment = await commentRepo.findById(commentId);
  if (!comment) throw new NotFoundError('Comment');
  if (comment.author_id !== authorId) throw new ForbiddenError();

  await commentRepo.remove(commentId);
  return { success: true };
}

export async function createComment(
  postId: string,
  authorId: string,
  text: string,
) {
  // Verify post exists
  const post = await postRepo.findById(postId);
  if (!post) throw new NotFoundError('Post');

  const comment = await commentRepo.create({
    post: { connect: { id: postId } },
    author: { connect: { id: authorId } },
    text,
  });

  return {
    id: comment.id,
    postId: comment.post_id,
    text: comment.text,
    createdAt: comment.created_at,
  };
}
