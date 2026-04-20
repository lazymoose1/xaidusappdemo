import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { env } from '../config/env';

const SCOUT_JWT_SECRET = process.env.SCOUT_JWT_SECRET || 'scout-dev-secret-change-in-prod';
const SCOUT_JWT_EXPIRES_IN = '7d';
const PIN_SALT_ROUNDS = 10;

export interface ScoutJwtPayload {
  sub: string;       // MongoDB userId
  role: 'scout';
  troopCode: string;
  nickname: string;
}

/** Generate a synthetic internal email for a scout (never a real account). */
export function scoutSyntheticEmail(nickname: string, troopCode: string): string {
  const slug = nickname.toLowerCase().replace(/[^a-z0-9]/g, '');
  const tc = troopCode.toLowerCase();
  return `${slug}.${tc}@scouts.internal`;
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
