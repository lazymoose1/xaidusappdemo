import rateLimit, { ipKeyGenerator } from 'express-rate-limit';

const isDev = process.env.NODE_ENV !== 'production';

const norm = (v: unknown): string => (typeof v === 'string' ? v.trim().toLowerCase() : '');

export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isDev ? 10_000 : 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later' },
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isDev ? 500 : 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many auth attempts, please try again later' },
});

// Signup abuse block: IP-keyed, 15-minute window (mass account creation / spam).
export const signupLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isDev ? 500 : 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many sign-up attempts, please try again later' },
});

// Login is brute-forced against an *account*, not an IP — so key by the target
// identity (username, or troopCode+nickname). This protects accounts without
// penalizing shared networks (a whole school behind one NAT). Only failed
// attempts count, so normal successful logins never burn budget.
export const loginAccountLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isDev ? 500 : 8,
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts for this account, please try again later' },
  keyGenerator: (req) => {
    const b = (req.body ?? {}) as Record<string, unknown>;
    const username = norm(b.username);
    if (username) return `login-acct:user:${username}`;
    const troop = norm(b.troopCode);
    const nickname = norm(b.nickname);
    if (troop && nickname) return `login-acct:scout:${troop}:${nickname}`;
    return `login-acct:ip:${ipKeyGenerator(req.ip ?? '')}`;
  },
});

// Org-level login limiter: stops an attacker spreading guesses across many
// different accounts within the same org/troop (e.g. all of one Girl Scouts
// group). Keyed by troopCode; only applies where a group code is present.
export const loginOrgLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isDev ? 1000 : 30,
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts for this group, please try again later' },
  keyGenerator: (req) => {
    const troop = norm((req.body as Record<string, unknown> | undefined)?.troopCode);
    return troop ? `login-org:${troop}` : `login-org:ip:${ipKeyGenerator(req.ip ?? '')}`;
  },
});

export const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many AI requests, please try again later' },
});

export const uploadLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many upload requests, please try again later' },
});

export const cronLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 2,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many cron requests, please try again later' },
});

export const parentPortalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many parent portal requests, please try again later' },
});

export const messagingLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many messaging requests, please try again later' },
});
