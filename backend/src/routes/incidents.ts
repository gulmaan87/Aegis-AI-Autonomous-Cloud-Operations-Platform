import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { IncidentStatus, Severity } from '@prisma/client';
import db from '../lib/db';
import { requireAuth, requireRole } from '../middleware/auth';

const router = Router();

router.use(requireAuth);

const UpdateSchema = z.object({
  status: z.nativeEnum(IncidentStatus).optional(),
  notes: z.string().max(2000).optional(),
}).refine((d) => d.status !== undefined || d.notes !== undefined, {
  message: 'At least one of status or notes must be provided',
});

// ── GET /api/incidents ────────────────────────────────────────────────────────
router.get('/', async (req: Request, res: Response): Promise<void> => {
  const { status, severity } = req.query;

  const incidents = await db.incident.findMany({
    where: {
      ...(status   ? { status:   status   as IncidentStatus } : {}),
      ...(severity ? { severity: severity as Severity       } : {}),
    },
    orderBy: { createdAt: 'desc' },
    include: {
      experiment: {
        select: { id: true, name: true, type: true, status: true },
      },
    },
    take: 100,
  });
  res.json(incidents);
});

// ── GET /api/incidents/:id ────────────────────────────────────────────────────
router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  const incident = await db.incident.findUnique({
    where: { id: req.params.id },
    include: { experiment: true },
  });
  if (!incident) {
    res.status(404).json({ error: 'Incident not found' });
    return;
  }
  res.json(incident);
});

// ── PATCH /api/incidents/:id ──────────────────────────────────────────────────
// Accepts { status?, notes? } — at least one field required.
// OPERATOR / ADMIN only.
router.patch(
  '/:id',
  requireRole('OPERATOR', 'ADMIN'),
  async (req: Request, res: Response): Promise<void> => {
    const parsed = UpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten().fieldErrors });
      return;
    }

    const { status, notes } = parsed.data;

    const incident = await db.incident.update({
      where: { id: req.params.id },
      data: {
        ...(status !== undefined ? { status } : {}),
        ...(status === 'RESOLVED' ? { resolvedAt: new Date() } : {}),
        ...(notes !== undefined ? { notes } : {}),
      },
    });
    res.json(incident);
  },
);

export default router;
