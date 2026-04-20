export const DEFAULT_ARCHETYPE = 'explorer';

export type ArchetypeSuggestion = {
  title: string;
  description?: string;
  category?: string;
};

export type ArchetypeKey = 'explorer' | 'creative' | 'scholar' | 'athlete' | 'social' | 'maker' | 'default' | string;

export const ARCHETYPE_SUGGESTIONS: Record<ArchetypeKey, ArchetypeSuggestion[]> = {
  explorer: [
    { title: 'Try a new hobby', description: "Explore something you've never tried before (e.g., painting, coding, gardening)", category: 'creativity' },
    { title: 'Read one new book', description: 'Pick a book outside your usual interests and finish it this month', category: 'learning' },
    { title: 'Visit a new place', description: 'Go to a local museum, park, or event to broaden your experiences', category: 'personal' }
  ],
  creative: [
    { title: 'Daily sketching', description: 'Spend 15 minutes sketching every day for a month', category: 'creativity' },
    { title: 'Write a short story', description: 'Complete a short story (1000-2000 words)', category: 'learning' },
    { title: 'Start a creative project', description: 'Begin a multi-week creative project and track milestones', category: 'creativity' }
  ],
  scholar: [
    { title: 'Learn a new topic', description: 'Take an online mini-course and finish it', category: 'learning' },
    { title: 'Daily study streak', description: 'Study 30 minutes daily for 21 days', category: 'learning' },
    { title: 'Teach what you learned', description: 'Create a short tutorial or presentation about a topic you mastered', category: 'career' }
  ],
  athlete: [
    { title: 'Run 5k', description: 'Train and complete a 5 kilometer run', category: 'health' },
    { title: 'Weekly workouts', description: 'Complete at least 3 workouts per week for a month', category: 'health' },
    { title: 'Try a new sport', description: 'Join a class or club and attend 4 sessions', category: 'health' }
  ],
  social: [
    { title: 'Reach out to friends', description: 'Contact one friend per week to catch up', category: 'relationships' },
    { title: 'Join a group', description: 'Attend a meet-up or club for something you like', category: 'personal' },
    { title: 'Host a small event', description: 'Organize a game night or study group', category: 'relationships' }
  ],
  maker: [
    { title: 'Build a small project', description: 'Ship a tiny project (website, app or craft) in two weeks', category: 'creativity' },
    { title: 'Learn a tool', description: 'Master one tool relevant to making (e.g., soldering, 3D printing, woodworking)', category: 'learning' },
    { title: 'Share your work', description: 'Publish your project or post progress updates', category: 'career' }
  ],
  default: [
    { title: 'Set a weekly habit', description: 'Pick one small habit and practice it each week', category: 'personal' },
    { title: 'Read regularly', description: 'Read for 20 minutes a day', category: 'learning' },
    { title: 'Make one healthy change', description: 'Improve one small daily routine for wellbeing', category: 'health' }
  ]
};

// Provide mappings for common synonyms to canonical archetypes
export const ARCHETYPE_ALIASES: Record<string, string> = {
  creative: 'creative',
  artist: 'creative',
  learner: 'scholar',
  scholar: 'scholar',
  sporty: 'athlete',
  athlete: 'athlete',
  social: 'social',
  maker: 'maker',
  explorer: 'explorer'
};

export const normalizeArchetype = (raw?: string | null) => {
  if (!raw) return DEFAULT_ARCHETYPE;
  const key = String(raw).toLowerCase().trim();
  return ARCHETYPE_ALIASES[key] || (ARCHETYPE_SUGGESTIONS[key] ? key : DEFAULT_ARCHETYPE);
};
