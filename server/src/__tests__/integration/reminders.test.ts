import { describe, it, expect, vi, beforeEach } from 'vitest';
import { request, authRequest } from '../helpers/request';

vi.mock('../../services/reminder.service', () => ({
  getUserReminders: vi.fn().mockResolvedValue([]),
  getDueReminders: vi.fn().mockResolvedValue([]),
  analyzeGoalCadence: vi.fn().mockResolvedValue({
    goalId: 'g1',
    averageCompletionTime: 0,
    milestoneCadence: '0/0 completed',
    userPattern: 'sporadic',
    recommendedFrequency: 'weekly',
    confidence: 0.4,
    reasoning: ['No milestones set'],
  }),
  generateReminderCadence: vi.fn().mockResolvedValue({
    frequency: 'weekly',
    preferredTime: '09:00',
    reasoning: 'No milestones set',
    confidence: 0.4,
  }),
  adaptReminderCadence: vi.fn().mockResolvedValue({
    frequency: 'weekly',
    preferredTime: '09:00',
    reasoning: 'Adapted',
    confidence: 0.5,
  }),
}));

describe('Reminders routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/reminders', () => {
    it('returns 200 with reminders', async () => {
      const res = await authRequest().get('/api/reminders');
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('total');
      expect(res.body).toHaveProperty('reminders');
    });

    it('returns 401 without auth', async () => {
      const res = await request.get('/api/reminders');
      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/reminders/due', () => {
    it('returns 200 with due reminders', async () => {
      const res = await authRequest().get('/api/reminders/due');
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('due');
      expect(res.body).toHaveProperty('reminders');
    });
  });

  describe('GET /api/reminders/:goalId/analysis', () => {
    it('returns 200 with analysis', async () => {
      const res = await authRequest().get('/api/reminders/g1/analysis');
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('analysis');
      expect(res.body).toHaveProperty('cadence');
      expect(res.body).toHaveProperty('nextReminderTime');
    });
  });

  describe('POST /api/reminders/:goalId/respond', () => {
    it('returns 200 with valid response', async () => {
      const res = await authRequest()
        .post('/api/reminders/g1/respond')
        .send({ response: 'completed' });
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('adaptedCadence');
    });

    it('returns 400 for invalid response value', async () => {
      const res = await authRequest()
        .post('/api/reminders/g1/respond')
        .send({ response: 'invalid' });
      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error', 'Invalid request');
    });

    it('returns 400 for missing response', async () => {
      const res = await authRequest()
        .post('/api/reminders/g1/respond')
        .send({});
      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/reminders/batch/due', () => {
    it('returns 200 with batch reminders (no auth required, no api key check on this endpoint)', async () => {
      const res = await request.get('/api/reminders/batch/due');
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('total');
      expect(res.body).toHaveProperty('reminders');
    });
  });
});
