import { Comment } from '../models';
import { withId } from '../lib/mongo-helpers';

export async function findByPostId(postId: string) {
  const comments = await Comment.find({ post_id: postId })
    .sort({ created_at: -1 })
    .populate('author_id', 'display_name avatar_url')
    .lean();

  return comments.map((c) => {
    const author = c.author_id as any;
    return {
      ...c,
      id: c._id.toString(),
      author: author ? { ...author, id: author._id.toString() } : null,
    };
  });
}

export async function create(data: Record<string, any>) {
  // Handle Prisma-style connect syntax
  const mapped: Record<string, any> = { ...data };
  if (data.post?.connect?.id) {
    mapped.post_id = data.post.connect.id;
    delete mapped.post;
  }
  if (data.author?.connect?.id) {
    mapped.author_id = data.author.connect.id;
    delete mapped.author;
  }
  const doc = await Comment.create(mapped);
  return { ...doc.toObject(), id: doc._id.toString() };
}

export function countByPostId(postId: string) {
  return Comment.countDocuments({ post_id: postId });
}

export async function findById(id: string) {
  const doc = await Comment.findById(id).lean();
  return withId(doc);
}

export function remove(id: string) {
  return Comment.findByIdAndDelete(id);
}
