import { Request, Response, NextFunction } from 'express';
import redis from '../lib/redis';

/**
 * Reads chaos flags from Redis and applies failure injection:
 * - chaos:latency  → adds artificial delay (ms value stored in Redis)
 * - chaos:error_rate → randomly returns 500 at the stored probability (0–1)
 *
 * Skipped for /api/chaos, /api/health, and /metrics endpoints
 * so operators can still control the experiment while it runs.
 */
export async function chaosMiddleware(req: Request, res: Response, next: NextFunction): Promise<void> {
  const skip = req.path.startsWith('/api/chaos') ||
               req.path.startsWith('/api/health') ||
               req.path === '/metrics';

  if (skip) { next(); return; }

  try {
    const [latency, errorRate] = await Promise.all([
      redis.get('chaos:latency'),
      redis.get('chaos:error_rate'),
    ]);

    // Inject random errors first
    if (errorRate) {
      const rate = parseFloat(errorRate);
      if (Math.random() < rate) {
        res.status(500).json({ error: 'Chaos: simulated service error', chaos: true });
        return;
      }
    }

    // Inject latency
    if (latency) {
      const ms = parseInt(latency, 10);
      await new Promise((r) => setTimeout(r, ms));
    }
  } catch {
    // Never let chaos middleware break real requests
  }

  next();
}
