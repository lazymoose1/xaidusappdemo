import { describe, it, expect, vi, beforeEach } from 'vitest';
import { request, authRequest } from '../helpers/request';

vi.mock('../../services/user.service', () => ({
  updateOnboarding: vi.fn().mockResolvedValue({
    id: 'demo-user',
    interests: ['coding'],
    archetype: 'achiever',
    cohortCode: '',
    nickname: 'Demo',
    avatar: '',
  }),
}));

describe('Onboarding routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /api/onboarding', () => {
    it('returns 200 when updating onboarding data', async () => {
      const res = await authRequest()
        .post('/api/onboarding')
        .send({ interests: ['coding'], archetype: 'achiever' });
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('id');
    });

    it('returns 401 without auth', async () => {
      const res = await request
        .post('/api/onboarding')
        .send({ interests: ['coding'] });
      expect(res.status).toBe(401);
    });
  });
});
