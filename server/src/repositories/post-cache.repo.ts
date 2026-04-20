import { PostCache } from '../models';
import { withId, withIds } from '../lib/mongo-helpers';

export async function findByUserAndPlatform(userId: string, platform: string) {
  const doc = await PostCache.findOne({ user_id: userId, platform }).lean();
  return withId(doc);
}

export async function upsert(data: {
  userId: string;
  platform: string;
  posts: any;
  expiresAt: Date;
}) {
  const doc = await PostCache.findOneAndUpdate(
    { user_id: data.userId, platform: data.platform },
    {
      $set: {
        posts: data.posts,
        fetched_at: new Date(),
        expires_at: data.expiresAt,
      },
      $setOnInsert: {
        user_id: data.userId,
        platform: data.platform,
      },
    },
    { upsert: true, new: true },
  ).lean();
  return withId(doc);
}

export async function findExpired() {
  const docs = await PostCache.find({ expires_at: { $lt: new Date() } }).lean();
  return withIds(docs);
}

/** No-op: TTL index handles automatic cleanup in MongoDB */
export async function deleteExpired() {
  return { deletedCount: 0 };
}

export function countAll() {
  return PostCache.countDocuments();
}

export async function findActive(userId: string, platform?: string | null) {
  const docs = await PostCache.find({
    user_id: userId,
    expires_at: { $gt: new Date() },
    ...(platform ? { platform } : {}),
  }).lean();
  return withIds(docs);
}
