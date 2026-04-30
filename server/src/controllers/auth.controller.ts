import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import * as userService from '../services/user.service';
import * as roleCodeService from '../services/role-code.service';
import { supabaseAdmin } from '../config/supabase';
import { env } from '../config/env';
import { UNREGISTERED_USER_ID } from '../middleware/auth';
import { writeAuditLog } from '../models';
import { logger } from '../lib/logger';

function authDiagnosticsEnabled() {
  return env.AUTH_DIAGNOSTICS === 'true';
}

function maskEmail(email?: string | null) {
  if (!email) return null;
  const [name, domain] = email.split('@');
  if (!domain) return 'invalid-email';
  const first = name.charAt(0) || '*';
  return `${first}${'*'.repeat(Math.max(name.length - 1, 1))}@${domain}`;
}

function idTail(id?: string | null) {
  if (!id) return null;
  return id.length <= 8 ? id : id.slice(-8);
}

export async function registerProfile(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

    const { displayName, role: requestedRole, leaderInviteCode, organizationType } = req.body || {};

    // Validate leader invite code — timing-safe comparison
    let role = requestedRole || 'teen';
    if (requestedRole === 'scout_leader') {
      const expected = Buffer.from(env.LEADER_INVITE_CODE);
      const provided = Buffer.from(leaderInviteCode || '');
      const valid = expected.length === provided.length && crypto.timingSafeEqual(expected, provided);
      if (!valid) {
        return res.status(403).json({ error: 'Invalid leader invite code' });
      }
    }
    // Get email from supabase user
    const { data } = await supabaseAdmin.auth.admin.getUserById(req.user.authId);
    const email = data?.user?.email || '';

    const result = await userService.registerProfile(req.user.authId, email, {
      displayName,
      role,
      organizationType,
    });

    return res.status(201).json(result);
  } catch (err) {
    next(err);
  }
}

export async function getMe(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

    // JIT user provisioning: auto-create MongoDB user on first login
    if (req.user.id === UNREGISTERED_USER_ID) {
      const { data } = await supabaseAdmin.auth.admin.getUserById(req.user.authId);
      const email = data?.user?.email || '';
      const displayName = email ? email.split('@')[0] : 'New User';

      const result = await userService.registerProfile(req.user.authId, email, {
        displayName,
        role: 'teen',
      });

      if (authDiagnosticsEnabled()) {
        logger.warn(
          {
            requestId: req.id,
            authPath: 'supabase',
            action: 'jit_created_profile',
            supabaseUserIdTail: idTail(req.user.authId),
            supabaseEmail: maskEmail(email),
            mongoUserId: result.id,
            mongoRole: result.role,
          },
          'Auth lookup diagnostics: created missing Mongo profile during /api/auth/me',
        );
      }

      return res.json({
        id: result.id,
        email,
        role: result.role,
        displayName: result.displayName,
        organizationType: result.organizationType || 'default_generic',
        avatarUrl: '',
        interests: [],
        archetype: '',
        troopCode: undefined,
        isScoutAccount: false,
        isScoutMember: false,
        social: {},
      });
    }

    const profile = await userService.getProfile(req.user.id);
    if (authDiagnosticsEnabled()) {
      logger.info(
        {
          requestId: req.id,
          action: 'returned_profile',
          mongoUserId: profile.id,
          role: profile.role,
          displayName: profile.displayName || null,
          organizationType: profile.organizationType,
          troopCode: profile.troopCode || null,
          isScoutAccount: profile.isScoutAccount,
          isScoutMember: profile.isScoutMember,
          email: maskEmail(profile.email),
        },
        'Auth lookup diagnostics: /api/auth/me response profile',
      );
    }
    return res.json(profile);
  } catch (err) {
    next(err);
  }
}

export async function sendRoleCode(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

    const { targetRole } = req.body as { targetRole: 'teen' | 'parent' | 'scout_leader' };

    const { data } = await supabaseAdmin.auth.admin.getUserById(req.user.authId);
    const email = data?.user?.email;
    if (!email) return res.status(400).json({ error: 'No email on file for this account.' });

    await roleCodeService.sendRoleCode(req.user.id, email, targetRole);

    return res.json({ sent: true });
  } catch (err) {
    next(err);
  }
}

export async function applyRoleChange(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

    const { targetRole, code, leaderInviteCode } = req.body as {
      targetRole: 'teen' | 'parent' | 'scout_leader';
      code: string;
      leaderInviteCode?: string;
    };

    // Extra validation for leader role — timing-safe comparison
    if (targetRole === 'scout_leader') {
      const expected = Buffer.from(env.LEADER_INVITE_CODE);
      const provided = Buffer.from(leaderInviteCode || '');
      const valid =
        expected.length === provided.length &&
        crypto.timingSafeEqual(expected, provided);
      if (!valid) return res.status(403).json({ error: 'Invalid leader invite code.' });
    }

    const result = await roleCodeService.applyRoleChange(req.user.id, code, targetRole);
    return res.json(result);
  } catch (err: any) {
    if (err?.message === 'Invalid or expired code.') {
      return res.status(400).json({ error: err.message });
    }
    next(err);
  }
}

export async function demoAuth(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    if (env.NODE_ENV !== 'development') {
      return res.status(403).json({ error: 'Demo auth not allowed' });
    }

    return res.json({
      token: 'demo-token',
      user: { id: 'demo-user', role: 'teen', displayName: 'Demo user' },
    });
  } catch (err) {
    next(err);
  }
}
