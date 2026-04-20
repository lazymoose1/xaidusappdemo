import { describe, it, expect, vi, beforeEach } from 'vitest';
import { request, authRequest } from '../helpers/request';

vi.mock('../../services/user.service', () => ({
  updatePreferences: vi.fn().mockResolvedValue({
    reminderWindows: ['morning'],
    coachStyle: 'calm',
    parentContact: {},
    consentFlags: {},
  }),
}));

describe('Settings routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /api/settings/preferences', () => {
    it('returns 200 when updating preferences', async () => {
      const res = await authRequest()
        .post('/api/settings/preferences')
        .send({ coachStyle: 'calm' });
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('coachStyle');
    });

    it('returns 401 without auth', async () => {
      const res = await request
        .post('/api/settings/preferences')
        .send({ coachStyle: 'calm' });
      expect(res.status).toBe(401);
    });
  });
});
