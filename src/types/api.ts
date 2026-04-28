export type ApiUser = {
  id: string;
  authId?: string;
  role: string;
  displayName?: string;
  email?: string;
  avatarUrl?: string;
  archetype?: string;
  interests?: string[];
  troopCode?: string;
  isScoutAccount?: boolean;
  isScoutMember?: boolean;
};

export type ApiUserSummary = {
  id: string;
  displayName?: string;
  email?: string;
  avatarUrl?: string;
};

export type ApiGoal = {
  id: string;
  goal_id?: string;
  title: string;
  description?: string | null;
  category?: string | null;
  progress: number;
  completed: boolean | null;
  completed_at?: string | null;
  created_at?: string | null;
  user_id?: string;
  status?: string;
  weekStart?: string;
  plannedDays?: Record<string, boolean>;
  microStep?: string;
  lastCheckin?: { status?: string; date?: string };
  completedDates?: string[];
  createdAt?: string;
  completedAt?: string;
  milestones?: { title: string; target: string; completed?: boolean }[];
  source?: 'ai' | 'manual';
  suggestion_title?: string;
  adopted_at?: string;
};

export type ApiTodayGoal = ApiGoal & {
  plannedCount?: number;
  completedThisWeek?: number;
};

export type CreateGoalInput = {
  title: string;
  description?: string;
  category?: string;
  progress?: number;
  plannedDays?: Record<string, boolean>;
  microStep?: string;
  source?: string;
  suggestionId?: string;
  suggestionTitle?: string;
  archetypeAligned?: boolean;
  // Scout-specific fields
  badgeFocus?: string;
  goalCategoryTag?: 'school' | 'skill' | 'community' | 'personal';
  sizePreset?: '5min' | '10min' | '20min' | 'custom';
  checkInWindows?: string[];
  shrunkFrom?: string;
};

export type CheckinInput = {
  status: 'yes' | 'not_yet';
};

export type AddMilestoneInput = {
  title: string;
  target: string;
};

export type UpdateScheduleInput = {
  plannedDays: Record<string, boolean>;
};

export type ApiPost = {
  id: string;
  authorId?: string;
  content: string;
  mediaType?: string;
  mediaUrl?: string;
  visibility?: string;
  createdAt?: string;
  author?: ApiUserSummary | null;
  commentsCount?: number;
};

export type ApiComment = {
  id: string;
  postId: string;
  text: string;
  createdAt?: string;
  author?: ApiUserSummary | null;
};

export type ApiAchievementBadge = {
  id: string;
  title: string;
  description: string;
  tier: 'bronze' | 'silver' | 'gold' | 'platinum';
  earned: boolean;
  earnedAt?: string;
  progress?: number;
};

export type ApiAchievement = {
  id: string;
  title: string;
  description: string;
  progress: number;
  target: string;
};

export type ApiAchievementsResponse = {
  streak: {
    current: number;
    longest: number;
    lastUpdated: string;
  };
  badges: ApiAchievementBadge[];
  achievements: ApiAchievement[];
};

export type ApiThread = {
  id: string;
  participants: string[];
  type: 'dm' | 'group';
  title?: string;
  lastMessage?: {
    senderId?: string;
    text?: string;
    createdAt?: string | Date | null;
  } | null;
  lastMessageAt?: string | Date | null;
  unreadCount?: number;
};

export type ApiThreadMessage = {
  id: string;
  threadId: string;
  senderId: string;
  text: string;
  attachments?: string[];
  createdAt?: string | Date;
};

export type ApiParentChild = {
  id: string;
  displayName: string;
  avatarUrl?: string | null;
  archetype?: string;
  goals: {
    id: string;
    title: string;
    progress: number;
    completed: boolean;
  }[];
};

export type ApiWeeklySummary = {
  goalsSet: number;
  goalsCompleted: number;
  trend: number[];
  cadence: string;
  conversationStarters: string[];
  coachStyle?: string;
};

export type ApiParentDashboard = {
  totalChildren: number;
  totalGoals: number;
  completedGoals: number;
  aiSuggestedGoals: number;
  averageProgress: number;
  byArchetype: Record<string, number>;
};

export type ApiAiSuggestion = {
  title: string;
  category?: string;
  reason?: string;
  impactScore?: number;
  effortScore?: number;
};

export type ApiAiAdvice = {
  goals: ApiAiSuggestion[];
  steps: { description: string; estMinutes?: number; goalTitle?: string }[];
  schedule: { cadence: string; when: string }[];
  insights: string;
};

export type ApiReminder = {
  id: string;
  goalId: string;
  title: string;
  dueAt: string;
  dismissed?: boolean;
};

export type AiAskInput = {
  dusUserId: string;
  archetype: string;
  goals: string;
  platform?: string;
  useCache?: boolean;
  attachments?: string[];
};

export type AiAskResponse = {
  suggestion: string;
  reason: string;
  rating?: number;
};

export type AiTinyAdviceInput = {
  interests: string[];
  archetype: string;
  currentGoal?: string;
  recentActivity?: { progress: number };
  attachments?: string[];
};

export type OnboardingInput = {
  archetype?: string;
  interests?: string[];
  goals?: string[];
  cohortCode?: string;
  troopCode?: string;
  nickname?: string;
  avatar?: string;
};

export type SaveSettingsInput = {
  preferredPostType?: string;
  reminderWindows?: string[];
  coachStyle?: string;
};

// ─── Scout types ──────────────────────────────────────────────────────────────

export type ScoutNudge = {
  id: string;
  type: 'leader_nudge' | 'scout_nudge_back';
  message?: string;
  createdAt: string;
};

export type AnchorStatus = 'none' | 'submitted' | 'confirmed' | 'failed';

export type AnchorResponse = {
  credentialId?: string;
  anchorStatus: AnchorStatus;
  anchorHandle?: string;
  anchorProof?: string;
  submittedAt?: string;
  anchorConfirmedAt?: string;
};

export type ScoutCredential = {
  id: string;
  credentialType: 'streak' | 'goal_complete' | 'badge' | 'troop_award' | 'badge_milestone' | 'bronze_award' | 'silver_award' | 'gold_award' | 'service_hours';
  badgeKey?: string;
  title: string;
  badgeFocus?: string;
  earnedAt: string;
  issuedBy?: string;
  proofHash: string;
  acknowledged?: boolean;
  anchorStatus?: AnchorStatus;
  anchorHandle?: string;
  anchorProof?: string;
  anchorSubmittedAt?: string;
  metadata?: Record<string, unknown>;
};

export type ScoutGoalSummary = {
  id: string;
  title: string;
  badgeFocus?: string;
  goalCategoryTag?: string;
  sizePreset?: string;
  checkInWindows?: string[];
  plannedDays?: Record<string, boolean>;
  progress: number;
};

export type ScoutTodayData = {
  dailyCheckInStreak: number;
  daysCheckedInThisWeek: number;
  weeklyProgress: { planned: number; completed: number };
  goals: ScoutGoalSummary[];
  nudges: ScoutNudge[];
  credentials: ScoutCredential[];
};

export type TroopSegmentEntry = {
  id: string;
  nickname: string;
  daysThisWeek: number;
  credentialCount?: number;
};

export type ScoutPortableRecord = {
  scoutId: string;
  nickname: string;
  avatarUrl?: string | null;
  troopCode: string;
  credentials: ScoutCredential[];
};

export type TroopDashboard = {
  troop: { id: string; name: string; troopCode: string };
  segments: {
    active: TroopSegmentEntry[];
    at_risk: TroopSegmentEntry[];
    inactive: TroopSegmentEntry[];
  };
  weeklyResetRate: number;
  teamCurrentProgress: number;
  totalScouts: number;
  groupSnapshot?: {
    activeScouts: number;
    goalsCreatedThisWeek: number;
    goalsCompletedThisWeek: number;
    checkinsThisWeek: number;
    trend: number[];
    checkinTrend: number[];
    trendLabel: string;
    trendDirection: 'up' | 'steady' | 'down';
    supportSignal: string;
  };
  recognitionSnapshot?: {
    rewardsIssuedThisWeek: number;
    youthRecognizedThisWeek: number;
    serviceHoursLoggedThisWeek: number;
    marksEarnedThisWeek: number;
    momentsEarnedThisWeek: number;
    moovasUnlockedThisWeek: number;
    recentRecognitions: {
      id: string;
      youthId: string;
      youthName: string;
      title: string;
      credentialType: string;
      earnedAt: string;
    }[];
  };
  themeSummary?: {
    topThemes: { label: string; count: number; source: 'goal_category' | 'badge_focus' | 'interest' }[];
    cohorts: {
      cohortCode: string;
      memberCount: number;
      activeScouts: number;
      goalsCompletedThisWeek: number;
      themes: string[];
    }[];
    conversationStarters: string[];
  };
  caseloadQueue?: {
    id: string;
    youthName: string;
    supportStatus: 'needs_support' | 'follow_up_due' | 'on_track' | 'resolved';
    priority: 'high' | 'medium' | 'low';
    reason: string;
    lastCheckInLabel: string;
    lastCheckInStatus?: string | null;
    missedCheckInSignal: number;
    stalledProgress: boolean;
    currentGoalStatus: string;
    nextFollowUpDate?: string | null;
    assignedStaffLabel?: string | null;
    latestNoteSnippet?: string | null;
    nextStep?: string | null;
  }[];
  followUpsDue?: {
    youthId: string;
    youthName: string;
    dueDate?: string | null;
    nextStep: string;
    status: 'needs_support' | 'follow_up_due' | 'on_track' | 'resolved';
  }[];
  recentSupportActivity?: {
    id: string;
    youthId: string;
    youthName: string;
    note: string;
    tags: string[];
    createdAt: string;
    status: 'needs_support' | 'follow_up_due' | 'on_track' | 'resolved';
  }[];
  caseloadSummary?: {
    needsAttentionNow: number;
    followUpsOverdue: number;
    onTrackThisWeek: number;
    stalledProgress: number;
  };
};

export type LeaderSupportProfile = {
  scout: {
    id: string;
    nickname: string;
    avatarUrl?: string | null;
    cohortCode?: string | null;
  };
  summary: {
    daysCheckedInThisWeek: number;
    activeGoalCount: number;
    completedThisWeek: number;
    supportStatus: 'needs_support' | 'follow_up_due' | 'on_track' | 'resolved';
    lastCheckInLabel: string;
  };
  supportFlags: string[];
  recognition: {
    totalCredentials: number;
    recognitionsThisWeek: number;
    serviceHoursLogged: number;
    recentCredentials: {
      id: string;
      title: string;
      credentialType: string;
      earnedAt: string;
    }[];
  };
  activeGoals: {
    id: string;
    title: string;
    progress: number;
    microStep?: string | null;
    badgeFocus?: string | null;
    category?: string | null;
  }[];
  timeline: {
    id: string;
    type: 'checkin' | 'support_note' | 'credential';
    label: string;
    detail: string;
    createdAt: string;
  }[];
  supportNotes: {
    id: string;
    note: string;
    tags: string[];
    nextStep?: string | null;
    followUpDate?: string | null;
    status: 'needs_support' | 'follow_up_due' | 'on_track' | 'resolved';
    createdAt: string;
  }[];
  nextFollowUp?: string | null;
};

export type CreateLeaderSupportNoteInput = {
  note: string;
  tags?: (
    | 'outreach_attempted'
    | 'youth_responded'
    | 'missed_appointment'
    | 'goal_planning_help'
    | 'accountability_support'
    | 'needs_escalation'
    | 'resolved'
  )[];
  nextStep?: string;
  followUpDate?: string;
  status?: 'needs_support' | 'follow_up_due' | 'on_track' | 'resolved';
};

export type ScoutCheckinInput = {
  status: 'yes' | 'not_yet';
  effortLevel?: 1 | 2 | 3;
  reflection?: string;
  checkInWindow?: 'morning' | 'afternoon' | 'evening';
  note?: string;
};

export type ScoutOnboardingInput = {
  troopCode: string;
  nickname: string;
  pin: string;
  badgeFocus?: string;
  goalCategoryTag?: 'school' | 'skill' | 'community' | 'personal';
  sizePreset?: '5min' | '10min' | '20min' | 'custom';
  checkInWindows?: string[];
};

export type RewardType = 'mark' | 'moment' | 'moova';
export interface ApiRewardEntry {
  id: string;
  title: string;
  earnedAt: string;
  source: string;
}
export interface ApiRewardsData {
  marks: ApiRewardEntry[];
  moments: ApiRewardEntry[];
  totalMarks: number;
  totalMoments: number;
  moova: boolean;
  moovaEarnedAt: string | null;
}

export type NotificationItem = {
  id: string;
  type: 'nudge' | 'thread_message' | 'forum_reply';
  title: string;
  body: string;
  linkTo: string;
  createdAt: string;
  read: boolean;
};

export type ApiNotificationsResponse = {
  items: NotificationItem[];
  total: number;
};

export type ForumCategory = 'Help' | 'Ideas' | 'General' | 'Tips' | 'Announcement';

export type ApiForumPost = {
  id: string;
  title: string;
  body: string;
  category: ForumCategory;
  authorId: string;
  authorName: string;
  isPinned: boolean;
  replyCount: number;
  viewCount: number;
  likes: string[];
  likedByMe: boolean;
  createdAt: string;
};

export type ApiForumReply = {
  id: string;
  postId: string;
  authorId: string;
  authorName: string;
  body: string;
  likes: string[];
  likedByMe: boolean;
  createdAt: string;
};
