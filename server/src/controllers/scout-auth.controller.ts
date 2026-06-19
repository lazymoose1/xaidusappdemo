import { Request, Response, NextFunction } from 'express';
import { User, Troop, Goal, writeAuditLog } from '../models';
import * as parentChildLinkRepo from '../repositories/parent-child-link.repo';
import {
  hashPin,
  verifyPin,
  issueScoutJwt,
  scoutSyntheticEmail,
  scoutSyntheticEmailCandidates,
} from '../services/scout-auth.service';

// Self-signup teens have no leader/troop; this sentinel namespaces their
// synthetic email and JWT so they never collide with a real troop's youth.
const SELF_SIGNUP_TROOP = 'SELF';

/**
 * POST /api/scout-auth/login
 * Body: { troopCode, nickname, pin }
 * Returns: { token, user }
 */
export async function scoutLogin(req: Request, res: Response, next: NextFunction) {
  try {
    const { troopCode, nickname, pin } = req.body;

    const troop = await Troop.findOne({ troop_code: troopCode.toUpperCase() }).lean();
    if (!troop) return res.status(401).json({ error: 'Invalid troop code' });

    const scout = await User.findOne({
      email: { $in: scoutSyntheticEmailCandidates(nickname, troopCode) },
      is_scout_account: true,
    }).lean();
    if (!scout) return res.status(401).json({ error: 'Youth not found' });
    if (!scout.scout_pin_hash) return res.status(401).json({ error: 'Account not set up' });

    const pinOk = await verifyPin(pin, scout.scout_pin_hash);
    if (!pinOk) return res.status(401).json({ error: 'Incorrect PIN' });

    const token = issueScoutJwt({
      sub: (scout._id as any).toString(),
      role: 'scout',
      troopCode: troopCode.toUpperCase(),
      nickname: scout.display_name,
    });

    return res.json({
      token,
      user: {
        id: (scout._id as any).toString(),
        role: scout.role,
        displayName: scout.display_name,
        troopCode: scout.troop_code,
        isScoutAccount: true,
        isScoutMember: true,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/scout-auth/signup
 * Public. Body: { username, passphrase, reason? }
 * Self-service teen signup (no leader/troop). Creates the account, stores the
 * reason as motivation + seeds it as a first goal, and returns a session token.
 */
export async function selfSignup(req: Request, res: Response, next: NextFunction) {
  try {
    const { username, passphrase, reason, inviteCode } = req.body as {
      username: string;
      passphrase: string;
      reason?: string;
      inviteCode?: string;
    };

    const syntheticEmail = scoutSyntheticEmail(username, SELF_SIGNUP_TROOP);

    const existing = await User.findOne({
      email: { $in: scoutSyntheticEmailCandidates(username, SELF_SIGNUP_TROOP) },
    }).lean();
    if (existing) {
      return res.status(409).json({ error: 'That username is taken. Try another.' });
    }

    // Resolve the parent invite code before creating anything so an invalid code
    // never leaves an orphaned account.
    let parent: { _id: unknown } | null = null;
    const trimmedCode = (inviteCode || '').trim().toUpperCase();
    if (trimmedCode) {
      parent = await User.findOne({ parent_invite_code: trimmedCode, role: 'parent' }).lean();
      if (!parent) {
        return res.status(400).json({ error: 'That invite code is not valid. Check it with your parent.' });
      }
    }

    const pinHash = await hashPin(passphrase);
    const trimmedReason = (reason || '').trim();

    const scout = await User.create({
      auth_id: `self_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      email: syntheticEmail,
      display_name: username.trim(),
      role: 'teen',
      is_scout_account: true,
      scout_pin_hash: pinHash,
      troop_code: SELF_SIGNUP_TROOP,
      interests: [],
      reminder_windows: [],
      ...(trimmedReason ? { signup_reason: trimmedReason } : {}),
    });

    // Seed the reason as their first goal so the Goals/TINY flow has a starting point.
    if (trimmedReason) {
      await Goal.create({
        user_id: scout._id,
        title: trimmedReason.slice(0, 120),
        category: 'personal',
        status: 'active',
        completed: false,
        source: 'signup',
      });
    }

    // Link to the parent whose invite code was used.
    if (parent) {
      await parentChildLinkRepo
        .create((parent._id as any).toString(), (scout._id as any).toString())
        .catch(() => {});
    }

    const token = issueScoutJwt({
      sub: (scout._id as any).toString(),
      role: 'scout',
      troopCode: SELF_SIGNUP_TROOP,
      nickname: scout.display_name,
    });

    return res.status(201).json({
      token,
      user: {
        id: (scout._id as any).toString(),
        role: scout.role,
        displayName: scout.display_name,
        troopCode: scout.troop_code,
        isScoutAccount: true,
        isScoutMember: false,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/scout-auth/login-username
 * Public. Body: { username, passphrase }
 * Login for self-signup teens (username + passphrase, no troop code).
 */
export async function selfLogin(req: Request, res: Response, next: NextFunction) {
  try {
    const { username, passphrase } = req.body as { username: string; passphrase: string };

    const scout = await User.findOne({
      email: { $in: scoutSyntheticEmailCandidates(username, SELF_SIGNUP_TROOP) },
      is_scout_account: true,
    }).lean();
    if (!scout || !scout.scout_pin_hash) {
      return res.status(401).json({ error: 'Username or passphrase is incorrect' });
    }

    const ok = await verifyPin(passphrase, scout.scout_pin_hash);
    if (!ok) return res.status(401).json({ error: 'Username or passphrase is incorrect' });

    const token = issueScoutJwt({
      sub: (scout._id as any).toString(),
      role: 'scout',
      troopCode: scout.troop_code || SELF_SIGNUP_TROOP,
      nickname: scout.display_name,
    });

    return res.json({
      token,
      user: {
        id: (scout._id as any).toString(),
        role: scout.role,
        displayName: scout.display_name,
        troopCode: scout.troop_code,
        isScoutAccount: true,
        isScoutMember: false,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/scout-auth/create-scout
 * Leader only. Body: { nickname, pin, badgeFocus? }
 * Creates a new scout account in the leader's troop.
 */
export async function createScout(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user || req.user.role !== 'scout_leader') {
      return res.status(403).json({ error: 'Support leaders only' });
    }

    const { nickname, pin, badgeFocus } = req.body;

    const troop = await Troop.findOne({ leader_id: req.user.id }).lean();
    if (!troop) return res.status(404).json({ error: 'No troop found for this leader' });

    // Nicknames must be unique within the troop so parents can link by nickname + troop code
    const escapedNickname = nickname.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const nicknameConflict = await User.findOne({
      display_name: new RegExp(`^${escapedNickname}$`, 'i'),
      is_scout_account: true,
      troop_code: troop.troop_code,
    });
    if (nicknameConflict) return res.status(409).json({ error: 'A youth profile with that nickname already exists in this group. Choose a different one.' });

    const syntheticEmail = scoutSyntheticEmail(nickname, troop.troop_code);

    const pinHash = await hashPin(pin);

    const scout = await User.create({
      auth_id: `scout_${troop.troop_code}_${Date.now()}`,
      email: syntheticEmail,
      display_name: nickname,
      role: 'teen',
      is_scout_account: true,
      scout_pin_hash: pinHash,
      troop_code: troop.troop_code,
      interests: [],
      reminder_windows: [],
      ...(badgeFocus ? { archetype: badgeFocus } : {}),
    });

    await Troop.findByIdAndUpdate(troop._id, {
      $addToSet: { member_ids: scout._id },
    });

    await writeAuditLog({
      actor_id: req.user.id as any,
      actor_role: 'scout_leader',
      action: 'create_scout',
      target_user_id: scout._id as any,
      troop_id: troop._id as any,
      metadata: { nickname, badgeFocus },
    });

    return res.status(201).json({
      id: (scout._id as any).toString(),
      nickname: scout.display_name,
      troopCode: troop.troop_code,
    });
  } catch (err) {
    next(err);
  }
}
