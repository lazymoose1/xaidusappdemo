import { describe, it, expect, vi, beforeEach } from 'vitest';
import { request, authRequest } from '../helpers/request';

// Parent portal routes require parent/educator/admin role.
// demo-token gives role 'teen', so all should return 403.

describe('Parent Portal routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/parent-portal/overview', () => {
    it('returns 403 for teen role (demo-token)', async () => {
      const res = await authRequest().get('/api/parent-portal/overview');
      expect(res.status).toBe(403);
      expect(res.body).toHaveProperty('error', 'Forbidden');
    });

    it('returns 401 without auth', async () => {
      const res = await request.get('/api/parent-portal/overview');
      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/parent-portal/children', () => {
    it('returns 403 for teen role', async () => {
      const res = await authRequest().get('/api/parent-portal/children');
      expect(res.status).toBe(403);
    });

    it('returns 401 without auth', async () => {
      const res = await request.get('/api/parent-portal/children');
      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/parent-portal/weekly-summary', () => {
    it('returns 403 for teen role', async () => {
      const res = await authRequest().get('/api/parent-portal/weekly-summary');
      expect(res.status).toBe(403);
    });
  });

  describe('POST /api/parent-portal/weekly-summary/send', () => {
    it('returns 403 for teen role', async () => {
      const res = await authRequest().post('/api/parent-portal/weekly-summary/send');
      expect(res.status).toBe(403);
    });
  });

  describe('GET /api/parent-portal/ai-suggested-goals', () => {
    it('returns 403 for teen role', async () => {
      const res = await authRequest().get('/api/parent-portal/ai-suggested-goals');
      expect(res.status).toBe(403);
    });
  });

  describe('POST /api/parent-portal/children/:childId/goals/:goalId/feedback', () => {
    it('returns 403 for teen role', async () => {
      const res = await authRequest()
        .post('/api/parent-portal/children/child1/goals/g1/feedback')
        .send({ feedback: 'Great work!' });
      expect(res.status).toBe(403);
    });
  });

  describe('GET /api/parent-portal/dashboard', () => {
    it('returns 403 for teen role', async () => {
      const res = await authRequest().get('/api/parent-portal/dashboard');
      expect(res.status).toBe(403);
    });

    it('returns 401 without auth', async () => {
      const res = await request.get('/api/parent-portal/dashboard');
      expect(res.status).toBe(401);
    });
  });
});
