import mongoose from 'mongoose';
import { env } from '../config/env';
import { logger } from './logger';

let isConnected = false;
let keepaliveStarted = false;

// Atlas M0 free-tier clusters pause after ~60 days of no activity.
// Ping every 4 minutes to keep the cluster alive indefinitely.
const KEEPALIVE_INTERVAL_MS = 4 * 60 * 1000;

function startKeepalive() {
  if (keepaliveStarted) return;
  keepaliveStarted = true;
  setInterval(async () => {
    if (!isConnected) return;
    try {
      await mongoose.connection.db?.command({ ping: 1 });
    } catch {
      // Non-fatal — the disconnected event will handle reconnect logging
    }
  }, KEEPALIVE_INTERVAL_MS);
}

export async function connectDB(): Promise<void> {
  if (isConnected) return;

  const MAX_RETRIES = env.NODE_ENV === 'development' ? Number.POSITIVE_INFINITY : 5;
  const BASE_DELAY_MS = 3000;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      await mongoose.connect(env.MONGODB_URI, {
        maxPoolSize: 20,
        serverSelectionTimeoutMS: 15000,
      });
      isConnected = true;
      logger.info('MongoDB connected');
      startKeepalive();
      break;
    } catch (error) {
      if (attempt === MAX_RETRIES) {
        logger.error({ error }, 'MongoDB connection failed after max retries');
        process.exit(1);
      }

      const delayMultiplier =
        env.NODE_ENV === 'development' ? Math.min(attempt, 5) : attempt;
      const delay = BASE_DELAY_MS * delayMultiplier;
      const totalAttempts =
        Number.isFinite(MAX_RETRIES) ? MAX_RETRIES.toString() : 'infinite';

      logger.warn(
        `MongoDB connection attempt ${attempt}/${totalAttempts} failed — retrying in ${delay / 1000}s`,
      );
      await new Promise((r) => setTimeout(r, delay));
    }
  }

  mongoose.connection.on('error', (err) => {
    logger.error({ err }, 'MongoDB connection error');
  });

  mongoose.connection.on('disconnected', () => {
    isConnected = false;
    logger.warn('MongoDB disconnected');
  });
}
