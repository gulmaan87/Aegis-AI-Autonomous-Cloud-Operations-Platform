import { Request, Response, NextFunction } from 'express';
import redis from '../lib/redis';

/**
 * Reads chaos flags from Redis and applies failure injection to all
 * non-protected routes. Protected routes (chaos control, health, metrics)
 * are skipped so operators can still manage experiments while they run.
 *
 * Flags (all stored as numeric strings):
 *   chaos:latency         → ms of artificial delay added to every response
 *   chaos:error_rate      → probability 0–1 of returning a 500 error
 *   chaos:db_slowdown     → ms of delay simulating slow DB queries
 *   chaos:memory_pressure → ms of extra delay simulating GC / memory pressure
 */
export async function chaosMiddleware(req: Request, res: Response, next: NextFunction): Promise<void> {
  const skip =
    req.path.startsWith('/api/chaos') ||
    req.path.startsWith('/api/health') ||
    req.path.startsWith('/api/auth') ||
    req.path.startsWith('/api/alerts') ||
    req.path === '/metrics';

  if (skip) { next(); return; }

  try {
    const [latency, errorRate, dbSlowdown, memPressure] = await Promise.all([
      redis.get('chaos:latency'),
      redis.get('chaos:error_rate'),
      redis.get('chaos:db_slowdown'),
      redis.get('chaos:memory_pressure'),
    ]);

    // 1. Inject random errors first (short-circuit remaining middleware)
    if (errorRate) {
      const rate = parseFloat(errorRate);
      if (Math.random() < rate) {
        res.status(500).json({ error: 'Chaos: simulated service error', chaos: true });
        return;
      }
    }

    // 2. Inject DB slowdown (simulates sluggish query execution)
    if (dbSlowdown) {
      const ms = parseInt(dbSlowdown, 10);
      await new Promise((r) => setTimeout(r, ms));
    }

    // 3. Inject memory pressure (simulates GC pauses / heap pressure)
    if (memPressure) {
      const ms = parseInt(memPressure, 10);
      // Add randomness ±25% to mimic real GC jitter
      const jitter = ms * 0.25 * (Math.random() * 2 - 1);
      await new Promise((r) => setTimeout(r, Math.max(0, ms + jitter)));
    }

    // 4. Inject network latency last (cumulative with above)
    if (latency) {
      const ms = parseInt(latency, 10);
      await new Promise((r) => setTimeout(r, ms));
    }
  } catch {
    // Never let chaos middleware break real requests
  }

  next();
}
