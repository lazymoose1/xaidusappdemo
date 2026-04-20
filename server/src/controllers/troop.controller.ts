import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import mongoose from 'mongoose';
import { Troop, User, Checkin, ScoutNudge, ScoutCredential, writeAuditLog } from '../models';
import { processScoutEvent, processTroopWeeklyReset, computeDailyStreak } from '../services/scout-badge.service';
import { Goal } from '../models';

async function resolveTroopMembers(troop: { member_ids: mongoose.Types.ObjectId[]; troop_code: string }) {
  const explicitMemberIds = troop.member_ids.map((id) => id.toString());
  const troopCodeMembers = await User.find({
    troop_code: troop.troop_code,
    role: { $in: ['teen', 'scout'] },
  })
    .select('_id display_name avatar_url')
    .lean();

  const byId = new Map<string, { _id: mongoose.Types.ObjectId; display_name?: string; avatar_url?: string | null }>();

  for (const member of troopCodeMembers) {
    byId.set((member._id as any).toString(), member as any);
  }

  if (explicitMemberIds.length > 0) {
    const explicitMembers = await User.find({ _id: { $in: explicitMemberIds } })
      .select('_id display_name avatar_url')
      .lean();

    for (const member of explicitMembers) {
      byId.set((member._id as any).toString(), member as any);
    }
  }

  return Array.from(byId.entries()).map(([id, member]) => ({
    id,
    displayName: member.display_name || 'Scout',
    avatarUrl: (member as any).avatar_url || null,
  }));
}

// ─── Leader: create troop ──────────────────────────────────────────────────────

export async function createTroop(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user || req.user.role !== 'scout_leader') {
      return res.status(403).json({ error: 'Leaders only' });
    }

    const existing = await Troop.findOne({ leader_id: req.user.id });
    if (existing) return res.status(409).json({ error: 'You already have a troop', troopCode: existing.troop_code });

    const { name, troopCode, weeklyResetDay } = req.body;

    const troop = await Troop.create({
      name,
      troop_code: troopCode.toUpperCase(),
      leader_id: req.user.id,
      member_ids: [],
      settings: {
        weekly_reset_day: weeklyResetDay || 'sun',
        check_in_windows: ['morning', 'evening'],
      },
    });

    await writeAuditLog({
      actor_id: req.user.id as any,
      actor_role: 'scout_leader',
      action: 'create_troop',
      troop_id: troop._id as any,
      metadata: { name, troopCode: troop.troop_code },
    });

    return res.status(201).json({
      id: (troop._id as any).toString(),
      troopCode: troop.troop_code,
      name: troop.name,
    });
  } catch (err: any) {
    if (err.code === 11000) return res.status(409).json({ error: 'Troop code already taken' });
    next(err);
  }
}

// ─── Leader: get my troop dashboard ───────────────────────────────────────────

export async function getTroopDashboard(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user || req.user.role !== 'scout_leader') {
      return res.status(403).json({ error: 'Leaders only' });
    }

    const troop = await Troop.findOne({ leader_id: req.user.id }).lean();
    if (!troop) return res.status(404).json({ error: 'No troop found' });

    const weekStart = (() => {
      const d = new Date();
      d.setDate(d.getDate() - d.getDay());
      d.setHours(0, 0, 0, 0);
      return d;
    })();

    const members = await resolveTroopMembers(troop);
    const memberIds = members.map((member) => member.id);

    // For each scout: did they check in this week?
    const segments: {
      active: { id: string; nickname: string; daysThisWeek: number }[];
      at_risk: { id: string; nickname: string; daysThisWeek: number }[];
      inactive: { id: string; nickname: string; daysThisWeek: number }[];
    } = { active: [], at_risk: [], inactive: [] };

    let weeklyResetCount = 0;

    for (const memberId of memberIds) {
      const memberObjId = new mongoose.Types.ObjectId(memberId);

      const daysThisWeek = await Checkin.aggregate([
        {
          $match: {
            user_id: memberObjId,
            status: 'yes',
            date: { $gte: weekStart },
          },
        },
        {
          $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$date' } } },
        },
        { $count: 'count' },
      ]).then((r) => r[0]?.count ?? 0);

      const resetDone = await Checkin.countDocuments({
        user_id: memberObjId,
        event_type: 'weekly_reset_completed',
        date: { $gte: weekStart },
      });
      if (resetDone > 0) weeklyResetCount++;

      const credentialCount = await ScoutCredential.countDocuments({ user_id: memberObjId });
      const member = members.find((entry) => entry.id === memberId);
      if (!member) continue;

      const entry = { id: memberId, nickname: member.displayName, daysThisWeek, credentialCount };
      if (daysThisWeek >= 3) segments.active.push(entry);
      else if (daysThisWeek >= 1) segments.at_risk.push(entry);
      else segments.inactive.push(entry);
    }

    const weeklyResetRate = memberIds.length > 0 ? weeklyResetCount / memberIds.length : 0;

    return res.json({
      troop: { id: (troop._id as any).toString(), name: troop.name, troopCode: troop.troop_code },
      segments,
      weeklyResetRate,
      teamCurrentProgress: weeklyResetRate,
      totalScouts: memberIds.length,
    });
  } catch (err) {
    next(err);
  }
}

// ─── Leader: send nudge ────────────────────────────────────────────────────────

export async function sendNudge(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user || req.user.role !== 'scout_leader') {
      return res.status(403).json({ error: 'Leaders only' });
    }

    const { toUserId, message } = req.body;

    const troop = await Troop.findOne({ leader_id: req.user.id }).lean();
    if (!troop) return res.status(404).json({ error: 'No troop found' });

    const members = await resolveTroopMembers(troop);
    const memberIds = members.map((member) => member.id);
    const isMember = memberIds.includes(toUserId);
    if (process.env.NODE_ENV !== 'production') {
      console.debug('[NUDGE DIAG] sendNudge request', {
        leaderId: req.user.id,
        troopId: troop._id?.toString(),
        toUserId,
        memberIds,
        isMember,
      });
    }
    if (!isMember) return res.status(403).json({ error: 'Scout is not in your troop' });

    const nudge = await ScoutNudge.create({
      from_user_id: req.user.id,
      to_user_id: toUserId,
      troop_id: troop._id,
      type: 'leader_nudge',
      message: message?.slice(0, 200),
      acknowledged: false,
    });

    await writeAuditLog({
      actor_id: req.user.id as any,
      actor_role: 'scout_leader',
      action: 'send_nudge',
      target_user_id: toUserId,
      troop_id: troop._id as any,
    });

    if (process.env.NODE_ENV !== 'production') {
      console.debug('[NUDGE DIAG] sendNudge created', {
        nudgeId: (nudge._id as any).toString(),
        toUserId,
        fromUserId: req.user.id,
        type: nudge.type,
      });
    }

    return res.status(201).json({ id: (nudge._id as any).toString() });
  } catch (err) {
    next(err);
  }
}

// ─── Leader: trigger weekly reset for entire troop ────────────────────────────

export async function troopWeeklyReset(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user || req.user.role !== 'scout_leader') {
      return res.status(403).json({ error: 'Leaders only' });
    }

    const troop = await Troop.findOne({ leader_id: req.user.id }).lean();
    if (!troop) return res.status(404).json({ error: 'No troop found' });

    const weekStart = (() => {
      const d = new Date();
      d.setDate(d.getDate() - d.getDay());
      d.setHours(0, 0, 0, 0);
      return d;
    })();

    const members = await resolveTroopMembers(troop);
    const memberIds = members.map((member) => member.id);
    const completedIds: string[] = [];

    for (const memberId of memberIds) {
      // Mark the reset event for badge tracking
      await Checkin.create({
        user_id: memberId,
        goal_id: (await Goal.findOne({ user_id: memberId }).select('_id').lean())?._id || memberId,
        status: 'yes',
        date: new Date(),
        event_type: 'weekly_reset_completed',
        created_at: new Date(),
      });
      completedIds.push(memberId);
    }

    await processTroopWeeklyReset(completedIds, memberIds.length);

    await writeAuditLog({
      actor_id: req.user.id as any,
      actor_role: 'scout_leader',
      action: 'troop_weekly_reset',
      troop_id: troop._id as any,
      metadata: { completedCount: completedIds.length, totalScouts: memberIds.length },
    });

    return res.json({
      success: true,
      completedCount: completedIds.length,
      totalScouts: memberIds.length,
      completionRate: completedIds.length / Math.max(memberIds.length, 1),
    });
  } catch (err) {
    next(err);
  }
}

// ─── Leader: award badge to scout ─────────────────────────────────────────────

export async function awardBadge(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user || req.user.role !== 'scout_leader') {
      return res.status(403).json({ error: 'Leaders only' });
    }

    const { toUserId, badgeTitle, badgeFocus, credentialType } = req.body;

    const troop = await Troop.findOne({ leader_id: req.user.id }).lean();
    if (!troop) return res.status(404).json({ error: 'No troop found' });

    const members = await resolveTroopMembers(troop);
    const isMember = members.some((member) => member.id === toUserId);
    if (!isMember) return res.status(403).json({ error: 'Scout is not in your troop' });

    const earnedAt = new Date();
    const hashInput = `${toUserId}|${credentialType || 'badge_milestone'}|${badgeTitle}|${earnedAt.toISOString()}`;
    const proofHash = crypto.createHash('sha256').update(hashInput).digest('hex');

    await ScoutCredential.create({
      user_id: toUserId,
      credential_type: credentialType || 'badge_milestone',
      title: badgeTitle,
      badge_focus: badgeFocus,
      earned_at: earnedAt,
      issued_by: req.user.id,
      proof_hash: proofHash,
      acknowledged: false,
    });

    await writeAuditLog({
      actor_id: req.user.id as any,
      actor_role: 'scout_leader',
      action: 'award_badge',
      target_user_id: toUserId,
      troop_id: troop._id as any,
      metadata: { badgeTitle, badgeFocus, credentialType },
    });

    // Trigger Proof Pulse badge check
    await processScoutEvent(toUserId, 'leader_attestation_issued');

    return res.status(201).json({ success: true, proofHash });
  } catch (err) {
    next(err);
  }
}

// ─── Leader: get scout's portable credential record ────────────────────────────

export async function getScoutRecord(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user || req.user.role !== 'scout_leader') {
      return res.status(403).json({ error: 'Leaders only' });
    }

    const { scoutId } = req.params;
    const troop = await Troop.findOne({ leader_id: req.user.id }).lean();
    if (!troop) return res.status(404).json({ error: 'No troop found' });

    const members = await resolveTroopMembers(troop);
    const isMember = members.some((member) => member.id === scoutId);
    if (!isMember) return res.status(403).json({ error: 'Scout is not in your troop' });

    const scout = members.find((member) => member.id === scoutId);
    if (!scout) return res.status(404).json({ error: 'Scout not found' });

    const credentials = await ScoutCredential.find({ user_id: scoutId })
      .sort({ earned_at: -1 })
      .lean();

    return res.json({
      scoutId,
      nickname: scout.displayName,
      avatarUrl: scout.avatarUrl || null,
      troopCode: troop.troop_code,
      credentials: credentials.map((c) => ({
        id: (c._id as any).toString(),
        credentialType: c.credential_type,
        badgeKey: c.badge_key,
        title: c.title,
        badgeFocus: c.badge_focus,
        earnedAt: c.earned_at,
        issuedBy: c.issued_by,
        proofHash: c.proof_hash,
        anchorStatus: c.anchor_status,
        anchorHandle: c.anchor_handle,
        metadata: c.metadata,
      })),
    });
  } catch (err) {
    next(err);
  }
}

// ─── Leader: log service hours for a scout ────────────────────────────────────

export async function logServiceHours(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user || req.user.role !== 'scout_leader') {
      return res.status(403).json({ error: 'Leaders only' });
    }

    const { toUserId, hours, description, projectName } = req.body;

    const troop = await Troop.findOne({ leader_id: req.user.id }).lean();
    if (!troop) return res.status(404).json({ error: 'No troop found' });

    const members = await resolveTroopMembers(troop);
    const isMember = members.some((member) => member.id === toUserId);
    if (!isMember) return res.status(403).json({ error: 'Scout is not in your troop' });

    if (!hours || hours <= 0) return res.status(400).json({ error: 'Valid hour count required' });

    const earnedAt = new Date();
    const title = projectName ? `${hours}h — ${projectName}` : `${hours} service hours`;
    const hashInput = `${toUserId}|service_hours|${title}|${earnedAt.toISOString()}`;
    const proofHash = crypto.createHash('sha256').update(hashInput).digest('hex');

    const credential = await ScoutCredential.create({
      user_id: toUserId,
      credential_type: 'service_hours',
      title,
      badge_focus: 'Community Service',
      earned_at: earnedAt,
      issued_by: req.user.id,
      proof_hash: proofHash,
      acknowledged: false,
      metadata: { hours, description, projectName },
    });

    await writeAuditLog({
      actor_id: req.user.id as any,
      actor_role: 'scout_leader',
      action: 'award_badge',
      target_user_id: toUserId,
      troop_id: troop._id as any,
      metadata: { credentialType: 'service_hours', hours, projectName },
    });

    return res.status(201).json({ success: true, proofHash, id: (credential._id as any).toString() });
  } catch (err) {
    next(err);
  }
}
