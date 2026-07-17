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

// ── GET /api/health/services ──────────────────────────────────────────────────
// Returns structured health status for every service in the stack.
// Used by the Infrastructure Map (Level 5).
router.get('/services', async (_req, res) => {
  // Check backend's own dependencies
  let dbStatus: 'healthy' | 'degraded' | 'down' = 'healthy';
  let redisStatus: 'healthy' | 'degraded' | 'down' = 'healthy';

  try {
    await db.$queryRaw`SELECT 1`;
  } catch {
    dbStatus = 'down';
  }

  try {
    await redis.ping();
  } catch {
    redisStatus = 'down';
  }

  // Count open incidents (any open = degraded signal for backend)
  let openIncidents = 0;
  try {
    openIncidents = await db.incident.count({ where: { status: 'OPEN' } });
  } catch { /* ignore */ }

  // Check if chaos is active (redis flag)
  let chaosActive = false;
  try {
    const flags = ['chaos:latency', 'chaos:error_rate', 'chaos:db_slowdown', 'chaos:memory_pressure'];
    const values = await redis.mget(...flags);
    chaosActive = values.some((v) => v !== null);
  } catch { /* ignore */ }

  const backendStatus = chaosActive ? 'degraded' : openIncidents > 0 ? 'degraded' : 'healthy';

  res.json({
    services: [
      { id: 'frontend',     label: 'Frontend',     port: 3000, status: 'healthy',   group: 'app',        url: 'http://localhost:3000' },
      { id: 'backend',      label: 'Backend API',  port: 8000, status: backendStatus, group: 'app',      url: 'http://localhost:8000' },
      { id: 'postgres',     label: 'PostgreSQL',   port: 5432, status: dbStatus,    group: 'data',       url: null },
      { id: 'redis',        label: 'Redis',        port: 6379, status: redisStatus, group: 'data',       url: null },
      { id: 'prometheus',   label: 'Prometheus',   port: 9090, status: 'healthy',   group: 'monitoring', url: 'http://localhost:9090' },
      { id: 'alertmanager', label: 'Alertmanager', port: 9093, status: 'healthy',   group: 'monitoring', url: 'http://localhost:9093' },
      { id: 'grafana',      label: 'Grafana',      port: 3001, status: 'healthy',   group: 'monitoring', url: 'http://localhost:3001' },
    ],
    chaosActive,
    openIncidents,
  });
});

export default router;

