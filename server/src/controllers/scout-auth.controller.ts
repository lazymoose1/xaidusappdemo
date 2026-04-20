import { Request, Response, NextFunction } from 'express';
import { User, Troop, writeAuditLog } from '../models';
import {
  hashPin,
  verifyPin,
  issueScoutJwt,
  scoutSyntheticEmail,
} from '../services/scout-auth.service';

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

    const syntheticEmail = scoutSyntheticEmail(nickname, troopCode);
    const scout = await User.findOne({ email: syntheticEmail, is_scout_account: true }).lean();
    if (!scout) return res.status(401).json({ error: 'Scout not found' });
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
 * POST /api/scout-auth/create-scout
 * Leader only. Body: { nickname, pin, badgeFocus? }
 * Creates a new scout account in the leader's troop.
 */
export async function createScout(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user || req.user.role !== 'scout_leader') {
      return res.status(403).json({ error: 'Leaders only' });
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
    if (nicknameConflict) return res.status(409).json({ error: 'A scout with that nickname already exists in this troop. Choose a different one.' });

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
