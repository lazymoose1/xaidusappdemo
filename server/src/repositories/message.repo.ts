import { Message } from '../models';
import { withIds } from '../lib/mongo-helpers';

export async function findByThreadId(
  threadId: string,
  before?: Date,
  limit: number = 30,
) {
  const safeLimit = Math.min(limit, 100);
  const filter: Record<string, any> = { thread_id: threadId };
  if (before) {
    filter.created_at = { $lt: before };
  }
  const docs = await Message.find(filter)
    .sort({ created_at: -1 })
    .limit(safeLimit)
    .lean();
  return withIds(docs);
}

export async function create(data: {
  threadId: string;
  senderId: string;
  text: string;
  attachments?: string[];
}) {
  const doc = await Message.create({
    thread_id: data.threadId,
    sender_id: data.senderId,
    text: data.text,
    attachments: data.attachments || [],
  });
  return { ...doc.toObject(), id: doc._id.toString() };
}
