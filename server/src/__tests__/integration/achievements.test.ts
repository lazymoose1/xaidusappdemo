import { describe, it, expect, vi, beforeEach } from 'vitest';
import { request, authRequest } from '../helpers/request';

vi.mock('../../services/achievement.service', () => ({
  getAchievements: vi.fn().mockResolvedValue({
    streak: { current: 0, longest: 0, lastUpdated: new Date().toISOString() },
    badges: [
      { id: 'starter', title: 'First Step', earned: false, progress: 0 },
    ],
    achievements: [
      { id: 'focus-streak', title: 'Stay on Target', progress: 0, target: '5 check-ins' },
    ],
  }),
}));

describe('Achievements routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/achievements', () => {
    it('returns 200 with achievements data', async () => {
      const res = await authRequest().get('/api/achievements');
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('streak');
      expect(res.body).toHaveProperty('badges');
      expect(res.body).toHaveProperty('achievements');
    });

    it('returns 401 without auth', async () => {
      const res = await request.get('/api/achievements');
      expect(res.status).toBe(401);
    });
  });
});
