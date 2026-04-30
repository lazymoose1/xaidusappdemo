import { Request, Response, NextFunction, RequestHandler } from 'express';
import crypto from 'crypto';
import { supabaseAdmin } from '../config/supabase';
import { env } from '../config/env';
import { User } from '../models';
import { verifyScoutJwt } from '../services/scout-auth.service';
import { logger } from '../lib/logger';

export const UNREGISTERED_USER_ID = '__unregistered__';

export interface AuthUser {
  id: string;
  role: string;
  authId: string;
  troopCode?: string;
  isScoutAccount?: boolean;
  isScoutMember?: boolean;
}

function isAuthDiagnosticsEnabled(req: Request) {
  return env.AUTH_DIAGNOSTICS === 'true' && req.originalUrl.includes('/api/auth/me');
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

function logAuthLookup(req: Request, data: Record<string, unknown>, message: string) {
  if (!isAuthDiagnosticsEnabled(req)) return;
  logger.info(
    {
      requestId: req.id,
      path: req.originalUrl,
      dbName: User.db.name,
      collection: User.collection.name,
      ...data,
    },
    message,
  );
}

export const authMiddleware: RequestHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const token = auth.slice(7);

  // Demo token only in development
  if (env.NODE_ENV === 'development' && token === 'demo-token') {
    req.user = { id: 'demo-user', role: 'teen', authId: 'demo-auth-id', isScoutAccount: false, isScoutMember: false };
    return next();
  }

  // Scout PIN-auth path: scout JWTs are verified independently of Supabase
  const scoutPayload = verifyScoutJwt(token);
  if (scoutPayload) {
    const dbUser = await User.findById(scoutPayload.sub).select('role is_scout_account troop_code').lean();
    logAuthLookup(
      req,
      {
        authPath: 'scout_jwt',
        scoutPayloadSubTail: idTail(scoutPayload.sub),
        mongoUserFound: Boolean(dbUser),
        mongoUserId: dbUser ? (dbUser._id as any).toString() : null,
        mongoRole: dbUser?.role || null,
        troopCode: dbUser?.troop_code || null,
        isScoutAccount: Boolean(dbUser?.is_scout_account),
      },
      'Auth lookup diagnostics: scout token resolved',
    );
    if (!dbUser || !dbUser.is_scout_account) {
      return res.status(401).json({ error: 'Invalid scout token' });
    }
    const troopCode = typeof dbUser.troop_code === 'string' ? dbUser.troop_code : undefined;
    req.user = {
      id: (dbUser._id as any).toString(),
      role: dbUser.role,
      authId: (dbUser._id as any).toString(),
      troopCode,
      isScoutAccount: !!dbUser.is_scout_account,
      isScoutMember: Boolean(dbUser.is_scout_account || troopCode),
    };
    return next();
  }

  // Standard Supabase path (leaders, parents, teens)
  try {
    const {
      data: { user: supaUser },
      error,
    } = await supabaseAdmin.auth.getUser(token);

    if (error || !supaUser) {
      logAuthLookup(
        req,
        {
          authPath: 'supabase',
          supabaseUserFound: false,
          supabaseError: error?.message || null,
        },
        'Auth lookup diagnostics: Supabase token rejected',
      );
      return res.status(401).json({ error: 'Invalid token' });
    }

    const dbUser = await User.findOne({ auth_id: supaUser.id })
      .select('role auth_id troop_code is_scout_account')
      .lean();

    logAuthLookup(
      req,
      {
        authPath: 'supabase',
        supabaseUserFound: true,
        supabaseUserIdTail: idTail(supaUser.id),
        supabaseEmail: maskEmail(supaUser.email),
        mongoLookup: { auth_id_tail: idTail(supaUser.id) },
        mongoUserFound: Boolean(dbUser),
        mongoUserId: dbUser ? (dbUser._id as any).toString() : null,
        mongoAuthIdTail: idTail(dbUser?.auth_id),
        mongoRole: dbUser?.role || null,
        troopCode: dbUser?.troop_code || null,
        isScoutAccount: Boolean(dbUser?.is_scout_account),
      },
      'Auth lookup diagnostics: Supabase user mapped to Mongo profile',
    );

    if (!dbUser) {
      // Allow through for profile registration — controller will create the DB row
      req.user = { id: UNREGISTERED_USER_ID, role: 'teen', authId: supaUser.id, isScoutAccount: false, isScoutMember: false };
      return next();
    }

    const troopCode = typeof dbUser.troop_code === 'string' ? dbUser.troop_code : undefined;
    req.user = {
      id: (dbUser._id as any).toString(),
      role: dbUser.role,
      authId: dbUser.auth_id,
      troopCode,
      isScoutAccount: !!dbUser.is_scout_account,
      isScoutMember: Boolean(dbUser.is_scout_account || troopCode),
    };
    return next();
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

export function requireRole(roles: string[]): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    if (!roles.includes(req.user.role))
      return res.status(403).json({ error: 'Forbidden' });
    next();
  };
}

/** Reject requests without a valid SYSTEM_API_KEY header. Uses timing-safe comparison. */
export const requireApiKey: RequestHandler = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const apiKey = req.headers['x-api-key'];
  if (!env.SYSTEM_API_KEY || typeof apiKey !== 'string') {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const expected = Buffer.from(env.SYSTEM_API_KEY);
  const provided = Buffer.from(apiKey);
  if (expected.length !== provided.length || !crypto.timingSafeEqual(expected, provided)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
};

/** Reject requests from users who authenticated via Supabase but have no DB profile yet. */
export const requireRegistered: RequestHandler = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  if (!req.user || req.user.id === UNREGISTERED_USER_ID) {
    return res.status(403).json({ error: 'Profile registration required' });
  }
  next();
};
