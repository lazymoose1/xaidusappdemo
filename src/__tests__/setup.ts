import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock Supabase client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
      onAuthStateChange: vi.fn().mockReturnValue({
        data: { subscription: { unsubscribe: vi.fn() } },
      }),
      signUp: vi.fn(),
      signInWithPassword: vi.fn(),
      signOut: vi.fn(),
    },
  },
}));

// Mock import.meta.env
vi.stubGlobal('import.meta', {
  env: {
    VITE_API_BASE: 'http://localhost:4000',
    VITE_DEMO_MODE: 'false',
    VITE_SUPABASE_URL: 'https://test.supabase.co',
    VITE_SUPABASE_PUBLISHABLE_KEY: 'test-anon-key',
  },
});
