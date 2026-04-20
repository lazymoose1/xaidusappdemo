import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement } from 'react';
import { useGoals, useTodayGoals } from '@/hooks/queries/useGoals';

const mockGetAll = vi.fn();
const mockGetToday = vi.fn();

vi.mock('@/api/endpoints', () => ({
  goalsApi: {
    getAll: (...args: any[]) => mockGetAll(...args),
    getToday: (...args: any[]) => mockGetToday(...args),
    create: vi.fn(),
    checkin: vi.fn(),
    delete: vi.fn(),
    complete: vi.fn(),
    addMilestone: vi.fn(),
    completeMilestone: vi.fn(),
    updateSchedule: vi.fn(),
    weeklyReset: vi.fn(),
  },
}));

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });
  return ({ children }: { children: React.ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children);
}

describe('useGoals', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches all goals via goalsApi.getAll', async () => {
    const mockGoals = [
      { id: 'g1', title: 'Test Goal', progress: 50, completed: false },
    ];
    mockGetAll.mockResolvedValue(mockGoals);

    const { result } = renderHook(() => useGoals(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(mockGetAll).toHaveBeenCalledOnce();
    expect(result.current.data).toEqual(mockGoals);
  });

  it('returns error state when fetch fails', async () => {
    mockGetAll.mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useGoals(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toBeInstanceOf(Error);
  });
});

describe('useTodayGoals', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches today goals via goalsApi.getToday', async () => {
    const mockToday = [
      { id: 'tg1', title: 'Today Goal', microStep: 'Do it', plannedCount: 3, completedThisWeek: 1, progress: 0, completed: false },
    ];
    mockGetToday.mockResolvedValue(mockToday);

    const { result } = renderHook(() => useTodayGoals(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(mockGetToday).toHaveBeenCalledOnce();
    expect(result.current.data).toEqual(mockToday);
  });
});
