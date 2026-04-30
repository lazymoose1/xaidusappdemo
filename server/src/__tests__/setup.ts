// Must set env vars BEFORE any app code imports (env.ts calls process.exit if missing)
process.env.NODE_ENV = 'development';
process.env.MONGODB_URI = 'mongodb://localhost:27017/dus-test';
process.env.SUPABASE_URL = 'https://test.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key';
process.env.SYSTEM_API_KEY = 'test-api-key';
process.env.FRONTEND_ORIGIN = 'http://localhost:5173';

import { vi } from 'vitest';

// Helper to create a chainable query mock (supports .select().lean(), .sort().limit().lean(), etc.)
function chainable(finalValue: any = []) {
  const fn = vi.fn();
  const chain: any = {
    select: vi.fn().mockReturnThis(),
    sort: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    skip: vi.fn().mockReturnThis(),
    populate: vi.fn().mockReturnThis(),
    lean: vi.fn().mockResolvedValue(finalValue),
    exec: vi.fn().mockResolvedValue(finalValue),
    then: (resolve: any) => Promise.resolve(finalValue).then(resolve),
  };
  // Make the fn return the chain
  fn.mockReturnValue(chain);
  return fn;
}

// Default demo user for tests (demo-token sets req.user.id = 'demo-user')
const demoUser = {
  _id: 'demo-user',
  auth_id: 'demo-auth-id',
  email: 'demo@test.com',
  role: 'teen',
  display_name: 'Demo User',
  avatar_url: '',
  interests: [],
  archetype: '',
  social_ids: {},
  cohort_code: null,
  reminder_windows: [],
  coach_style: 'calm',
  parent_contact: null,
  consent_flags: null,
  created_at: new Date(),
  updated_at: new Date(),
};

// Mock Mongoose models
const mockModels = {
  User: {
    findById: chainable(demoUser),
    findOne: chainable(null),
    find: chainable([]),
    create: vi.fn().mockResolvedValue({ _id: 'mock-id', toObject: () => ({}) }),
    findByIdAndUpdate: chainable(null),
    findByIdAndDelete: vi.fn().mockResolvedValue(null),
    updateMany: vi.fn().mockResolvedValue({ modifiedCount: 0 }),
    countDocuments: vi.fn().mockResolvedValue(0),
  },
  Goal: {
    findById: chainable(null),
    findOne: chainable(null),
    find: chainable([]),
    create: vi.fn().mockResolvedValue({ _id: 'mock-id', toObject: () => ({}) }),
    findByIdAndUpdate: chainable(null),
    findByIdAndDelete: vi.fn().mockResolvedValue(null),
    updateMany: vi.fn().mockResolvedValue({ modifiedCount: 0 }),
    countDocuments: vi.fn().mockResolvedValue(0),
  },
  Post: {
    findById: chainable(null),
    findOne: chainable(null),
    find: chainable([]),
    create: vi.fn().mockResolvedValue({ _id: 'mock-id', toObject: () => ({}) }),
    findByIdAndUpdate: chainable(null),
    findByIdAndDelete: vi.fn().mockResolvedValue(null),
    updateMany: vi.fn().mockResolvedValue({ modifiedCount: 0 }),
    deleteMany: vi.fn().mockResolvedValue({ deletedCount: 0 }),
    countDocuments: vi.fn().mockResolvedValue(0),
  },
  Comment: {
    findById: chainable(null),
    findOne: chainable(null),
    find: chainable([]),
    create: vi.fn().mockResolvedValue({ _id: 'mock-id', toObject: () => ({}) }),
    findByIdAndDelete: vi.fn().mockResolvedValue(null),
    countDocuments: vi.fn().mockResolvedValue(0),
    aggregate: vi.fn().mockResolvedValue([]),
  },
  Thread: {
    findById: chainable(null),
    findOne: chainable(null),
    find: chainable([]),
    create: vi.fn().mockResolvedValue({ _id: 'mock-id', toObject: () => ({}) }),
    findByIdAndUpdate: chainable(null),
  },
  Message: {
    findById: chainable(null),
    find: chainable([]),
    create: vi.fn().mockResolvedValue({ _id: 'mock-id', toObject: () => ({}) }),
  },
  Checkin: {
    find: chainable([]),
    create: vi.fn().mockResolvedValue({ _id: 'mock-id', toObject: () => ({}) }),
    findOne: chainable(null),
  },
  AiGoalFeedback: {
    findOne: chainable(null),
    find: chainable([]),
    create: vi.fn().mockResolvedValue({ _id: 'mock-id', toObject: () => ({}) }),
    findByIdAndUpdate: chainable(null),
    findOneAndUpdate: chainable(null),
    countDocuments: vi.fn().mockResolvedValue(0),
  },
  SocialAuthToken: {
    findOne: chainable(null),
    find: chainable([]),
    findOneAndUpdate: chainable(null),
    countDocuments: vi.fn().mockResolvedValue(0),
  },
  ParentChildLink: {
    find: chainable([]),
    findOne: chainable(null),
    create: vi.fn().mockResolvedValue({ _id: 'mock-id', toObject: () => ({}) }),
  },
  PostCache: {
    findOne: chainable(null),
    find: chainable([]),
    findOneAndUpdate: chainable(null),
    countDocuments: vi.fn().mockResolvedValue(0),
    deleteMany: vi.fn().mockResolvedValue({ deletedCount: 0 }),
  },
};

vi.mock('../models', () => mockModels);

// Mock mongoose connection
vi.mock('../lib/mongoose', () => ({
  connectDB: vi.fn().mockResolvedValue(undefined),
  isDBConnected: vi.fn().mockReturnValue(true),
}));

// Mock rate-limiter with high limits to avoid 429 in tests while still producing headers
vi.mock('../middleware/rate-limiter', async (importOriginal) => {
  const rateLimit = (await import('express-rate-limit')).default;
  const opts = { windowMs: 15 * 60 * 1000, max: 10000, standardHeaders: true, legacyHeaders: false };
  return {
    generalLimiter: rateLimit(opts),
    authLimiter: rateLimit(opts),
    aiLimiter: rateLimit(opts),
    uploadLimiter: rateLimit(opts),
    cronLimiter: rateLimit(opts),
    parentPortalLimiter: rateLimit(opts),
    messagingLimiter: rateLimit(opts),
  };
});

// Mock Supabase admin client
vi.mock('../config/supabase', () => ({
  supabaseAdmin: {
    auth: {
      getUser: vi.fn(),
      admin: {
        getUserById: vi.fn().mockResolvedValue({ data: { user: { email: 'test@test.com' } } }),
      },
    },
  },
}));
