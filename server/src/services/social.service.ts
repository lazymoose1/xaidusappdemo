import * as socialAuthRepo from '../repositories/social-auth.repo';
import * as postCacheRepo from '../repositories/post-cache.repo';

export async function getAllSocialAuthByUser(userId: string) {
  const tokens = await socialAuthRepo.findAllByUserId(userId);
  if (tokens.length === 0) return null;

  const map: Record<string, any> = {};
  for (const t of tokens) {
    map[t.platform] = {
      accessToken: t.access_token,
      refreshToken: t.refresh_token,
      socialUserId: t.social_user_id,
      profile: t.profile,
      scope: t.scope,
      expiresAt: t.expires_at,
    };
  }
  return map;
}

export async function getSocialAuthMetrics() {
  const total = await socialAuthRepo.countAll();
  const expired = await socialAuthRepo.findExpired();

  return {
    totalConnections: total,
    expiredConnections: expired.length,
  };
}

export async function getCachedUserPosts(
  userId: string,
  platform?: string | null,
) {
  const caches = await postCacheRepo.findActive(userId, platform);
  if (caches.length === 0) return null;

  const allPosts: any[] = [];
  for (const doc of caches) {
    const posts = (doc.posts as any[]) || [];
    allPosts.push(
      ...posts.map((p: any) => ({ ...p, platform: doc.platform })),
    );
  }

  allPosts.sort(
    (a, b) => new Date(b.time).getTime() - new Date(a.time).getTime(),
  );

  return {
    posts: allPosts,
    fetchedAt: caches[0]?.fetched_at,
    fromCache: true,
  };
}

export async function getCacheStats() {
  const total = await postCacheRepo.countAll();
  const expiredCaches = await postCacheRepo.findExpired();
  const active = total - expiredCaches.length;

  return { total, active, expired: expiredCaches.length };
}

export async function cleanExpiredCache() {
  const result = await postCacheRepo.deleteExpired();
  return result;
}
