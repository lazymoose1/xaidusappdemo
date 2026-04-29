import * as userRepo from '../repositories/user.repo';
import { NotFoundError } from '../lib/errors';

export async function searchUsers(query: string, limit: number = 50) {
  const users = await userRepo.search(query, limit);
  // No email in public user listings
  return users.map((u) => ({
    id: u.id,
    displayName: u.display_name || 'User',
    handle: u.display_name
      ? `@${u.display_name.toLowerCase().replace(/\s+/g, '')}`
      : '@user',
    avatarUrl: u.avatar_url || '',
    role: u.role,
    archetype: u.archetype || '',
    interests: u.interests || [],
    createdAt: u.created_at,
  }));
}

export async function getProfile(userId: string) {
  const user = await userRepo.findById(userId);
  if (!user) throw new NotFoundError('User');
  const troopCode = typeof user.troop_code === 'string' ? user.troop_code : undefined;
  return {
    id: user.id,
    email: user.email, // Only returned for own profile via /me
    role: user.role,
    displayName: user.display_name,
    organizationType: user.organization_type || 'default_generic',
    avatarUrl: user.avatar_url,
    interests: user.interests || [],
    archetype: user.archetype || '',
    troopCode,
    isScoutAccount: !!user.is_scout_account,
    isScoutMember: Boolean(user.is_scout_account || troopCode),
    social: user.social_ids || {},
  };
}

export async function registerProfile(
  authId: string,
  email: string,
  data: {
    displayName?: string;
    role?: string;
    organizationType?: string;
  },
) {
  const existing = await userRepo.findByAuthId(authId);
  if (existing) {
    // If the user was JIT-provisioned as 'teen' but an explicit role is now provided,
    // update to the correct role so parent/leader signups aren't silently demoted.
    const requestedRole = data.role || 'teen';
    const update: Record<string, any> = {};
    if (existing.role === 'teen' && requestedRole !== 'teen') {
      update.role = requestedRole;
    }
    if (typeof data.organizationType === 'string') {
      update.organization_type = data.organizationType;
    }
    if (Object.keys(update).length > 0) {
      const updated = await userRepo.update(existing.id, update);
      return {
        id: updated.id,
        role: updated.role,
        displayName: updated.display_name,
        organizationType: updated.organization_type || 'default_generic',
      };
    }
    return {
      id: existing.id,
      role: existing.role,
      displayName: existing.display_name,
      organizationType: existing.organization_type || 'default_generic',
    };
  }

  const user = await userRepo.create({
    auth_id: authId,
    email,
    role: data.role || 'teen',
    display_name: data.displayName || '',
    organization_type: data.organizationType || 'default_generic',
  });

  return {
    id: user.id,
    role: user.role,
    displayName: user.display_name,
    organizationType: user.organization_type || 'default_generic',
  };
}

export async function updateOnboarding(
  userId: string,
  data: {
    interests?: string[];
    archetype?: string;
    cohortCode?: string;
    troopCode?: string;
    nickname?: string;
    avatar?: string;
  },
) {
  const update: any = {};
  if (Array.isArray(data.interests)) update.interests = data.interests;
  if (typeof data.archetype === 'string') update.archetype = data.archetype;
  if (typeof data.cohortCode === 'string') update.cohort_code = data.cohortCode;
  if (typeof data.troopCode === 'string') update.troop_code = data.troopCode.trim().toUpperCase();
  if (typeof data.nickname === 'string' && data.nickname.trim())
    update.display_name = data.nickname.trim();
  if (typeof data.avatar === 'string') update.avatar_url = data.avatar;

  if (Object.keys(update).length === 0) return null;

  const updated = await userRepo.update(userId, update);
  return {
    id: updated.id,
    interests: updated.interests || [],
    archetype: updated.archetype || '',
    cohortCode: updated.cohort_code || '',
    troopCode: updated.troop_code || '',
    nickname: updated.display_name || '',
    avatar: updated.avatar_url || '',
  };
}

export async function updatePreferences(
  userId: string,
  data: {
    reminderWindows?: string[];
    coachStyle?: string;
    displayName?: string;
    organizationType?: string;
    parentContact?: any;
    consentFlags?: any;
  },
) {
  const update: any = {};
  if (Array.isArray(data.reminderWindows))
    update.reminder_windows = data.reminderWindows;
  if (typeof data.coachStyle === 'string') update.coach_style = data.coachStyle;
  if (typeof data.displayName === 'string') update.display_name = data.displayName.trim();
  if (typeof data.organizationType === 'string') update.organization_type = data.organizationType;
  if (data.parentContact && typeof data.parentContact === 'object')
    update.parent_contact = data.parentContact;
  if (data.consentFlags && typeof data.consentFlags === 'object')
    update.consent_flags = data.consentFlags;

  if (Object.keys(update).length === 0) return null;

  const updated = await userRepo.update(userId, update);
  return {
    displayName: updated.display_name || '',
    organizationType: updated.organization_type || 'default_generic',
    reminderWindows: updated.reminder_windows || [],
    coachStyle: updated.coach_style || '',
    parentContact: updated.parent_contact || {},
    consentFlags: updated.consent_flags || {},
  };
}
