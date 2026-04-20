import mongoose from 'mongoose';
import { Post, Comment } from '../models';

export async function findAll(limit: number = 50) {
  const posts = await Post.find()
    .sort({ created_at: -1 })
    .limit(limit)
    .populate('author_id', 'display_name avatar_url')
    .lean();

  const postIds = posts.map((p) => p._id);
  const counts = await Comment.aggregate([
    { $match: { post_id: { $in: postIds } } },
    { $group: { _id: '$post_id', count: { $sum: 1 } } },
  ]);
  const countMap = new Map(counts.map((c) => [c._id.toString(), c.count]));

  return posts.map((p) => {
    const author = p.author_id as any;
    return {
      ...p,
      id: p._id.toString(),
      author_id: author?._id?.toString() ?? p._id.toString(),
      author: author ? { ...author, id: author._id.toString() } : null,
      _count: { comments: countMap.get(p._id.toString()) || 0 },
    };
  });
}

export async function findById(id: string) {
  const post = await Post.findById(id)
    .populate('author_id', 'display_name avatar_url')
    .lean();
  if (!post) return null;
  const author = post.author_id as any;
  return {
    ...post,
    id: post._id.toString(),
    author_id: author?._id?.toString() ?? post._id.toString(),
    author: author ? { ...author, id: author._id.toString() } : null,
  };
}

export async function create(data: Record<string, any>) {
  // Handle Prisma-style connect syntax: { author: { connect: { id } } }
  const mapped: Record<string, any> = { ...data };
  if (data.author?.connect?.id) {
    mapped.author_id = data.author.connect.id;
    delete mapped.author;
  }
  const doc = await Post.create(mapped);
  return { ...doc.toObject(), id: doc._id.toString() };
}

export function countCommentsByPostIds(postIds: string[]) {
  return Comment.aggregate([
    { $match: { post_id: { $in: postIds.map((id) => new mongoose.Types.ObjectId(id)) } } },
    { $group: { _id: '$post_id', _count: { $sum: 1 } } },
  ]).then((results) =>
    results.map((r) => ({ post_id: r._id.toString(), _count: { id: r._count } })),
  );
}

export function updateByAuthor(
  id: string,
  authorId: string,
  data: { content?: string; media_type?: string | null; media_url?: string | null; visibility?: string },
) {
  return Post.updateMany({ _id: id, author_id: authorId }, data);
}

export function deleteByAuthor(id: string, authorId: string) {
  return Post.deleteMany({ _id: id, author_id: authorId });
}
