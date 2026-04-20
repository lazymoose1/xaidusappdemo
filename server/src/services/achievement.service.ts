import * as achievementRepo from '../repositories/achievement.repo';

export async function getAchievements(userId: string) {
  const goals = await achievementRepo.findGoalsByUserId(userId);

  // Calculate streak (consecutive days with completed goals)
  const completedDates = new Set<string>();
  goals.forEach((goal) => {
    (goal.completed_dates || []).forEach((date: any) => {
      completedDates.add(new Date(date).toDateString());
    });
  });

  const sortedDates = Array.from(completedDates)
    .map((d) => new Date(d))
    .sort((a, b) => b.getTime() - a.getTime());

  let longestStreak = 0;
  let tempStreak = 0;

  for (let i = 0; i < sortedDates.length; i++) {
    if (i === 0) {
      tempStreak = 1;
    } else {
      const dayDiff =
        (sortedDates[i - 1].getTime() - sortedDates[i].getTime()) /
        (1000 * 60 * 60 * 24);
      if (dayDiff === 1) {
        tempStreak++;
      } else {
        longestStreak = Math.max(longestStreak, tempStreak);
        tempStreak = 1;
      }
    }
  }
  longestStreak = Math.max(longestStreak, tempStreak);

  // Current streak
  const today = new Date().toDateString();
  let currentStreak = completedDates.has(today) ? 1 : 0;
  let checkDate = new Date(today);
  for (let i = 1; i <= 365; i++) {
    checkDate = new Date(checkDate.getTime() - 24 * 60 * 60 * 1000);
    if (completedDates.has(checkDate.toDateString())) {
      currentStreak++;
    } else {
      break;
    }
  }

  const completedCount = goals.filter((g) => g.completed).length;

  const badges = [
    {
      id: 'starter',
      title: 'First Step',
      description: 'Complete your first goal',
      tier: 'bronze' as const,
      earned: completedCount >= 1,
      earnedAt: completedCount >= 1 ? goals.find((g) => g.completed)?.completed_at : undefined,
      progress: Math.min(100, completedCount * 100),
    },
    {
      id: 'weekly-3',
      title: '3-Day Streak',
      description: 'Complete goals 3 days in a row',
      tier: 'silver' as const,
      earned: currentStreak >= 3,
      earnedAt: currentStreak >= 3 ? new Date() : undefined,
      progress: Math.min(100, (currentStreak / 3) * 100),
    },
    {
      id: 'weekly-7',
      title: '7-Day Streak',
      description: 'Stay consistent for 7 days',
      tier: 'gold' as const,
      earned: currentStreak >= 7,
      earnedAt: currentStreak >= 7 ? new Date() : undefined,
      progress: Math.min(100, (currentStreak / 7) * 100),
    },
    {
      id: 'goal-10',
      title: 'Goal Getter',
      description: 'Complete 10 goals total',
      tier: 'silver' as const,
      earned: completedCount >= 10,
      earnedAt: completedCount >= 10 ? new Date() : undefined,
      progress: Math.min(100, (completedCount / 10) * 100),
    },
    {
      id: 'goal-25',
      title: 'Achievement Unlocked',
      description: 'Complete 25 goals total',
      tier: 'platinum' as const,
      earned: completedCount >= 25,
      earnedAt: completedCount >= 25 ? new Date() : undefined,
      progress: Math.min(100, (completedCount / 25) * 100),
    },
  ];

  const achievements = [
    {
      id: 'focus-streak',
      title: 'Stay on Target',
      description: 'Log progress 5 days this week',
      progress: Math.min(100, (currentStreak / 5) * 100),
      target: '5 check-ins',
    },
    {
      id: 'ship-two',
      title: 'Ship Two Things',
      description: 'Mark 2 goals done this week',
      progress: Math.min(
        100,
        ((goals.filter((g) => {
          return (g.completed_dates || []).some((d: any) => {
            const now = new Date();
            const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            return new Date(d) >= weekAgo;
          });
        }).length) /
          2) *
          100,
      ),
      target: '2 completions',
    },
  ];

  return {
    streak: {
      current: currentStreak,
      longest: longestStreak,
      lastUpdated: new Date().toISOString(),
    },
    badges,
    achievements,
  };
}
