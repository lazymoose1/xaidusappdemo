import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(4000),
  MONGODB_URI: z.string().min(1),
  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  FRONTEND_ORIGIN: z.string().default('http://localhost:5173'),
  SYSTEM_API_KEY: z.string().min(1).optional(),
  TOKEN_ENCRYPTION_KEY: z.string().min(1).optional(),
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_MODEL: z.string().default('gpt-5.4-2026-03-05'),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().default(587),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM: z.string().default('no-reply@dus.app'),
  GOOGLE_CLIENT_ID: z.string().optional(),
  TWITTER_CLIENT_ID: z.string().optional(),
  SCOUT_JWT_SECRET: z.string().default('scout-dev-secret-change-in-prod'),
  LEADER_INVITE_CODE: z.string().default('LEADER-DEV-CODE'),
  CHAINPOINT_GATEWAY_URL: z.string().url().optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment variables:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

if (parsed.data.NODE_ENV === 'production') {
  const WEAK_DEFAULTS = [
    'dev-system-api-key-change-in-prod',
    'dev-token-encryption-key-change-in-prod',
    'your_session_secret_here',
  ];
  const weakFields: string[] = [];
  if (WEAK_DEFAULTS.includes(parsed.data.SYSTEM_API_KEY || '')) weakFields.push('SYSTEM_API_KEY');
  if (WEAK_DEFAULTS.includes(parsed.data.TOKEN_ENCRYPTION_KEY || '')) weakFields.push('TOKEN_ENCRYPTION_KEY');
  if (!parsed.data.SYSTEM_API_KEY) weakFields.push('SYSTEM_API_KEY (missing)');
  if (!parsed.data.TOKEN_ENCRYPTION_KEY) weakFields.push('TOKEN_ENCRYPTION_KEY (missing)');
  if (weakFields.length > 0) {
    console.error(`FATAL: Weak or missing secrets in production: ${weakFields.join(', ')}`);
    process.exit(1);
  }
}

export const env = parsed.data;
