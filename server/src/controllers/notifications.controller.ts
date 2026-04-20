import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { ScoutNudge, Thread, ForumPost, ForumReply } from '../models';

export interface NotificationItem {
  id: string;
  type: 'nudge' | 'thread_message' | 'forum_reply';
  title: string;
  body: string;
  linkTo: string;
  createdAt: Date;
  read: boolean;
}

// GET /api/notifications
export async function getNotifications(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

    const userId = req.user.id;
    const userObjId = new mongoose.Types.ObjectId(userId);
    const items: NotificationItem[] = [];

    // 1. Scout nudges (unacknowledged leader_nudge sent to this user)
    const nudges = await ScoutNudge.find({
      to_user_id: userObjId,
      type: 'leader_nudge',
      acknowledged: false,
    })
      .sort({ created_at: -1 })
      .limit(10)
      .lean();

    for (const n of nudges) {
      items.push({
        id: (n._id as any).toString(),
        type: 'nudge',
        title: 'Your leader sent you a nudge',
        body: n.message || 'Check in when you can.',
        linkTo: '/notifications',
        createdAt: n.created_at,
        read: false,
      });
    }

    // 2. Unread thread messages (threads where user is a member and
    //    last_message_at is more recent than their last read timestamp)
    const threads = await Thread.find({ 'members.user_id': userObjId })
      .sort({ last_message_at: -1 })
      .limit(20)
      .lean();

    for (const t of threads) {
      const lastMsgAt = t.last_message_at ? new Date(t.last_message_at) : null;
      if (!lastMsgAt) continue;

      const readBy = (t.read_by as Record<string, string>) || {};
      const lastRead = readBy[userId] ? new Date(readBy[userId]) : null;

      // Unread if no read timestamp, or last message is newer than last read
      const isUnread = !lastRead || lastMsgAt > lastRead;
      if (!isUnread) continue;

      // Don't notify about the user's own last message
      const lastSender = t.last_message?.senderId?.toString();
      if (lastSender === userId) continue;

      items.push({
        id: `thread-${(t._id as any).toString()}`,
        type: 'thread_message',
        title: t.title || 'New message',
        body: t.last_message?.text?.slice(0, 100) || 'New message in chat',
        linkTo: `/messages/${(t._id as any).toString()}`,
        createdAt: lastMsgAt,
        read: false,
      });
    }

    // 3. Forum reply activity
    // Posts this user authored — find any that have new replies (reply_count > 0, recent activity)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const myPosts = await ForumPost.find({
      author_id: userObjId,
      reply_count: { $gt: 0 },
    })
      .select('_id title reply_count created_at')
      .lean();

    const myPostIds = myPosts.map((p) => (p._id as any).toString());

    // Find the most recent reply to each of my posts that isn't from me
    for (const post of myPosts) {
      const latestReply = await ForumReply.findOne({
        post_id: post._id,
        author_id: { $ne: userObjId },
        created_at: { $gte: thirtyDaysAgo },
      })
        .sort({ created_at: -1 })
        .lean();

      if (!latestReply) continue;

      items.push({
        id: `forum-reply-${(latestReply._id as any).toString()}`,
        type: 'forum_reply',
        title: `New reply on "${post.title}"`,
        body: latestReply.body.slice(0, 100),
        linkTo: `/forums/${(post._id as any).toString()}`,
        createdAt: latestReply.created_at,
        read: false,
      });
    }

    // Posts this user replied to (but didn't author) — find newer replies from others
    if (myPostIds.length < 20) {
      const myReplies = await ForumReply.find({
        author_id: userObjId,
        created_at: { $gte: thirtyDaysAgo },
      })
        .distinct('post_id');

      // Filter out posts already covered above (posts I authored)
      const watchedPostIds = myReplies
        .map((id) => id.toString())
        .filter((id) => !myPostIds.includes(id));

      for (const postId of watchedPostIds.slice(0, 10)) {
        const post = await ForumPost.findById(postId)
          .select('_id title reply_count')
          .lean();
        if (!post || !post.reply_count) continue;

        // Find replies newer than MY last reply to this post
        const myLastReply = await ForumReply.findOne({
          post_id: postId,
          author_id: userObjId,
        })
          .sort({ created_at: -1 })
          .select('created_at')
          .lean();

        if (!myLastReply) continue;

        const newerReply = await ForumReply.findOne({
          post_id: postId,
          author_id: { $ne: userObjId },
          created_at: { $gt: myLastReply.created_at },
        })
          .sort({ created_at: -1 })
          .lean();

        if (!newerReply) continue;

        items.push({
          id: `forum-watched-${(newerReply._id as any).toString()}`,
          type: 'forum_reply',
          title: `New reply on "${(post as any).title}"`,
          body: newerReply.body.slice(0, 100),
          linkTo: `/forums/${postId}`,
          createdAt: newerReply.created_at,
          read: false,
        });
      }
    }

    // Sort all items newest first
    items.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    if (process.env.NODE_ENV !== 'production') {
      console.debug('[NUDGE DIAG] notifications result', {
        userId,
        nudgeCount: nudges.length,
        totalItems: items.length,
      });
    }

    return res.json({
      items: items.slice(0, 30),
      total: items.length,
    });
  } catch (err) {
    next(err);
  }
}
