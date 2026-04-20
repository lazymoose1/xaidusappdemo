import { env } from './config/env';
import { connectDB } from './lib/mongoose';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import crypto from 'crypto';
import { generalLimiter } from './middleware/rate-limiter';
import { errorHandler } from './middleware/error-handler';
import { apiRouter } from './routes';
import { logger } from './lib/logger';

const app = express();

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
    origin:
      env.NODE_ENV === 'production'
        ? env.FRONTEND_ORIGIN
        : [env.FRONTEND_ORIGIN, 'http://localhost:5173', 'http://localhost:3000', 'http://localhost:8080'],
    credentials: true,
  }),
);
app.use(express.json({ limit: '1mb' }));
app.use(generalLimiter);

app.get('/health', (_req, res) => res.json({ status: 'ok' }));
app.use('/api', apiRouter);
app.use(errorHandler);

if (process.env.VITEST !== 'true') {
  connectDB().then(() => {
    app.listen(env.PORT, () => {
      logger.info({ port: env.PORT }, 'DUS API running');
    });
  });
}

export default app;
