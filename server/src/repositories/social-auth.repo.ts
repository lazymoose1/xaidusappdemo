import { SocialAuthToken } from '../models';
import { withId, withIds } from '../lib/mongo-helpers';

export async function findByUserAndPlatform(userId: string, platform: string) {
  const doc = await SocialAuthToken.findOne({ user_id: userId, platform }).lean();
  return withId(doc);
}

export async function upsert(data: {
  userId: string;
  platform: string;
  accessToken: string;
  refreshToken?: string | null;
  expiresAt?: Date | null;
  socialUserId?: string | null;
  scope?: string | null;
  profile?: any;
}) {
  const doc = await SocialAuthToken.findOneAndUpdate(
    { user_id: data.userId, platform: data.platform },
    {
      $set: {
        access_token: data.accessToken,
        refresh_token: data.refreshToken,
        expires_at: data.expiresAt,
        social_user_id: data.socialUserId,
        scope: data.scope,
        profile: data.profile,
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
  const docs = await SocialAuthToken.find({
    expires_at: { $ne: null, $lt: new Date() },
  }).lean();
  return withIds(docs);
}

export function countAll() {
  return SocialAuthToken.countDocuments();
}

export async function findAllByUserId(userId: string) {
  const docs = await SocialAuthToken.find({
    user_id: userId,
    $or: [{ expires_at: null }, { expires_at: { $gt: new Date() } }],
  }).lean();
  return withIds(docs);
}
