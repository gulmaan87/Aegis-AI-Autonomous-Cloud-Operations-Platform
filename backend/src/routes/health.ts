import { Router } from 'express';
import db from '../lib/db';
import redis from '../lib/redis';

const router = Router();

// Liveness — is the process alive?
router.get('/', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Readiness — can we serve traffic? (DB + Redis reachable)
router.get('/ready', async (_req, res) => {
  const checks: Record<string, string> = {};

  try {
    await db.$queryRaw`SELECT 1`;
    checks.database = 'ok';
  } catch {
    checks.database = 'error';
  }

  try {
    await redis.ping();
    checks.redis = 'ok';
  } catch {
    checks.redis = 'error';
  }

  const healthy = Object.values(checks).every((v) => v === 'ok');
  res.status(healthy ? 200 : 503).json({ status: healthy ? 'ready' : 'degraded', checks });
});

export default router;
