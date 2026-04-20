import { describe, it, expect, vi, beforeEach } from 'vitest';
import { request } from '../helpers/request';

vi.mock('../../services/social.service', () => ({
  getSocialAuthMetrics: vi.fn().mockResolvedValue({
    totalConnections: 10,
    expiredConnections: 2,
  }),
  getCacheStats: vi.fn().mockResolvedValue({
    total: 20,
    active: 15,
    expired: 5,
  }),
}));

describe('Metrics routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/metrics/social-auth', () => {
    it('returns 401 without x-api-key', async () => {
      const res = await request.get('/api/metrics/social-auth');
      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty('error', 'Unauthorized');
    });

    it('returns 200 with correct x-api-key', async () => {
      const res = await request
        .get('/api/metrics/social-auth')
        .set('x-api-key', 'test-api-key');
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('ok', true);
      expect(res.body).toHaveProperty('metrics');
    });
  });

  describe('GET /api/metrics/cache', () => {
    it('returns 401 without x-api-key', async () => {
      const res = await request.get('/api/metrics/cache');
      expect(res.status).toBe(401);
    });

    it('returns 200 with correct x-api-key', async () => {
      const res = await request
        .get('/api/metrics/cache')
        .set('x-api-key', 'test-api-key');
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('ok', true);
      expect(res.body).toHaveProperty('stats');
    });
  });

  describe('GET /api/metrics/health', () => {
    it('returns 401 without x-api-key', async () => {
      const res = await request.get('/api/metrics/health');
      expect(res.status).toBe(401);
    });

    it('returns 200 with correct x-api-key', async () => {
      const res = await request
        .get('/api/metrics/health')
        .set('x-api-key', 'test-api-key');
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('ok', true);
      expect(res.body).toHaveProperty('status');
    });
  });
});
