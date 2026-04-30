import crypto from 'crypto';
import mongoose from 'mongoose';
import { RoleCode } from '../models/role-code.model';
import { User } from '../models';
import { sendParentEmail } from './notification.service';
import { logger } from '../lib/logger';

const CODE_TTL_MS = 15 * 60 * 1000; // 15 minutes

function hashCode(code: string): string {
  return crypto.createHash('sha256').update(code).digest('hex');
}

function generateCode(): string {
  // 10-digit numeric OTP
  return String(crypto.randomInt(1_000_000_000, 9_999_999_999));
}

export async function sendRoleCode(
  userId: string,
  userEmail: string,
  targetRole: 'teen' | 'parent' | 'scout_leader',
): Promise<void> {
  const code = generateCode();
  const hash = hashCode(code);
  const expiresAt = new Date(Date.now() + CODE_TTL_MS);

  // Invalidate any existing unused codes for this user
  await RoleCode.deleteMany({
    user_id: new mongoose.Types.ObjectId(userId),
    used_at: { $exists: false },
  });

  await RoleCode.create({
    user_id: new mongoose.Types.ObjectId(userId),
    code_hash: hash,
    target_role: targetRole,
    expires_at: expiresAt,
  });

  const roleLabel = targetRole === 'scout_leader' ? 'Support leader' : targetRole.charAt(0).toUpperCase() + targetRole.slice(1);

  await sendParentEmail(
    userEmail,
    `Your Xaidus role change code`,
    `Your verification code to switch to the ${roleLabel} role is: ${code}\n\nThis code expires in 15 minutes and can only be used once.\n\nIf you didn't request this, you can ignore this email.`,
    `<p>Your verification code to switch to the <strong>${roleLabel}</strong> role is:</p>
<h2 style="letter-spacing:0.2em;font-family:monospace">${code}</h2>
<p>This code expires in <strong>15 minutes</strong> and can only be used once.</p>
<p style="color:#888;font-size:0.85em">If you didn't request this, you can ignore this email.</p>`,
  );

  logger.info({ userId, targetRole }, 'Role change code sent');
}

export async function applyRoleChange(
  userId: string,
  code: string,
  targetRole: 'teen' | 'parent' | 'scout_leader',
): Promise<{ role: string }> {
  const hash = hashCode(code.trim());

  const record = await RoleCode.findOne({
    user_id: new mongoose.Types.ObjectId(userId),
    code_hash: hash,
    target_role: targetRole,
    used_at: { $exists: false },
    expires_at: { $gt: new Date() },
  });

  if (!record) {
    throw new Error('Invalid or expired code.');
  }

  // Mark as used
  record.used_at = new Date();
  await record.save();

  // Apply role
  await User.findByIdAndUpdate(userId, { role: targetRole });

  logger.info({ userId, targetRole }, 'Role changed');
  return { role: targetRole };
}
