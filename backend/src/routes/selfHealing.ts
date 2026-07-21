import { Router, Request, Response } from 'express';
import { z } from 'zod';
import db from '../lib/db';
import { requireAuth, requireRole } from '../middleware/auth';

const router = Router();

// Protect all self-healing management routes
router.use(requireAuth);

const UpdatePolicySchema = z.object({
  isEnabled: z.boolean().optional(),
  cooldownSec: z.number().int().min(10).max(3600).optional(),
});

// ── GET /api/self-healing/policies ───────────────────────────────────────────
router.get('/policies', async (_req: Request, res: Response): Promise<void> => {
  try {
    const policies = await db.selfHealingPolicy.findMany({
      orderBy: { alertName: 'asc' },
    });
    res.json(policies);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to retrieve policies', detail: err.message });
  }
});

// ── PATCH /api/self-healing/policies/:id ──────────────────────────────────────
router.patch(
  '/policies/:id',
  requireRole('OPERATOR', 'ADMIN'),
  async (req: Request, res: Response): Promise<void> => {
    const parsed = UpdatePolicySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten().fieldErrors });
      return;
    }

    try {
      const policy = await db.selfHealingPolicy.update({
        where: { id: req.params.id },
        data: parsed.data,
      });
      res.json(policy);
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to update policy', detail: err.message });
    }
  }
);

// ── GET /api/self-healing/runs ────────────────────────────────────────────────
router.get('/runs', async (_req: Request, res: Response): Promise<void> => {
  try {
    const runs = await db.selfHealingRun.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        policy: true,
        incident: { select: { id: true, title: true, status: true, severity: true } },
      },
      take: 50,
    });
    res.json(runs);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to retrieve runs', detail: err.message });
  }
});

export default router;
