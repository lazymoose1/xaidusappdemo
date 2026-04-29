import { describe, it, expect, vi, beforeEach } from 'vitest';
import { request, authRequest } from '../helpers/request';

vi.mock('../../services/ai.service', () => ({
  tinySuggest: vi.fn().mockResolvedValue({
    ok: true,
    suggestion: 'Break your goal into smaller steps',
    rating: 9.1,
    reason: 'Small steps raise follow-through',
  }),
  getAdvice: vi.fn().mockResolvedValue({
    goals: [{ title: 'Learn something', category: 'learning', reason: 'Growth', impactScore: 7, effortScore: 3 }],
    steps: [{ description: 'Start with 15 minutes', estMinutes: 15, goalTitle: 'Learn something' }],
    schedule: [{ cadence: 'daily', when: 'morning' }],
    insights: 'Start with one clear goal.',
    context: { goalCount: 0, completedCount: 0 },
  }),
  tinyAdvice: vi.fn().mockResolvedValue({
    ok: true,
    suggestion: 'Keep today small and real.',
    nextStep: 'Spend 10 minutes on the easiest useful part.',
    timingSuggestion: 'after school',
    rationale: 'Starting smaller makes follow-through easier.',
    tone: 'supportive',
    ageGroup: '14-18',
    meta: { fallbackUsed: false, socialContextUsed: false, providersConnected: ['openai'] },
  }),
  markGoalAIAdopted: vi.fn().mockResolvedValue({ adopted: true }),
  parentFeedback: vi.fn().mockResolvedValue({ reviewed: true }),
  getGoalAnalytics: vi.fn().mockResolvedValue({
    total: 5,
    completed: 2,
    inProgress: 3,
    aiSuggested: 1,
    aiAdopted: 1,
    byCategory: { personal: { total: 3, completed: 1 } },
    completionRate: 40,
    averageProgress: 35,
    milestonesCompleted: 2,
  }),
}));

// Rate limiters are mocked with high limits in setup.ts

describe('AI routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /api/ai/tiny', () => {
    it('returns 200 with suggestion', async () => {
      const res = await authRequest()
        .post('/api/ai/tiny')
        .send({ payload: { goal: 'Read more' } });
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('ok', true);
      expect(res.body).toHaveProperty('suggestion');
    });

    it('returns 401 without auth', async () => {
      const res = await request.post('/api/ai/tiny');
      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/ai/tiny/advice', () => {
    it('returns 200 with advice', async () => {
      const res = await authRequest()
        .post('/api/ai/tiny/advice')
        .send({ interests: ['coding'] });
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('ok', true);
      expect(res.body).toHaveProperty('suggestion');
      expect(res.body).toHaveProperty('nextStep');
    });
  });

  describe('POST /api/ai/goals/:goalId/mark-ai-adopted', () => {
    it('returns 200 marking goal as AI-adopted', async () => {
      const res = await authRequest()
        .post('/api/ai/goals/g1/mark-ai-adopted')
        .send({ suggestionId: 's1', adoptionReason: 'Liked it' });
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('adopted', true);
    });
  });

  describe('POST /api/ai/goals/:goalId/parent-feedback', () => {
    it('returns 200 with reviewed status', async () => {
      const res = await authRequest()
        .post('/api/ai/goals/g1/parent-feedback')
        .send({ parentFeedback: 'Good job!' });
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('reviewed', true);
    });
  });

  describe('GET /api/ai/user/goal-analytics', () => {
    it('returns 200 with analytics', async () => {
      const res = await authRequest().get('/api/ai/user/goal-analytics');
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('total');
      expect(res.body).toHaveProperty('completionRate');
    });

    it('returns 401 without auth', async () => {
      const res = await request.get('/api/ai/user/goal-analytics');
      expect(res.status).toBe(401);
    });
  });
});
