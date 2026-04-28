import { apiFetch } from './client';
import type {
  ApiGoal,
  ApiTodayGoal,
  CreateGoalInput,
  CheckinInput,
  AddMilestoneInput,
  UpdateScheduleInput,
  ApiPost,
  ApiComment,
  ApiThread,
  ApiThreadMessage,
  ApiAchievementsResponse,
  ApiParentChild,
  ApiWeeklySummary,
  ApiParentDashboard,
  ApiUser,
  ApiReminder,
  ApiAiAdvice,
  AiAskInput,
  AiAskResponse,
  AiTinyAdviceInput,
  OnboardingInput,
  SaveSettingsInput,
  ScoutTodayData,
  TroopDashboard,
  ScoutCredential,
  ScoutPortableRecord,
  AnchorResponse,
  ApiRewardsData,
  ApiForumPost,
  ApiForumReply,
  ApiNotificationsResponse,
  LeaderSupportProfile,
  CreateLeaderSupportNoteInput,
} from '@/types/api';

export const goalsApi = {
  getAll: () => apiFetch<ApiGoal[]>('/api/goals'),
  getToday: () => apiFetch<ApiTodayGoal[]>('/api/goals/today'),
  create: (data: CreateGoalInput) => apiFetch<ApiGoal>('/api/goals', { method: 'POST', body: JSON.stringify(data) }),
  checkin: (id: string, data: CheckinInput) => apiFetch<ApiGoal>('/api/goals/' + id + '/checkin', { method: 'POST', body: JSON.stringify(data) }),
  delete: (id: string) => apiFetch('/api/goals/' + id, { method: 'DELETE' }),
  complete: (id: string) => apiFetch<ApiGoal>('/api/goals/' + id + '/complete', { method: 'POST' }),
  addMilestone: (id: string, data: AddMilestoneInput) => apiFetch<ApiGoal>('/api/goals/' + id + '/milestones', { method: 'POST', body: JSON.stringify(data) }),
  completeMilestone: (goalId: string, index: number) => apiFetch<ApiGoal>('/api/goals/' + goalId + '/milestones/' + index + '/complete', { method: 'POST' }),
  updateSchedule: (id: string, data: UpdateScheduleInput) => apiFetch<ApiGoal>('/api/goals/' + id + '/schedule', { method: 'PUT', body: JSON.stringify(data) }),
  weeklyReset: (shrinkToOneDay?: boolean) => apiFetch('/api/goals/weekly/reset', { method: 'POST', body: JSON.stringify({ shrinkToOneDay }) }),
};

export const postsApi = {
  getAll: () => apiFetch<ApiPost[]>('/api/posts'),
  get: (id: string) => apiFetch<ApiPost>('/api/posts/' + id),
  create: (data: { content: string; mediaUrl?: string; mediaType?: string; visibility?: string; location?: string }) =>
    apiFetch<ApiPost>('/api/posts', { method: 'POST', body: JSON.stringify(data) }),
  getComments: (postId: string) => apiFetch<ApiComment[]>('/api/posts/' + postId + '/comments'),
  addComment: (postId: string, text: string) =>
    apiFetch<ApiComment>('/api/posts/' + postId + '/comments', { method: 'POST', body: JSON.stringify({ text }) }),
};

export const threadsApi = {
  getAll: () => apiFetch<{ threads: ApiThread[]; demo?: boolean }>('/api/threads'),
  get: (id: string) => apiFetch<{ thread: ApiThread; demo?: boolean }>('/api/threads/' + encodeURIComponent(id)),
  create: (data: { participantIds: string[]; title?: string; type?: 'dm' | 'group' }) =>
    apiFetch<{ thread: ApiThread; demo?: boolean }>('/api/threads', { method: 'POST', body: JSON.stringify(data) }),
  getMessages: (id: string) => apiFetch<{ messages: ApiThreadMessage[]; demo?: boolean }>('/api/threads/' + encodeURIComponent(id) + '/messages'),
  sendMessage: (id: string, text: string, attachments: string[] = []) =>
    apiFetch<{ message: ApiThreadMessage; demo?: boolean }>('/api/threads/' + encodeURIComponent(id) + '/messages', { method: 'POST', body: JSON.stringify({ text, attachments }) }),
  markRead: (id: string) => apiFetch<{ success: boolean }>('/api/threads/' + encodeURIComponent(id) + '/read', { method: 'POST' }),
};

export const achievementsApi = {
  get: () => apiFetch<ApiAchievementsResponse>('/api/achievements'),
};

export const parentPortalApi = {
  getChildren: () => apiFetch<ApiParentChild[]>('/api/parent-portal/children'),
  addChild: (nickname: string, troopCode?: string) => apiFetch<ApiParentChild[]>('/api/parent-portal/children', { method: 'POST', body: JSON.stringify({ nickname, ...(troopCode ? { troopCode } : {}) }) }),
  getWeeklySummary: () => apiFetch<ApiWeeklySummary>('/api/parent-portal/weekly-summary'),
  getDashboard: () => apiFetch<ApiParentDashboard>('/api/parent-portal/dashboard'),
  sendSnapshot: () => apiFetch('/api/parent-portal/weekly-summary/send', { method: 'POST' }),
};

export const aiApi = {
  ask: (data: AiAskInput) => apiFetch<AiAskResponse>('/api/ask', { method: 'POST', body: JSON.stringify(data) }),
  tinyAdvice: (data: AiTinyAdviceInput) => apiFetch<ApiAiAdvice>('/api/ai/tiny/advice', { method: 'POST', body: JSON.stringify(data) }),
};

export const remindersApi = {
  getDue: () => apiFetch<ApiReminder[]>('/api/reminders/due'),
};

export const usersApi = {
  search: (query: string) => apiFetch<ApiUser[]>('/api/users?q=' + encodeURIComponent(query)),
};

export const settingsApi = {
  savePreferences: (data: { reminderWindows?: string[]; coachStyle?: string }) =>
    apiFetch('/api/settings/preferences', { method: 'POST', body: JSON.stringify(data) }),
};

export const onboardingApi = {
  save: (data: OnboardingInput) => apiFetch('/api/onboarding', { method: 'POST', body: JSON.stringify(data) }),
};

export const authApi = {
  getMe: () => apiFetch<ApiUser>('/api/auth/me'),
  registerProfile: (data: { displayName?: string; role?: string; childName?: string; leaderInviteCode?: string }) =>
    apiFetch<ApiUser>('/api/auth/register-profile', { method: 'POST', body: JSON.stringify(data) }),
  saveSettings: (data: SaveSettingsInput) => apiFetch('/api/auth/settings', { method: 'POST', body: JSON.stringify(data) }),
  sendRoleCode: (targetRole: string) =>
    apiFetch<{ sent: boolean }>('/api/auth/role-code/send', { method: 'POST', body: JSON.stringify({ targetRole }) }),
  applyRoleChange: (targetRole: string, code: string, leaderInviteCode?: string) =>
    apiFetch<{ role: string }>('/api/auth/role-code/apply', { method: 'POST', body: JSON.stringify({ targetRole, code, leaderInviteCode }) }),
};

export const scoutAuthApi = {
  login: (data: { troopCode: string; nickname: string; pin: string }) =>
    apiFetch<{ token: string; user: ApiUser }>('/api/scout-auth/login', { method: 'POST', body: JSON.stringify(data) }),
  createScout: (data: { nickname: string; pin: string; badgeFocus?: string }) =>
    apiFetch<{ id: string; nickname: string; troopCode: string }>('/api/scout-auth/create-scout', { method: 'POST', body: JSON.stringify(data) }),
};

export const scoutApi = {
  getToday: () => apiFetch<ScoutTodayData>('/api/scout/today'),
  nudgeBack: (nudgeId: string, goalCompleted?: boolean) =>
    apiFetch<{ success: boolean }>('/api/scout/nudge-back', { method: 'POST', body: JSON.stringify({ nudgeId, goalCompleted }) }),
  getCredentials: () => apiFetch<ScoutCredential[]>('/api/scout/credentials'),
  acknowledgeCredential: (credentialId: string) =>
    apiFetch<{ success: boolean }>('/api/scout/acknowledge-credential', { method: 'POST', body: JSON.stringify({ credentialId }) }),
  anchorCredential: (id: string) =>
    apiFetch<AnchorResponse>(`/api/scout/credentials/${id}/anchor`, { method: 'POST' }),
  getAnchorStatus: (id: string) =>
    apiFetch<AnchorResponse>(`/api/scout/credentials/${id}/anchor`),
  sessionClose: () =>
    apiFetch<{ success: boolean }>('/api/scout/session-close', { method: 'POST' }),
};

export const rewardsApi = {
  get: () => apiFetch<ApiRewardsData>('/api/rewards'),
};

export const notificationsApi = {
  getAll: () => apiFetch<ApiNotificationsResponse>('/api/notifications'),
};

export const forumsApi = {
  listPosts: (search?: string, category?: string) => {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (category) params.set('category', category);
    const qs = params.toString();
    return apiFetch<{ posts: ApiForumPost[] }>(`/api/forum${qs ? '?' + qs : ''}`);
  },
  getPost: (postId: string) =>
    apiFetch<{ post: ApiForumPost; replies: ApiForumReply[] }>(`/api/forum/${postId}`),
  createPost: (data: { title: string; body: string; category?: string }) =>
    apiFetch<{ post: ApiForumPost }>('/api/forum', { method: 'POST', body: JSON.stringify(data) }),
  createReply: (postId: string, body: string) =>
    apiFetch<{ reply: ApiForumReply }>(`/api/forum/${postId}/replies`, { method: 'POST', body: JSON.stringify({ body }) }),
  likePost: (postId: string) =>
    apiFetch<{ likes: number; likedByMe: boolean }>(`/api/forum/${postId}/like`, { method: 'POST' }),
  likeReply: (postId: string, replyId: string) =>
    apiFetch<{ likes: number; likedByMe: boolean }>(`/api/forum/${postId}/replies/${replyId}/like`, { method: 'POST' }),
};

export const troopApi = {
  create: (data: { name: string; troopCode: string; weeklyResetDay?: string }) =>
    apiFetch<{ id: string; troopCode: string; name: string }>('/api/troops', { method: 'POST', body: JSON.stringify(data) }),
  getDashboard: () => apiFetch<TroopDashboard>('/api/troops/mine/dashboard'),
  sendNudge: (toUserId: string, message?: string) =>
    apiFetch<{ id: string }>('/api/troops/mine/nudge', { method: 'POST', body: JSON.stringify({ toUserId, message }) }),
  weeklyReset: () =>
    apiFetch<{ success: boolean; completedCount: number; totalScouts: number; completionRate: number }>('/api/troops/mine/weekly-reset', { method: 'POST' }),
  awardBadge: (data: { toUserId: string; badgeTitle: string; badgeFocus?: string; credentialType?: string }) =>
    apiFetch<{ success: boolean; proofHash: string }>('/api/troops/mine/award-badge', { method: 'POST', body: JSON.stringify(data) }),
  getScoutRecord: (scoutId: string) =>
    apiFetch<ScoutPortableRecord>(`/api/troops/mine/scouts/${scoutId}/record`),
  getScoutSupportProfile: (scoutId: string) =>
    apiFetch<LeaderSupportProfile>(`/api/troops/mine/scouts/${scoutId}/support-profile`),
  addSupportNote: (scoutId: string, data: CreateLeaderSupportNoteInput) =>
    apiFetch(`/api/troops/mine/scouts/${scoutId}/support-notes`, { method: 'POST', body: JSON.stringify(data) }),
  logServiceHours: (data: { toUserId: string; hours: number; projectName?: string; description?: string }) =>
    apiFetch<{ success: boolean; proofHash: string }>('/api/troops/mine/log-service-hours', { method: 'POST', body: JSON.stringify(data) }),
};
