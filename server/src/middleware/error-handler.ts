import { Request, Response, NextFunction } from 'express';
import { AppError } from '../lib/errors';
import { logger } from '../lib/logger';
import { env } from '../config/env';

export function errorHandler(err: Error, req: Request, res: Response, _next: NextFunction) {
  const requestId = req.id;

  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      error: err.message,
      code: err.code,
      ...(requestId && { requestId }),
    });
  }

  logger.error({ err, requestId }, 'Unhandled error');
  const body: Record<string, string> = { error: 'Internal server error' };
  if (requestId) body.requestId = requestId;
  if (env.NODE_ENV !== 'production' && err.stack) {
    body.stack = err.stack;
  }
  return res.status(500).json(body);
}
