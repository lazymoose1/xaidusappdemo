/**
 * Script to populate test user data with social provider tokens.
 * Run: npm run populate-test-user
 */
import readline from 'readline';
import dotenv from 'dotenv';
import { saveSocialAuth } from '../src/services/mongoService';

dotenv.config();
dotenv.config({ path: '.env.local', override: true });

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(prompt: string) {
  return new Promise<string>((resolve) => {
    rl.question(prompt, resolve);
  });
}

async function populateInteractive() {
  console.log('\n=== Populate Test User with Social Provider Tokens ===\n');
  const dusUserId = (await question('Enter user ID (e.g., lazymoose1): ')).trim();
  if (!dusUserId) throw new Error('User ID is required');

  console.log('\nAvailable platforms: google, facebook, linkedin, twitter, instagram');
  const platform = (await question('Enter platform: ')).trim().toLowerCase();
  if (!platform) throw new Error('Platform is required');

  const accessToken = (await question('Enter access token: ')).trim();
  if (!accessToken) throw new Error('Access token is required');

  const refreshToken = (await question('Enter refresh token (optional): ')).trim();
  const expiresInStr = (await question('Enter token expiration in seconds (optional): ')).trim();
  const socialUserId = (await question('Enter social user ID (optional): ')).trim();

  const expiresIn = expiresInStr ? parseInt(expiresInStr, 10) : undefined;

  await saveSocialAuth({
    dusUserId,
    platform,
    accessToken,
    refreshToken: refreshToken || null,
    expiresIn: expiresIn || null,
    socialUserId: socialUserId || null,
    profile: {
      addedBy: 'populateTestUser script',
      addedAt: new Date().toISOString(),
    },
  });

  console.log('\n✅ Saved social auth for', dusUserId, 'platform:', platform);
}

async function quickMode(args: string[]) {
  const [dusUserId, platform, accessToken, refreshToken = '', expiresInStr = ''] = args;
  if (!dusUserId || !platform || !accessToken) return false;

  await saveSocialAuth({
    dusUserId,
    platform: platform.toLowerCase(),
    accessToken,
    refreshToken: refreshToken || null,
    expiresIn: expiresInStr ? parseInt(expiresInStr, 10) : null,
    socialUserId: null,
    profile: {
      addedBy: 'populateTestUser script (quick mode)',
      addedAt: new Date().toISOString(),
    },
  });

  console.log('\n✅ Saved social auth for', dusUserId, 'platform:', platform.toLowerCase());
  return true;
}

async function main() {
  const args = process.argv.slice(2);
  const ranQuick = await quickMode(args);
  if (!ranQuick) {
    try {
      await populateInteractive();
    } catch (err) {
      console.error('\n❌ Error:', (err as Error).message);
    } finally {
      rl.close();
    }
  } else {
    rl.close();
  }
}

main().catch((err) => {
  console.error(err);
  rl.close();
  process.exit(1);
});
