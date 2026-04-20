import { Request, Response, NextFunction } from 'express';
import { ForumPost, ForumReply, User } from '../models';

function normalizePost(post: any, currentUserId: string) {
  return {
    id: (post._id as any).toString(),
    title: post.title,
    body: post.body,
    category: post.category,
    authorId: post.author_id?.toString(),
    authorName: post.author_display_name,
    isPinned: post.is_pinned,
    replyCount: post.reply_count,
    viewCount: post.view_count,
    likes: post.likes || [],
    likedByMe: (post.likes || []).includes(currentUserId),
    createdAt: post.created_at,
  };
}

function normalizeReply(reply: any, currentUserId: string) {
  return {
    id: (reply._id as any).toString(),
    postId: reply.post_id?.toString(),
    authorId: reply.author_id?.toString(),
    authorName: reply.author_display_name,
    body: reply.body,
    likes: reply.likes || [],
    likedByMe: (reply.likes || []).includes(currentUserId),
    createdAt: reply.created_at,
  };
}

async function getAuthorName(userId: string): Promise<string> {
  const user = await User.findById(userId).select('display_name').lean();
  return (user as any)?.display_name || 'Anonymous';
}

// GET /api/forum
export async function listPosts(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

    const search = String(req.query.search || '').trim();
    const category = String(req.query.category || '').trim();

    const filter: Record<string, any> = {};
    if (search) {
      filter.$or = [
        { title: new RegExp(search, 'i') },
        { body: new RegExp(search, 'i') },
      ];
    }
    if (category) filter.category = category;

    const posts = await ForumPost.find(filter)
      .sort({ is_pinned: -1, created_at: -1 })
      .limit(50)
      .lean();

    return res.json({ posts: posts.map((p) => normalizePost(p, req.user!.id)) });
  } catch (err) {
    next(err);
  }
}

// GET /api/forum/:postId
export async function getPost(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

    const post = await ForumPost.findById(req.params.postId).lean();
    if (!post) return res.status(404).json({ error: 'Post not found' });

    // Increment view count (fire and forget)
    ForumPost.findByIdAndUpdate(req.params.postId, { $inc: { view_count: 1 } }).exec().catch(() => undefined);

    const replies = await ForumReply.find({ post_id: req.params.postId })
      .sort({ created_at: 1 })
      .lean();

    return res.json({
      post: normalizePost(post, req.user.id),
      replies: replies.map((r) => normalizeReply(r, req.user!.id)),
    });
  } catch (err) {
    next(err);
  }
}

// POST /api/forum
export async function createPost(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

    const { title, body, category } = req.body;
    if (!title?.trim() || !body?.trim()) {
      return res.status(400).json({ error: 'title and body are required' });
    }

    const authorName = await getAuthorName(req.user.id);

    const post = await ForumPost.create({
      title: title.trim().slice(0, 200),
      body: body.trim().slice(0, 10000),
      category: category || 'General',
      author_id: req.user.id,
      author_display_name: authorName,
      is_pinned: false,
    });

    return res.status(201).json({ post: normalizePost(post.toObject(), req.user.id) });
  } catch (err) {
    next(err);
  }
}

// POST /api/forum/:postId/replies
export async function createReply(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

    const { body } = req.body;
    if (!body?.trim()) return res.status(400).json({ error: 'body is required' });

    const post = await ForumPost.findById(req.params.postId);
    if (!post) return res.status(404).json({ error: 'Post not found' });

    const authorName = await getAuthorName(req.user.id);

    const reply = await ForumReply.create({
      post_id: req.params.postId,
      author_id: req.user.id,
      author_display_name: authorName,
      body: body.trim().slice(0, 5000),
    });

    post.reply_count = (post.reply_count || 0) + 1;
    await post.save();

    return res.status(201).json({ reply: normalizeReply(reply.toObject(), req.user.id) });
  } catch (err) {
    next(err);
  }
}

// POST /api/forum/:postId/like
export async function likePost(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

    const post = await ForumPost.findById(req.params.postId);
    if (!post) return res.status(404).json({ error: 'Post not found' });

    const idx = post.likes.indexOf(req.user.id);
    if (idx === -1) {
      post.likes.push(req.user.id);
    } else {
      post.likes.splice(idx, 1);
    }
    await post.save();

    return res.json({ likes: post.likes.length, likedByMe: idx === -1 });
  } catch (err) {
    next(err);
  }
}

// POST /api/forum/:postId/replies/:replyId/like
export async function likeReply(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

    const reply = await ForumReply.findOne({
      _id: req.params.replyId,
      post_id: req.params.postId,
    });
    if (!reply) return res.status(404).json({ error: 'Reply not found' });

    const idx = reply.likes.indexOf(req.user.id);
    if (idx === -1) {
      reply.likes.push(req.user.id);
    } else {
      reply.likes.splice(idx, 1);
    }
    await reply.save();

    return res.json({ likes: reply.likes.length, likedByMe: idx === -1 });
  } catch (err) {
    next(err);
  }
}
