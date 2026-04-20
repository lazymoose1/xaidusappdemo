import { describe, it, expect, vi, beforeEach } from 'vitest';
import { request } from '../helpers/request';

describe('Rate limit headers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Auth endpoints (authLimiter)', () => {
    it('POST /api/auth/demo returns rate limit headers', async () => {
      process.env.NODE_ENV = 'development';

      const res = await request.post('/api/auth/demo');

      expect(res.status).toBe(200);
      const headers = res.headers;
      const hasRateLimitHeaders =
        headers['ratelimit-limit'] !== undefined ||
        headers['ratelimit-remaining'] !== undefined ||
        headers['ratelimit-reset'] !== undefined ||
        headers['ratelimit-policy'] !== undefined ||
        headers['x-ratelimit-limit'] !== undefined ||
        headers['x-ratelimit-remaining'] !== undefined;

      expect(hasRateLimitHeaders).toBe(true);
    });

    it('GET /api/auth/me returns rate limit headers', async () => {
      const res = await request
        .get('/api/auth/me')
        .set('Authorization', 'Bearer demo-token');

      expect(res.status).toBe(200);

      const headers = res.headers;
      const hasRateLimitHeaders =
        headers['ratelimit-limit'] !== undefined ||
        headers['ratelimit-remaining'] !== undefined ||
        headers['ratelimit-reset'] !== undefined ||
        headers['ratelimit-policy'] !== undefined;

      expect(hasRateLimitHeaders).toBe(true);
    });
  });

  describe('AI endpoints (aiLimiter)', () => {
    it('POST /api/ai/tiny returns rate limit headers', async () => {
      const res = await request
        .post('/api/ai/tiny')
        .set('Authorization', 'Bearer demo-token')
        .send({ interests: ['coding'], archetype: 'explorer' });

      const headers = res.headers;
      const hasRateLimitHeaders =
        headers['ratelimit-limit'] !== undefined ||
        headers['ratelimit-remaining'] !== undefined ||
        headers['ratelimit-reset'] !== undefined ||
        headers['ratelimit-policy'] !== undefined;

      expect(hasRateLimitHeaders).toBe(true);
    });
  });

  describe('General limiter', () => {
    it('GET /health returns rate limit headers from general limiter', async () => {
      const res = await request.get('/health');

      expect(res.status).toBe(200);

      const headers = res.headers;
      const hasRateLimitHeaders =
        headers['ratelimit-limit'] !== undefined ||
        headers['ratelimit-remaining'] !== undefined ||
        headers['ratelimit-reset'] !== undefined ||
        headers['ratelimit-policy'] !== undefined;

      expect(hasRateLimitHeaders).toBe(true);
    });
  });
});
