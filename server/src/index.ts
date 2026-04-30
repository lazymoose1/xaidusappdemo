import { env } from './config/env';
import { connectDB, isDBConnected } from './lib/mongoose';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import crypto from 'crypto';
import { generalLimiter } from './middleware/rate-limiter';
import { errorHandler } from './middleware/error-handler';
import { apiRouter } from './routes';
import { logger } from './lib/logger';

const app = express();

const productionOrigins = [
  env.FRONTEND_ORIGIN,
  ...(env.FRONTEND_ORIGINS || '').split(','),
]
  .map((origin) => origin.trim())
  .filter(Boolean);

logger.info(
  {
    nodeEnv: env.NODE_ENV,
    frontendOrigin: env.FRONTEND_ORIGIN,
    frontendOriginsRaw: env.FRONTEND_ORIGINS || null,
    productionOrigins,
  },
  'CORS origin allowlist configured',
);

const isAllowedDevOrigin = (origin: string) => {
  try {
    const url = new URL(origin);
    return (
      ['localhost', '127.0.0.1'].includes(url.hostname) &&
      ['http:', 'https:'].includes(url.protocol)
    );
  } catch {
    return false;
  }
};

app.set('trust proxy', 1);

// Attach unique request ID to every request
app.use((req, _res, next) => {
  (req as any).id = crypto.randomUUID();
  next();
});

app.use(helmet());

// HTTPS enforcement in production
if (env.NODE_ENV === 'production') {
  app.use((req, res, next) => {
    if (req.headers['x-forwarded-proto'] !== 'https') {
      return res.redirect(301, `https://${req.headers.host}${req.url}`);
    }
    next();
  });
}
app.use(
  cors({
    origin(origin, callback) {
      if (!origin) {
        logger.debug('CORS allowing request without origin header');
        callback(null, true);
        return;
      }

      if (env.NODE_ENV === 'production') {
        const allowed = productionOrigins.includes(origin);
        if (!allowed) {
          logger.warn(
            {
              origin,
              allowedOrigins: productionOrigins,
            },
            'CORS blocked production origin',
          );
        }
        callback(null, allowed);
        return;
      }

      if (origin === env.FRONTEND_ORIGIN || isAllowedDevOrigin(origin)) {
        callback(null, true);
        return;
      }

      logger.warn(
        {
          origin,
          frontendOrigin: env.FRONTEND_ORIGIN,
        },
        'CORS blocked development origin',
      );
      callback(new Error(`CORS blocked for origin: ${origin}`));
    },
    credentials: true,
  }),
);
app.use(express.json({ limit: '1mb' }));
app.use(generalLimiter);

app.get('/health', (_req, res) => {
  if (isDBConnected()) {
    return res.json({ status: 'ok', db: 'connected' });
  }

  return res.status(503).json({ status: 'starting', db: 'disconnected' });
});

app.get('/debug/cors', (req, res) => {
  if (env.NODE_ENV === 'production' && req.headers['x-api-key'] !== env.SYSTEM_API_KEY) {
    return res.status(404).json({ error: 'Not found' });
  }

  const requestOrigin = typeof req.headers.origin === 'string' ? req.headers.origin : '';
  return res.json({
    nodeEnv: env.NODE_ENV,
    requestOrigin: requestOrigin || null,
    frontendOrigin: env.FRONTEND_ORIGIN,
    frontendOriginsRaw: env.FRONTEND_ORIGINS || null,
    allowedOrigins: productionOrigins,
    wouldAllowOrigin: requestOrigin ? productionOrigins.includes(requestOrigin) : true,
  });
});
app.use('/api', apiRouter);
app.use(errorHandler);

if (process.env.VITEST !== 'true') {
  app.listen(env.PORT, () => {
    logger.info({ port: env.PORT }, 'DUS API running');
  });

  connectDB().catch((error) => {
    logger.error({ error }, 'MongoDB failed to connect during startup');
  });
}

export default app;
