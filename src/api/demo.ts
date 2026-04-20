import type { ApiThread, ApiThreadMessage, ApiAchievementsResponse } from '@/types/api';

type DemoAchievementState = {
  streakCurrent: number;
  streakLongest: number;
  totalGoals: number;
  achievements: Record<'focus' | 'shipTwo', number>;
  lastUpdated: number;
};

let demoAchievementsMemoryState: DemoAchievementState | null = null;

export function buildMockResponse(path: string): any {
  const now = new Date();
  const daySeed = now.getDay();

  const demoThreads: ApiThread[] = [
    {
      id: 'demo-thread-1',
      participants: ['demo-user', 'coach-katie'],
      type: 'dm',
      title: 'Coach Katie',
      lastMessage: {
        senderId: 'coach-katie',
        text: 'Proud of your momentum this week. Want to add a mini goal?',
        createdAt: now.toISOString()
      },
      lastMessageAt: now.toISOString(),
      unreadCount: 0
    },
    {
      id: 'demo-thread-2',
      participants: ['demo-user', 'mentor-ari', 'parent-sam'],
      type: 'group',
      title: 'Family + Mentor',
      lastMessage: {
        senderId: 'mentor-ari',
        text: 'Shared a resource on study sprints. Thoughts?',
        createdAt: new Date(now.getTime() - 90 * 60 * 1000).toISOString()
      },
      lastMessageAt: new Date(now.getTime() - 90 * 60 * 1000).toISOString(),
      unreadCount: 1
    }
  ];

  const demoMessages = (threadId: string): ApiThreadMessage[] => {
    if (threadId === 'demo-thread-2') {
      return [
        { id: 'm-1', threadId, senderId: 'parent-sam', text: 'How are finals prep going?', createdAt: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString() },
        { id: 'm-2', threadId, senderId: 'mentor-ari', text: 'Try 25-minute sprints with 5-minute breaks.', createdAt: new Date(now.getTime() - 90 * 60 * 1000).toISOString() }
      ];
    }
    return [
      { id: 'm-3', threadId, senderId: 'coach-katie', text: 'How did your Thursday check-in go?', createdAt: new Date(now.getTime() - 4 * 60 * 60 * 1000).toISOString() },
      { id: 'm-4', threadId, senderId: 'demo-user', text: 'Good! I finished 2/3 micro goals.', createdAt: new Date(now.getTime() - 3 * 60 * 60 * 1000).toISOString() },
      { id: 'm-5', threadId, senderId: 'coach-katie', text: 'That is great. Want to celebrate with a short break?', createdAt: new Date(now.getTime() - 2.5 * 60 * 60 * 1000).toISOString() }
    ];
  };

  if (path.includes('/api/auth/me')) {
    return {
      id: 'demo-user',
      role: 'teen',
      displayName: 'Demo User',
      archetype: 'creator',
      interests: ['learning', 'creativity']
    };
  }
  if (path.includes('/api/parent-portal/children')) {
    return [
      {
        id: 'demo-teen-1', displayName: 'Sky Ramirez', avatarUrl: null, archetype: 'creator',
        goals: [
          { id: 'g1', title: 'Submit English essay', progress: 70 + (daySeed % 20), completed: false },
          { id: 'g2', title: 'Practice guitar 15 min', progress: 30 + (daySeed * 3) % 50, completed: false },
          { id: 'g3', title: 'Turn in math homework', progress: 100, completed: true }
        ]
      },
      {
        id: 'demo-teen-2', displayName: 'Jordan Lee', avatarUrl: null, archetype: 'strategist',
        goals: [
          { id: 'g4', title: 'Study biology 20 min', progress: 25 + (daySeed * 5) % 60, completed: false },
          { id: 'g5', title: 'Reply to teacher email', progress: 100, completed: true },
          { id: 'g6', title: 'SAT vocab 10 words', progress: 10 + (daySeed * 7) % 70, completed: false }
        ]
      },
      {
        id: 'demo-teen-3', displayName: 'Avery Chen', avatarUrl: null, archetype: 'explorer',
        goals: [
          { id: 'g7', title: 'Try a new recipe', progress: 50 + (daySeed * 6) % 40, completed: false },
          { id: 'g8', title: 'Go for a 20 min walk', progress: 100, completed: true }
        ]
      }
    ];
  }
  if (path.includes('/api/parent-portal/weekly-summary')) {
    return {
      goalsSet: 3 + (daySeed % 3),
      goalsCompleted: 1 + (daySeed % 3),
      trend: [0, 1, 0, 1, (daySeed % 2), 0, (daySeed % 2)],
      cadence: 'Sundays at 7:00pm',
      conversationStarters: [
        'Ask them what helped this week feel smoother.',
        'Which small win are you proud of?',
        "What's one thing we could do on Friday to make next week easier?"
      ],
      coachStyle: daySeed % 2 === 0 ? 'calm' : 'encouraging'
    };
  }
  if (path.includes('/api/parent-portal/dashboard')) {
    const totalGoals = 10 + (daySeed * 2);
    const completedGoals = 3 + (daySeed % 4);
    return {
      totalChildren: 3,
      totalGoals,
      completedGoals,
      aiSuggestedGoals: 2 + (daySeed % 3),
      averageProgress: 45 + (daySeed * 5) % 40,
      byArchetype: { creator: 1, strategist: 1, explorer: 1 }
    };
  }
  if (path.includes('/api/goals/today')) {
    return [
      { id: 'tg1', title: 'Check grades', microStep: 'Open the portal and check one class', plannedCount: 3, completedThisWeek: 1, progress: 0, completed: false },
      { id: 'tg2', title: 'Study 20 min', microStep: 'Set a 10 minute timer twice', plannedCount: 4, completedThisWeek: 2, progress: 0, completed: false }
    ];
  }
  if (path.endsWith('/api/goals')) {
    return [{ id: 'g-demo', title: 'Demo goal', progress: 20, completed: false }];
  }
  if (path.includes('/api/reminders/due')) {
    return [];
  }
  if (path.includes('/api/ask')) {
    return {
      ok: true,
      suggestion: "Post a quick update about today's progress and ask one question to your audience.",
      rating: 9.2,
      reason: 'Small, public updates increase accountability and engagement.',
      meta: { postsSource: 'mock', postsCount: 0, providersConnected: [], platformUsed: 'demo' }
    };
  }
  if (path.includes('/api/ai/tiny')) {
    return {
      goals: [{ title: 'Share one learning from today', category: 'learning', reason: 'Regular sharing builds consistency', impactScore: 8, effortScore: 3 }],
      steps: [{ description: 'Draft a 3-sentence post now', estMinutes: 10, goalTitle: 'Share one learning' }],
      schedule: [{ cadence: 'daily', when: 'evening' }],
      insights: 'Mock advice (demo fallback).'
    };
  }
  if (path.includes('/api/achievements')) {
    const defaultState: DemoAchievementState = {
      streakCurrent: 3, streakLongest: 5, totalGoals: 4,
      achievements: { focus: 35, shipTwo: 20 }, lastUpdated: now.getTime()
    };

    const loadState = (): DemoAchievementState => {
      return demoAchievementsMemoryState || defaultState;
    };

    const persistState = (state: DemoAchievementState): DemoAchievementState => {
      demoAchievementsMemoryState = state;
      return state;
    };

    const advanceState = (state: DemoAchievementState): DemoAchievementState => {
      const hoursSince = Math.max(0, (now.getTime() - state.lastUpdated) / (60 * 60 * 1000));
      const baseGain = Math.max(1, Math.min(4, Math.round(hoursSince) || 1));
      const jitter = Math.floor(Math.random() * 3);
      const streakGain = baseGain + jitter;
      const streakCurrent = Math.min(30, state.streakCurrent + streakGain);
      const streakLongest = Math.max(state.streakLongest, streakCurrent);
      const totalGoals = state.totalGoals + Math.max(1, Math.floor(streakGain / 2));
      const achievements = {
        focus: Math.min(100, state.achievements.focus + streakGain * 4 + Math.floor(Math.random() * 5)),
        shipTwo: Math.min(100, state.achievements.shipTwo + streakGain * 6 + Math.floor(Math.random() * 5))
      } as DemoAchievementState['achievements'];
      return { streakCurrent, streakLongest, totalGoals, achievements, lastUpdated: now.getTime() };
    };

    const state = persistState(advanceState(loadState()));
    const badges = [
      { id: 'starter', title: 'First Step', description: 'Complete your first goal', tier: 'bronze' as const, earned: true, earnedAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString() },
      { id: 'weekly-3', title: '3-Day Streak', description: 'Complete goals 3 days in a row', tier: 'silver' as const, earned: state.streakCurrent >= 3, earnedAt: state.streakCurrent >= 3 ? new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString() : undefined, progress: Math.min(100, (state.streakCurrent / 3) * 100) },
      { id: 'weekly-7', title: '7-Day Streak', description: 'Stay consistent for 7 days', tier: 'gold' as const, earned: state.streakCurrent >= 7, progress: Math.min(100, (state.streakCurrent / 7) * 100) },
      { id: 'goal-10', title: 'Goal Getter', description: 'Complete 10 goals total', tier: 'silver' as const, earned: state.totalGoals >= 10, progress: Math.min(100, (state.totalGoals / 10) * 100) }
    ];
    const achievements = [
      { id: 'focus-streak', title: 'Stay on Target', description: 'Log progress 5 days this week', progress: state.achievements.focus, target: '5 check-ins' },
      { id: 'ship-two', title: 'Ship Two Things', description: 'Mark 2 goals done this week', progress: state.achievements.shipTwo, target: '2 completions' }
    ];
    const resp: ApiAchievementsResponse = {
      streak: { current: state.streakCurrent, longest: state.streakLongest, lastUpdated: new Date(state.lastUpdated).toISOString() },
      badges,
      achievements
    };
    return resp;
  }
  if (path.includes('/api/health')) {
    return { status: 'ok', mock: true };
  }
  if (path === '/api/threads' || path.endsWith('/api/threads')) {
    return { threads: demoThreads, thread: demoThreads[0], demo: true };
  }
  if (path.startsWith('/api/threads/') && path.endsWith('/messages')) {
    const threadId = path.split('/').slice(-2)[0] || 'demo-thread-1';
    return { messages: demoMessages(threadId), demo: true };
  }
  if (path.startsWith('/api/threads/') && path.endsWith('/read')) {
    return { success: true, demo: true };
  }
  if (path.startsWith('/api/threads/') && !path.endsWith('/messages')) {
    const threadId = path.split('/').pop() || 'demo-thread-1';
    const thread = demoThreads.find((t) => t.id === threadId) || demoThreads[0];
    return { thread, demo: true };
  }
  if (path.includes('/api/posts')) {
    return [];
  }
  return { ok: true, mock: true };
}
