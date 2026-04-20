import { describe, it, expect, vi, beforeEach } from 'vitest';
import { request, authRequest } from '../helpers/request';

vi.mock('../../services/goal.service', () => ({
  listGoals: vi.fn().mockResolvedValue([
    { id: 'g1', title: 'Test Goal', progress: 50, completed: false },
  ]),
  getTodayGoals: vi.fn().mockResolvedValue([
    { id: 'g1', title: 'Today Goal', progress: 0, completed: false, plannedCount: 2, completedThisWeek: 0 },
  ]),
  createGoal: vi.fn().mockResolvedValue({
    id: 'g-new', title: 'New Goal', progress: 0, completed: false,
  }),
  completeGoal: vi.fn().mockResolvedValue({
    id: 'g1', title: 'Test Goal', progress: 100, completed: true,
  }),
  checkinGoal: vi.fn().mockResolvedValue({
    id: 'g1', title: 'Test Goal', completedThisWeek: 1, plannedCount: 2,
  }),
  addMilestone: vi.fn().mockResolvedValue({
    id: 'g1', title: 'Test Goal', milestones: [{ title: 'Step 1' }],
  }),
  deleteGoal: vi.fn().mockResolvedValue({ success: true }),
  updateSchedule: vi.fn().mockResolvedValue({
    id: 'g1', title: 'Test Goal', plannedDays: { mon: true },
  }),
  weeklyReset: vi.fn().mockResolvedValue({ ok: true, updated: 3 }),
  completeMilestone: vi.fn().mockResolvedValue({
    id: 'g1', title: 'Test Goal', progress: 50,
  }),
}));

describe('Goals routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/goals', () => {
    it('returns 200 with array of goals', async () => {
      const res = await authRequest().get('/api/goals');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it('returns 401 without auth', async () => {
      const res = await request.get('/api/goals');
      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/goals/today', () => {
    it('returns 200 with today goals', async () => {
      const res = await authRequest().get('/api/goals/today');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  describe('POST /api/goals', () => {
    it('returns 201 when creating a goal', async () => {
      const res = await authRequest()
        .post('/api/goals')
        .send({ title: 'New Goal' });
      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('id');
    });

    it('returns 400 for missing title', async () => {
      const res = await authRequest()
        .post('/api/goals')
        .send({});
      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error', 'Invalid request');
    });

    it('returns 400 for empty title', async () => {
      const res = await authRequest()
        .post('/api/goals')
        .send({ title: '' });
      expect(res.status).toBe(400);
    });

    it('returns 401 without auth', async () => {
      const res = await request
        .post('/api/goals')
        .send({ title: 'Goal' });
      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/goals/:id/complete', () => {
    it('returns 200 when completing a goal', async () => {
      const res = await authRequest().post('/api/goals/g1/complete');
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('completed', true);
    });
  });

  describe('POST /api/goals/:id/checkin', () => {
    it('returns 200 with valid checkin', async () => {
      const res = await authRequest()
        .post('/api/goals/g1/checkin')
        .send({ status: 'yes' });
      expect(res.status).toBe(200);
    });

    it('returns 400 for invalid status', async () => {
      const res = await authRequest()
        .post('/api/goals/g1/checkin')
        .send({ status: 'invalid' });
      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error', 'Invalid request');
    });
  });

  describe('POST /api/goals/:id/milestones', () => {
    it('returns 201 when adding a milestone', async () => {
      const res = await authRequest()
        .post('/api/goals/g1/milestones')
        .send({ title: 'Step 1' });
      expect(res.status).toBe(201);
    });

    it('returns 400 for missing title', async () => {
      const res = await authRequest()
        .post('/api/goals/g1/milestones')
        .send({});
      expect(res.status).toBe(400);
    });
  });

  describe('DELETE /api/goals/:id', () => {
    it('returns 200 when deleting a goal', async () => {
      const res = await authRequest().delete('/api/goals/g1');
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('success', true);
    });
  });

  describe('PUT /api/goals/:id/schedule', () => {
    it('returns 200 when updating schedule', async () => {
      const res = await authRequest()
        .put('/api/goals/g1/schedule')
        .send({ plannedDays: { mon: true, tue: true } });
      expect(res.status).toBe(200);
    });
  });

  describe('POST /api/goals/weekly/reset', () => {
    it('returns 200 for weekly reset', async () => {
      const res = await authRequest().post('/api/goals/weekly/reset');
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('ok', true);
    });
  });

  describe('POST /api/goals/:goalId/milestones/:milestoneIndex/complete', () => {
    it('returns 200 when completing a milestone', async () => {
      const res = await authRequest()
        .post('/api/goals/g1/milestones/0/complete');
      expect(res.status).toBe(200);
    });
  });
});
