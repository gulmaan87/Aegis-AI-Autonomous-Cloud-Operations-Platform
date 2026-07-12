import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { ExperimentType, ExperimentStatus, Severity } from '@prisma/client';
import db from '../lib/db';
import redis from '../lib/redis';
import { requireAuth, requireRole, AuthRequest } from '../middleware/auth';
import { chaosExperimentsActive } from '../index';

const router = Router();

// All chaos routes require auth
router.use(requireAuth);

const CreateSchema = z.object({
  name: z.string().min(3),
  type: z.nativeEnum(ExperimentType),
  durationMs: z.number().int().min(5000).max(300_000), // 5s – 5min
});

// Severity mapping per experiment type
const SEVERITY_MAP: Record<ExperimentType, Severity> = {
  HIGH_CPU:          'HIGH',
  HIGH_LATENCY:      'MEDIUM',
  SERVICE_ERROR:     'HIGH',
  DB_SLOWDOWN:       'CRITICAL',
  MEMORY_PRESSURE:   'MEDIUM',
};

// Active experiment timers (in-memory — good enough for single-instance demo)
const activeTimers = new Map<string, ReturnType<typeof setTimeout>>();

async function stopExperiment(id: string) {
  const timer = activeTimers.get(id);
  if (timer) {
    clearTimeout(timer);
    activeTimers.delete(id);
  }

  // Clear chaos flags in Redis
  await redis.del('chaos:latency', 'chaos:error_rate', 'chaos:db_slowdown');

  await db.chaosExperiment.update({
    where: { id },
    data: { status: 'COMPLETED', endedAt: new Date() },
  });

  chaosExperimentsActive.dec();
}

async function startExperimentSideEffects(experiment: { id: string; type: ExperimentType; durationMs: number }) {
  // Set Redis flags that middleware reads
  if (experiment.type === 'HIGH_LATENCY') {
    await redis.set('chaos:latency', '800', 'EX', Math.ceil(experiment.durationMs / 1000) + 5);
  }
  if (experiment.type === 'SERVICE_ERROR') {
    await redis.set('chaos:error_rate', '0.4', 'EX', Math.ceil(experiment.durationMs / 1000) + 5);
  }
  if (experiment.type === 'DB_SLOWDOWN') {
    await redis.set('chaos:db_slowdown', '1', 'EX', Math.ceil(experiment.durationMs / 1000) + 5);
  }
  if (experiment.type === 'HIGH_CPU') {
    // Spin CPU for durationMs in a non-blocking way
    const end = Date.now() + Math.min(experiment.durationMs, 10_000);
    setImmediate(function spin() {
      if (Date.now() < end) setImmediate(spin);
    });
  }

  // Auto-stop after duration
  const timer = setTimeout(() => stopExperiment(experiment.id), experiment.durationMs);
  activeTimers.set(experiment.id, timer);
}

// GET /api/chaos/experiments
router.get('/experiments', async (_req, res: Response): Promise<void> => {
  const experiments = await db.chaosExperiment.findMany({
    orderBy: { createdAt: 'desc' },
    include: { incident: { select: { id: true, status: true, severity: true } } },
    take: 50,
  });
  res.json(experiments);
});

// POST /api/chaos/experiments
router.post(
  '/experiments',
  requireRole('OPERATOR', 'ADMIN'),
  async (req: AuthRequest, res: Response): Promise<void> => {
    const parsed = CreateSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten().fieldErrors });
      return;
    }
    const { name, type, durationMs } = parsed.data;
    const userId = req.user!.sub;

    // Check no experiment already running
    const running = await db.chaosExperiment.findFirst({ where: { status: 'RUNNING' } });
    if (running) {
      res.status(409).json({ error: 'An experiment is already running. Stop it first.' });
      return;
    }

    const experiment = await db.chaosExperiment.create({
      data: {
        name,
        type,
        durationMs,
        status: 'RUNNING',
        startedAt: new Date(),
        createdBy: userId,
        incident: {
          create: {
            title: `[Chaos] ${name}`,
            severity: SEVERITY_MAP[type],
            status: 'OPEN',
          },
        },
      },
      include: { incident: true },
    });

    chaosExperimentsActive.inc();
    await startExperimentSideEffects(experiment);

    res.status(201).json(experiment);
  },
);

// GET /api/chaos/experiments/:id
router.get('/experiments/:id', async (req: Request, res: Response): Promise<void> => {
  const experiment = await db.chaosExperiment.findUnique({
    where: { id: req.params.id },
    include: { incident: true },
  });
  if (!experiment) {
    res.status(404).json({ error: 'Experiment not found' });
    return;
  }
  res.json(experiment);
});

// POST /api/chaos/experiments/:id/stop
router.post(
  '/experiments/:id/stop',
  requireRole('OPERATOR', 'ADMIN'),
  async (req: Request, res: Response): Promise<void> => {
    const experiment = await db.chaosExperiment.findUnique({ where: { id: req.params.id } });
    if (!experiment) {
      res.status(404).json({ error: 'Experiment not found' });
      return;
    }
    if (experiment.status !== 'RUNNING') {
      res.status(400).json({ error: 'Experiment is not running' });
      return;
    }
    await stopExperiment(experiment.id);
    res.json({ message: 'Experiment stopped' });
  },
);

export default router;
