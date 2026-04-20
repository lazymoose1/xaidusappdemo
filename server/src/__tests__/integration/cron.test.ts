import { describe, it, expect, vi, beforeEach } from 'vitest';
import { request } from '../helpers/request';

vi.mock('../../services/goal.service', () => ({
  resetAllGoals: vi.fn().mockResolvedValue(5),
}));

vi.mock('../../services/social.service', () => ({
  cleanExpiredCache: vi.fn().mockResolvedValue({ count: 3 }),
}));

vi.mock('../../services/reminder.service', () => ({
  getDueReminders: vi.fn().mockResolvedValue([]),
  formatReminderMessage: vi.fn().mockReturnValue('Time to work on your goal!'),
}));

describe('Cron routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /api/cron/weekly-reset', () => {
    it('returns 401 without x-api-key', async () => {
      const res = await request.post('/api/cron/weekly-reset');
      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty('error', 'Unauthorized');
    });

    it('returns 401 with wrong x-api-key', async () => {
      const res = await request
        .post('/api/cron/weekly-reset')
        .set('x-api-key', 'wrong-key');
      expect(res.status).toBe(401);
    });

    it('returns 200 with correct x-api-key', async () => {
      const res = await request
        .post('/api/cron/weekly-reset')
        .set('x-api-key', 'test-api-key');
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('ok', true);
    });
  });

  describe('POST /api/cron/cache-refresh', () => {
    it('returns 401 without x-api-key', async () => {
      const res = await request.post('/api/cron/cache-refresh');
      expect(res.status).toBe(401);
    });

    it('returns 200 with correct x-api-key', async () => {
      const res = await request
        .post('/api/cron/cache-refresh')
        .set('x-api-key', 'test-api-key');
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('ok', true);
    });
  });

  describe('POST /api/cron/cache-cleanup', () => {
    it('returns 401 without x-api-key', async () => {
      const res = await request.post('/api/cron/cache-cleanup');
      expect(res.status).toBe(401);
    });

    it('returns 200 with correct x-api-key', async () => {
      const res = await request
        .post('/api/cron/cache-cleanup')
        .set('x-api-key', 'test-api-key');
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('ok', true);
    });
  });

  describe('POST /api/cron/reminder-delivery', () => {
    it('returns 401 without x-api-key', async () => {
      const res = await request.post('/api/cron/reminder-delivery');
      expect(res.status).toBe(401);
    });

    it('returns 200 with correct x-api-key', async () => {
      const res = await request
        .post('/api/cron/reminder-delivery')
        .set('x-api-key', 'test-api-key');
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('ok', true);
    });
  });
});
