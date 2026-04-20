import { Request, Response, NextFunction } from 'express';
import * as threadRepo from '../repositories/thread.repo';
import * as messageRepo from '../repositories/message.repo';
import { NotFoundError, ForbiddenError } from '../lib/errors';

function normalizeThread(thread: any, currentUserId: string) {
  const participants = (thread.members || []).map((m: any) => m.user_id);
  const readBy = (thread.read_by as Record<string, string>) || {};
  const lastRead = readBy[currentUserId]
    ? new Date(readBy[currentUserId])
    : null;
  const lastMessageAt = thread.last_message_at
    ? new Date(thread.last_message_at)
    : null;
  const unreadCount =
    lastMessageAt && (!lastRead || lastMessageAt > lastRead) ? 1 : 0;

  return {
    id: thread.id,
    participants,
    type: thread.type || 'dm',
    title: thread.title || '',
    lastMessage: thread.last_message || null,
    lastMessageAt,
    unreadCount,
  };
}

function normalizeMessage(message: any) {
  return {
    id: message.id,
    threadId: message.thread_id,
    senderId: message.sender_id,
    text: message.text,
    attachments: message.attachments || [],
    createdAt: message.created_at,
  };
}

async function assertMembership(threadId: string, userId: string) {
  const thread = await threadRepo.findById(threadId);
  if (!thread) throw new NotFoundError('Thread');
  const isMember = (thread.members || []).some(
    (m: any) => m.user_id === userId,
  );
  if (!isMember) throw new ForbiddenError();
  return thread;
}

export async function listThreads(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const threads = await threadRepo.findByUserId(req.user.id);
    return res.json({
      threads: threads.map((t) => normalizeThread(t, req.user!.id)),
    });
  } catch (err) {
    next(err);
  }
}

export async function getThread(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const thread = await assertMembership(req.params.threadId, req.user.id);
    return res.json({ thread: normalizeThread(thread, req.user.id) });
  } catch (err) {
    next(err);
  }
}

export async function getMessages(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    await assertMembership(req.params.threadId, req.user.id);

    let before: Date | undefined;
    if (req.query.before) {
      const parsed = new Date(String(req.query.before));
      if (isNaN(parsed.getTime())) {
        return res.status(400).json({ error: 'Invalid before date' });
      }
      before = parsed;
    }
    const rawLimit = Number(req.query.limit);
    const limit = Number.isFinite(rawLimit) && rawLimit >= 1 && rawLimit <= 100
      ? Math.floor(rawLimit)
      : 30;

    const messages = await messageRepo.findByThreadId(
      req.params.threadId,
      before,
      limit,
    );
    const ordered = [...messages].reverse();
    return res.json({ messages: ordered.map(normalizeMessage) });
  } catch (err) {
    next(err);
  }
}

export async function createThread(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

    const { participantIds = [], title, type = 'dm' } = req.body || {};
    if (!Array.isArray(participantIds) || participantIds.length === 0) {
      return res.status(400).json({ error: 'participantIds required' });
    }

    const uniqueIds = Array.from(
      new Set([...participantIds.map(String), req.user.id]),
    );
    if (uniqueIds.length < 2) {
      return res.status(400).json({ error: 'At least two participants required' });
    }

    // Reuse DM thread if exact participants match
    if (type === 'dm' && uniqueIds.length === 2) {
      const existing = await threadRepo.findDmThread(
        uniqueIds[0],
        uniqueIds[1],
      );
      if (existing) {
        return res.json({
          thread: normalizeThread(existing, req.user.id),
          reused: true,
        });
      }
    }

    const thread = await threadRepo.create({
      type,
      title: title || '',
      createdBy: req.user.id,
      memberIds: uniqueIds,
    });

    return res.status(201).json({ thread: normalizeThread(thread, req.user.id) });
  } catch (err) {
    next(err);
  }
}

export async function sendMessage(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

    const { text, attachments = [] } = req.body || {};
    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'text is required' });
    }

    const thread = await assertMembership(req.params.threadId, req.user.id);

    const message = await messageRepo.create({
      threadId: thread.id,
      senderId: req.user.id,
      text: text.slice(0, 2000),
      attachments,
    });

    // Update thread's last message
    const readBy = (thread.read_by as Record<string, string>) || {};
    readBy[req.user.id] = new Date().toISOString();

    await threadRepo.update(thread.id, {
      last_message: {
        senderId: req.user.id,
        text: text.slice(0, 280),
        createdAt: message.created_at.toISOString(),
      },
      last_message_at: message.created_at,
      read_by: readBy,
    });

    return res.status(201).json({ message: normalizeMessage(message) });
  } catch (err) {
    next(err);
  }
}

export async function markRead(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const thread = await assertMembership(req.params.threadId, req.user.id);

    const readBy = (thread.read_by as Record<string, string>) || {};
    readBy[req.user.id] = new Date().toISOString();

    await threadRepo.update(thread.id, { read_by: readBy });
    return res.json({ success: true });
  } catch (err) {
    next(err);
  }
}
