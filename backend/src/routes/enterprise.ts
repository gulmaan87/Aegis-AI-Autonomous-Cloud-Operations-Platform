import { Router, Response } from 'express';
import db from '../lib/db';
import redis from '../lib/redis';
import { requireAuth, requireRole, AuthRequest } from '../middleware/auth';
import { logAuditAction } from '../lib/auditLogger';

const router = Router();

// Protect all enterprise routes
router.use(requireAuth);

// ── GET /api/enterprise/audit-logs ──────────────────────────────────────────
router.get('/audit-logs', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const logs = await db.auditLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    res.json(logs);
  } catch (err) {
    console.error('[enterprise/audit-logs]', err);
    res.status(500).json({ error: 'Failed to fetch audit logs' });
  }
});

// ── GET /api/enterprise/users — User RBAC Management ────────────────────────
router.get('/users', requireRole('ADMIN', 'OPERATOR'), async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const users = await db.user.findMany({
      select: { id: true, email: true, name: true, role: true, isActive: true, createdAt: true, updatedAt: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json(users);
  } catch (err) {
    console.error('[enterprise/users]', err);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// ── POST /api/enterprise/users/role — Update User Role ───────────────────────
router.post('/users/role', requireRole('ADMIN'), async (req: AuthRequest, res: Response): Promise<void> => {
  const { userId, role } = req.body as { userId: string; role: 'USER' | 'OPERATOR' | 'ADMIN' };
  if (!userId || !['USER', 'OPERATOR', 'ADMIN'].includes(role)) {
    res.status(400).json({ error: 'Valid userId and role are required' });
    return;
  }

  try {
    const updated = await db.user.update({
      where: { id: userId },
      data: { role },
      select: { id: true, email: true, role: true },
    });

    await logAuditAction({
      userId: req.user?.sub,
      userEmail: req.user?.email,
      action: 'USER_ROLE_PROMOTED',
      resourceTarget: updated.email,
      details: { newRole: role },
    });

    res.json(updated);
  } catch (err) {
    console.error('[enterprise/users/role]', err);
    res.status(500).json({ error: 'Failed to update user role' });
  }
});

// ── GET /api/enterprise/config ───────────────────────────────────────────────
router.get('/config', async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    let config = await db.systemConfig.findFirst();
    if (!config) {
      config = await db.systemConfig.create({
        data: {
          clusterName: 'Aegis-Prod-Cluster-01',
          environment: 'PRODUCTION',
          retentionDays: 90,
          slackWebhookUrl: 'https://hooks.slack.com/services/mock/aegis/alerts',
          pagerDutyIntegrationKey: 'pd_live_aegis_key_9981',
          autoRemediationEnabled: true,
          maxChaosDurationSec: 300,
        },
      });
    }
    res.json(config);
  } catch (err) {
    console.error('[enterprise/config GET]', err);
    res.status(500).json({ error: 'Failed to fetch platform config' });
  }
});

// ── PUT /api/enterprise/config ───────────────────────────────────────────────
router.put('/config', requireRole('ADMIN', 'OPERATOR'), async (req: AuthRequest, res: Response): Promise<void> => {
  const {
    clusterName,
    environment,
    retentionDays,
    slackWebhookUrl,
    pagerDutyIntegrationKey,
    autoRemediationEnabled,
    maxChaosDurationSec,
  } = req.body;

  try {
    const data = {
      clusterName: clusterName ?? 'Aegis-Prod-Cluster-01',
      environment: environment ?? 'PRODUCTION',
      retentionDays: Number(retentionDays ?? 90),
      slackWebhookUrl,
      pagerDutyIntegrationKey,
      autoRemediationEnabled: autoRemediationEnabled !== undefined ? Boolean(autoRemediationEnabled) : true,
      maxChaosDurationSec: Number(maxChaosDurationSec ?? 300),
      updatedBy: req.user?.email ?? 'admin',
    };

    const existing = await db.systemConfig.findFirst();
    const config = existing
      ? await db.systemConfig.update({ where: { id: existing.id }, data })
      : await db.systemConfig.create({ data });

    await logAuditAction({
      userId: req.user?.sub,
      userEmail: req.user?.email,
      action: 'SYSTEM_CONFIG_UPDATED',
      resourceTarget: config.clusterName,
      details: { environment: config.environment, autoRemediation: config.autoRemediationEnabled },
    });

    res.json(config);
  } catch (err) {
    console.error('[enterprise/config PUT]', err);
    res.status(500).json({ error: 'Failed to update platform config' });
  }
});

// ── GET /api/enterprise/diagnostics ─────────────────────────────────────────
router.get('/diagnostics', async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const dbStart = Date.now();
    await db.user.count();
    const dbLatencyMs = Date.now() - dbStart;

    let redisStatus = 'CONNECTED';
    let redisKeys = 0;
    try {
      redisKeys = (await redis.dbsize()) ?? 0;
    } catch {
      redisStatus = 'DISCONNECTED';
    }

    const mem = process.memoryUsage();
    const uptimeSec = Math.floor(process.uptime());

    res.json({
      status: 'HEALTHY',
      uptimeSec,
      database: {
        status: 'CONNECTED',
        pingMs: dbLatencyMs,
        provider: 'MongoDB',
      },
      redis: {
        status: redisStatus,
        keyCount: redisKeys,
      },
      process: {
        nodeVersion: process.version,
        memoryRssMb: Math.round(mem.rss / 1024 / 1024),
        heapUsedMb: Math.round(mem.heapUsed / 1024 / 1024),
        heapTotalMb: Math.round(mem.heapTotal / 1024 / 1024),
      },
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error('[enterprise/diagnostics]', err);
    res.status(500).json({ error: 'Failed to fetch diagnostics' });
  }
});

export default router;
