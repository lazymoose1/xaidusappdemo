import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { env } from '../config/env';

const SCOUT_JWT_SECRET = env.SCOUT_JWT_SECRET;
const SCOUT_JWT_EXPIRES_IN = '7d';
const PIN_SALT_ROUNDS = 10;

export interface ScoutJwtPayload {
  sub: string;       // MongoDB userId
  role: 'scout';
  troopCode: string;
  nickname: string;
}

// Synthetic emails are internal placeholders for PIN/passphrase youth accounts
// (never real mailboxes). The local part always carries a `.<troopCode>` suffix
// so it can't collide with a real xaidus.co address.
const SCOUT_EMAIL_DOMAIN = 'xaidus.co';
// Domains used by accounts created before the switch — still honored on lookup
// so existing youth keep logging in.
const LEGACY_SCOUT_EMAIL_DOMAINS = ['scouts.internal'];

function scoutEmailLocalPart(nickname: string, troopCode: string): string {
  const slug = nickname.toLowerCase().replace(/[^a-z0-9]/g, '');
  const tc = troopCode.toLowerCase();
  return `${slug}.${tc}`;
}

/** Generate the synthetic email for a scout (never a real account). */
export function scoutSyntheticEmail(nickname: string, troopCode: string): string {
  return `${scoutEmailLocalPart(nickname, troopCode)}@${SCOUT_EMAIL_DOMAIN}`;
}

/** Current + legacy synthetic emails for the same identity, for lookups/uniqueness. */
export function scoutSyntheticEmailCandidates(nickname: string, troopCode: string): string[] {
  const local = scoutEmailLocalPart(nickname, troopCode);
  return [`${local}@${SCOUT_EMAIL_DOMAIN}`, ...LEGACY_SCOUT_EMAIL_DOMAINS.map((d) => `${local}@${d}`)];
}

export async function hashPin(pin: string): Promise<string> {
  return bcrypt.hash(pin, PIN_SALT_ROUNDS);
}

export async function verifyPin(pin: string, hash: string): Promise<boolean> {
  return bcrypt.compare(pin, hash);
}

export function issueScoutJwt(payload: ScoutJwtPayload): string {
  return jwt.sign(payload, SCOUT_JWT_SECRET, { expiresIn: SCOUT_JWT_EXPIRES_IN });
}

export function verifyScoutJwt(token: string): ScoutJwtPayload | null {
  try {
    const payload = jwt.verify(token, SCOUT_JWT_SECRET) as ScoutJwtPayload;
    if (payload.role !== 'scout') return null;
    return payload;
  } catch {
    return null;
  }
}

/** Compute a deterministic proof hash for a credential. */
export function computeProofHash(userId: string, type: string, title: string, earnedAt: Date): string {
  const data = `${userId}|${type}|${title}|${earnedAt.toISOString()}`;
  return crypto.createHash('sha256').update(data).digest('hex');
}
