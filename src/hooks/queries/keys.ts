export const queryKeys = {
  goals: {
    all: ['goals'] as const,
    today: ['goals', 'today'] as const,
  },
  posts: {
    all: ['posts'] as const,
    detail: (id: string) => ['posts', id] as const,
    comments: (id: string) => ['posts', id, 'comments'] as const,
  },
  threads: {
    all: ['threads'] as const,
    detail: (id: string) => ['threads', id] as const,
    messages: (id: string) => ['threads', id, 'messages'] as const,
  },
  achievements: ['achievements'] as const,
  parentPortal: {
    children: ['parent-portal', 'children'] as const,
    weeklySummary: ['parent-portal', 'weekly-summary'] as const,
    dashboard: ['parent-portal', 'dashboard'] as const,
  },
  profile: (id?: string) => ['profile', id] as const,
  reminders: ['reminders'] as const,
  users: (query?: string) => ['users', query] as const,
};
