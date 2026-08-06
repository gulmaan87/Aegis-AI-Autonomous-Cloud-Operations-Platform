import { Router, Request, Response } from 'express';
import { z } from 'zod';
import db from '../lib/db';
import { requireAuth, requireRole, AuthRequest } from '../middleware/auth';
import {
  triggerDeployment,
  evaluateCanaryHealth,
  executeManualRollback,
} from '../lib/rollbackManager';

const router = Router();

router.use(requireAuth);

const CreateDeploymentSchema = z.object({
  service: z.string().min(2),
  version: z.string().min(2),
  gitCommit: z.string().optional(),
});

const RollbackSchema = z.object({
  reason: z.string().min(3),
});

// ── GET /api/deployments ───────────────────────────────────────────────────────
// Returns all deployment records with their health check logs.
router.get('/', async (_req: Request, res: Response): Promise<void> => {
  let deployments = await db.deploymentRecord.findMany({
    orderBy: { createdAt: 'desc' },
    include: { healthChecks: { orderBy: { timestamp: 'desc' }, take: 5 } },
    take: 20,
  });

  if (deployments.length === 0) {
    // Seed initial baseline deployment
    await triggerDeployment('backend-api', 'v2.4.0', 'c89a8e2', 'System Bootstrap');
    deployments = await db.deploymentRecord.findMany({
      orderBy: { createdAt: 'desc' },
      include: { healthChecks: { orderBy: { timestamp: 'desc' }, take: 5 } },
      take: 20,
    });
  }

  res.json(deployments);
});

// ── POST /api/deployments ──────────────────────────────────────────────────────
// Triggers a new deployment release for a service.
router.post(
  '/',
  requireRole('OPERATOR', 'ADMIN'),
  async (req: AuthRequest, res: Response): Promise<void> => {
    const parsed = CreateDeploymentSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten().fieldErrors });
      return;
    }

    const { service, version, gitCommit } = parsed.data;
    const deployedBy = req.user?.email ?? 'Operator';

    try {
      const deployment = await triggerDeployment(service, version, gitCommit, deployedBy);
      res.status(201).json(deployment);
    } catch (err) {
      res.status(500).json({ error: 'Deployment trigger failed', detail: String(err) });
    }
  },
);

// ── POST /api/deployments/:id/evaluate ─────────────────────────────────────────
// Evaluates canary health gates and triggers automated rollback if SLO thresholds fail.
router.post(
  '/:id/evaluate',
  requireRole('OPERATOR', 'ADMIN'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const result = await evaluateCanaryHealth(req.params.id);
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: 'Canary evaluation failed', detail: String(err) });
    }
  },
);

// ── POST /api/deployments/:id/rollback ─────────────────────────────────────────
// Triggers an immediate manual rollback to the previous stable version.
router.post(
  '/:id/rollback',
  requireRole('OPERATOR', 'ADMIN'),
  async (req: AuthRequest, res: Response): Promise<void> => {
    const parsed = RollbackSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten().fieldErrors });
      return;
    }

    const { reason } = parsed.data;
    const operator = req.user?.email ?? 'Operator';

    try {
      const updated = await executeManualRollback(req.params.id, reason, operator);
      res.json({ message: 'Manual rollback executed successfully', deployment: updated });
    } catch (err) {
      res.status(500).json({ error: 'Rollback execution failed', detail: String(err) });
    }
  },
);

export default router;
