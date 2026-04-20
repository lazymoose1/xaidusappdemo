import nodemailer from 'nodemailer';
import { z } from 'zod';
import { env } from '../config/env';
import { logger } from '../lib/logger';

const smtpEnabled = !!(env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS);
const emailSchema = z.string().trim().email();

function stripHeaderControlChars(value: string) {
  return value.replace(/[\r\n]+/g, ' ').trim();
}

const transporter = smtpEnabled
  ? nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_PORT === 465,
      auth: {
        user: env.SMTP_USER,
        pass: env.SMTP_PASS,
      },
    })
  : null;

export async function sendParentEmail(
  to: string,
  subject: string,
  text: string,
  html?: string,
) {
  const safeTo = emailSchema.safeParse(to);
  if (!safeTo.success) {
    logger.warn({ to }, 'Skipping parent email because recipient address is invalid');
    return { skipped: true, provider: 'log' };
  }

  const safeSubject = stripHeaderControlChars(subject);

  if (smtpEnabled && transporter) {
    try {
      await transporter.sendMail({
        from: env.SMTP_FROM,
        to: safeTo.data,
        subject: safeSubject,
        text,
        html,
      });
      return { success: true, provider: 'smtp' };
    } catch (err) {
      logger.error({ err }, 'SMTP send failed, falling back to log');
    }
  }

  logger.warn({ to: safeTo.data, subject: safeSubject }, 'No mail transport configured; logging email');
  return { skipped: true, provider: 'log' };
}
