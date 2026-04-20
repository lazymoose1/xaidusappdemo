import { describe, it, expect, vi, beforeEach } from 'vitest';
import { request, authRequest } from '../helpers/request';
import { ParentChildLink, Goal, User } from '../../models';

describe('Parent portal isolation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('teen role is rejected from parent portal', () => {
    it('GET /api/parent-portal/children returns 403 for teen role', async () => {
      // demo-token gives role='teen'; parent portal requires ['parent','educator','admin']
      const res = await authRequest().get('/api/parent-portal/children');

      expect(res.status).toBe(403);
      expect(res.body.error).toBe('Forbidden');
    });

    it('GET /api/parent-portal/dashboard returns 403 for teen role', async () => {
      const res = await authRequest().get('/api/parent-portal/dashboard');

      expect(res.status).toBe(403);
      expect(res.body.error).toBe('Forbidden');
    });

    it('GET /api/parent-portal/weekly-summary returns 403 for teen role', async () => {
      const res = await authRequest().get('/api/parent-portal/weekly-summary');

      expect(res.status).toBe(403);
      expect(res.body.error).toBe('Forbidden');
    });

    it('GET /api/parent-portal/ai-suggested-goals returns 403 for teen role', async () => {
      const res = await authRequest().get('/api/parent-portal/ai-suggested-goals');

      expect(res.status).toBe(403);
      expect(res.body.error).toBe('Forbidden');
    });
  });

  describe('unauthenticated access is rejected', () => {
    it('GET /api/parent-portal/children returns 401 without auth', async () => {
      const res = await request.get('/api/parent-portal/children');

      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Unauthorized');
    });

    it('GET /api/parent-portal/dashboard returns 401 without auth', async () => {
      const res = await request.get('/api/parent-portal/dashboard');

      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Unauthorized');
    });
  });
});
