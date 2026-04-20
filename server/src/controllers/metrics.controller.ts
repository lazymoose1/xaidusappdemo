import { Request, Response, NextFunction } from 'express';
import * as socialService from '../services/social.service';

export async function getSocialAuthMetrics(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const metrics = await socialService.getSocialAuthMetrics();
    return res.json({
      ok: true,
      metrics,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    next(err);
  }
}

export async function getCacheStats(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const stats = await socialService.getCacheStats();
    return res.json({
      ok: true,
      stats,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    next(err);
  }
}

export async function healthCheck(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const [socialMetrics, cacheStats] = await Promise.all([
      socialService.getSocialAuthMetrics(),
      socialService.getCacheStats(),
    ]);

    const health: any = {
      status: 'healthy',
      socialAuth: {
        totalConnections: socialMetrics.totalConnections,
        expiredConnections: socialMetrics.expiredConnections,
        healthScore:
          socialMetrics.totalConnections > 0
            ? (
                ((socialMetrics.totalConnections -
                  socialMetrics.expiredConnections) /
                  socialMetrics.totalConnections) *
                100
              ).toFixed(1)
            : 0,
      },
      cache: {
        active: cacheStats.active,
        expired: cacheStats.expired,
        hitRate:
          cacheStats.active + cacheStats.expired > 0
            ? (
                (cacheStats.active / (cacheStats.active + cacheStats.expired)) *
                100
              ).toFixed(1)
            : 0,
      },
      timestamp: new Date().toISOString(),
    };

    if (
      socialMetrics.expiredConnections >
      socialMetrics.totalConnections * 0.3
    ) {
      health.status = 'degraded';
      health.warnings = ['High percentage of expired tokens'];
    }

    return res.json({ ok: true, ...health });
  } catch (err) {
    next(err);
  }
}
