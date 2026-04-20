import { Request, Response, NextFunction } from 'express';
import { Checkin, Goal, ScoutCredential, ScoutNudge, Troop } from '../models';
import { computeDailyStreak, processScoutEvent } from '../services/scout-badge.service';
import { submitHash, fetchProof } from '../services/credential-anchor.service';

function startOfWeek(d: Date): Date {
  const day = d.getDay();
  const r = new Date(d);
  r.setDate(r.getDate() - day);
  r.setHours(0, 0, 0, 0);
  return r;
}

// ─── GET /api/scout/today ─────────────────────────────────────────────────────
// Returns today stats + unread nudges + unacknowledged credentials

export async function getScoutToday(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

    const userId = req.user.id;
    const weekStart = startOfWeek(new Date());
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [dailyCheckInStreak, weeklyCheckinDates, nudges, credentials, goals] = await Promise.all([
      computeDailyStreak(userId),

      Checkin.aggregate([
        {
          $match: {
            user_id: userId,
            status: 'yes',
            date: { $gte: weekStart },
          },
        },
        {
          $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$date' } } },
        },
      ]).then((r) => r.length),

      ScoutNudge.find({ to_user_id: userId, acknowledged: false })
        .sort({ created_at: -1 })
        .limit(5)
        .lean(),

      ScoutCredential.find({ user_id: userId, acknowledged: false })
        .sort({ earned_at: -1 })
        .limit(10)
        .lean(),

      Goal.find({ user_id: userId, status: 'active', completed: false }).lean(),
    ]);

    if (process.env.NODE_ENV !== 'production') {
      console.debug('[NUDGE DIAG] getScoutToday result', {
        userId,
        nudgeCount: nudges.length,
        nudgeIds: nudges.map((n) => (n._id as any).toString()),
        credentialCount: credentials.length,
        goalCount: goals.length,
      });
    }

    // Weekly progress: planned vs completed
    let weeklyPlanned = 0;
    let weeklyCompleted = 0;
    const today2 = new Date();
    const todayIdx = today2.getDay();
    const dayKeys = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

    for (const goal of goals) {
      if (!goal.planned_days) continue;
      for (let i = 0; i <= todayIdx; i++) {
        const key = dayKeys[i];
        if (goal.planned_days[key]) {
          weeklyPlanned++;
          const dayStart = new Date(weekStart);
          dayStart.setDate(dayStart.getDate() + i);
          const dayEnd = new Date(dayStart);
          dayEnd.setDate(dayEnd.getDate() + 1);
          const done = await Checkin.countDocuments({
            user_id: userId,
            goal_id: goal._id,
            status: 'yes',
            date: { $gte: dayStart, $lt: dayEnd },
          });
          if (done > 0) weeklyCompleted++;
        }
      }
    }

    return res.json({
      dailyCheckInStreak,
      daysCheckedInThisWeek: weeklyCheckinDates,
      weeklyProgress: { planned: weeklyPlanned, completed: weeklyCompleted },
      goals: goals.map((g) => ({
        id: (g._id as any).toString(),
        title: g.title,
        badgeFocus: g.badge_focus,
        goalCategoryTag: g.goal_category_tag,
        sizePreset: g.size_preset,
        checkInWindows: g.check_in_windows,
        plannedDays: g.planned_days,
        progress: g.progress,
      })),
      nudges: nudges.map((n) => ({
        id: (n._id as any).toString(),
        type: n.type,
        message: n.message,
        createdAt: n.created_at,
      })),
      credentials: credentials.map((c) => ({
        id: (c._id as any).toString(),
        credentialType: c.credential_type,
        badgeKey: c.badge_key,
        title: c.title,
        badgeFocus: c.badge_focus,
        earnedAt: c.earned_at,
        proofHash: c.proof_hash,
        anchorStatus: c.anchor_status,
        anchorHandle: c.anchor_handle,
        anchorSubmittedAt: c.anchor_submitted_at,
      })),
    });
  } catch (err) {
    next(err);
  }
}

// ─── POST /api/scout/nudge-back ───────────────────────────────────────────────
// Scout acknowledges a nudge and optionally signals they've completed a goal

export async function nudgeBack(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

    const { nudgeId, goalCompleted } = req.body;

    const nudge = await ScoutNudge.findById(nudgeId);
    if (!nudge) return res.status(404).json({ error: 'Nudge not found' });
    if (nudge.to_user_id.toString() !== req.user.id) {
      return res.status(403).json({ error: 'Not your nudge' });
    }

    nudge.acknowledged = true;
    await nudge.save();

    if (goalCompleted) {
      // Send nudge-back to leader
      await ScoutNudge.create({
        from_user_id: req.user.id,
        to_user_id: nudge.from_user_id,
        troop_id: nudge.troop_id,
        type: 'scout_nudge_back',
        message: 'Done!',
        acknowledged: false,
      });
    }

    return res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

// ─── POST /api/scout/acknowledge-credential ───────────────────────────────────

export async function acknowledgeCredential(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

    const { credentialId } = req.body;
    const cred = await ScoutCredential.findById(credentialId);
    if (!cred) return res.status(404).json({ error: 'Credential not found' });
    if (cred.user_id.toString() !== req.user.id) {
      return res.status(403).json({ error: 'Not your credential' });
    }

    cred.acknowledged = true;
    await cred.save();

    return res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

// ─── GET /api/scout/credentials ──────────────────────────────────────────────
// Full credential history (for portfolio view)

export async function getCredentials(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

    const credentials = await ScoutCredential.find({ user_id: req.user.id })
      .sort({ earned_at: -1 })
      .lean();

    return res.json(
      credentials.map((c) => ({
        id: (c._id as any).toString(),
        credentialType: c.credential_type,
        badgeKey: c.badge_key,
        title: c.title,
        badgeFocus: c.badge_focus,
        earnedAt: c.earned_at,
        issuedBy: c.issued_by,
        proofHash: c.proof_hash,
        acknowledged: c.acknowledged,
        anchorStatus: c.anchor_status,
        anchorHandle: c.anchor_handle,
        anchorSubmittedAt: c.anchor_submitted_at,
        metadata: c.metadata,
      })),
    );
  } catch (err) {
    next(err);
  }
}

// ─── POST /api/scout/credentials/:id/anchor ───────────────────────────────────

export async function anchorCredential(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

    const cred = await ScoutCredential.findById(req.params.id);
    if (!cred) return res.status(404).json({ error: 'Credential not found' });
    if (cred.user_id.toString() !== req.user.id) {
      return res.status(403).json({ error: 'Not your credential' });
    }

    // Idempotent: already submitted or confirmed
    if (cred.anchor_status === 'submitted' || cred.anchor_status === 'confirmed') {
      return res.json({
        credentialId: cred._id.toString(),
        anchorStatus: cred.anchor_status,
        anchorHandle: cred.anchor_handle,
        submittedAt: cred.anchor_submitted_at,
      });
    }

    let handle: string;
    let anchorStatus: 'submitted' | 'failed' = 'submitted';

    try {
      const result = await submitHash(cred.proof_hash);
      handle = result.handle;
    } catch (err) {
      console.error('[anchor] submitHash error:', err);
      cred.anchor_status = 'failed';
      cred.acknowledged = true;
      await cred.save();
      return res.json({
        credentialId: cred._id.toString(),
        anchorStatus: 'failed',
      });
    }

    cred.anchor_status = anchorStatus;
    cred.anchor_handle = handle;
    cred.anchor_submitted_at = new Date();
    cred.acknowledged = true;
    await cred.save();

    return res.json({
      credentialId: cred._id.toString(),
      anchorStatus: cred.anchor_status,
      anchorHandle: cred.anchor_handle,
      submittedAt: cred.anchor_submitted_at,
    });
  } catch (err) {
    next(err);
  }
}

// ─── GET /api/scout/credentials/:id/anchor ────────────────────────────────────

export async function getAnchorStatus(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

    const cred = await ScoutCredential.findById(req.params.id);
    if (!cred) return res.status(404).json({ error: 'Credential not found' });
    if (cred.user_id.toString() !== req.user.id) {
      return res.status(403).json({ error: 'Not your credential' });
    }

    if (cred.anchor_status === 'submitted' && cred.anchor_handle) {
      try {
        const result = await fetchProof(cred.anchor_handle);
        if (result.status === 'confirmed' && result.proof) {
          cred.anchor_status = 'confirmed';
          cred.anchor_proof = result.proof;
          cred.anchor_confirmed_at = new Date();
          await cred.save();
        }
      } catch (err) {
        console.error('[anchor] fetchProof error:', err);
      }
    }

    return res.json({
      anchorStatus: cred.anchor_status,
      anchorHandle: cred.anchor_handle,
      anchorProof: cred.anchor_proof,
      anchorConfirmedAt: cred.anchor_confirmed_at,
    });
  } catch (err) {
    next(err);
  }
}

// ─── POST /api/scout/session-close ───────────────────────────────────────────
// "Done for today" — records session_closed event for Boundary Boss + Quiet Power

export async function sessionClose(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

    const goal = await Goal.findOne({ user_id: req.user.id, status: 'active' }).select('_id').lean();

    await Checkin.create({
      user_id: req.user.id,
      goal_id: goal?._id || req.user.id,
      status: 'yes',
      date: new Date(),
      event_type: 'session_closed',
      created_at: new Date(),
    });

    await processScoutEvent(req.user.id, 'session_closed');

    return res.json({ success: true });
  } catch (err) {
    next(err);
  }
}
