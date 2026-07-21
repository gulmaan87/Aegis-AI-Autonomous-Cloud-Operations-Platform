import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { ExperimentType, ExperimentStatus, Severity } from '@prisma/client';
import db from '../lib/db';
import redis from '../lib/redis';
import { requireAuth, requireRole, AuthRequest } from '../middleware/auth';
import { chaosExperimentsActive, chaosExperimentsTotal } from '../index';

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
  HIGH_CPU:         'HIGH',
  HIGH_LATENCY:     'MEDIUM',
  SERVICE_ERROR:    'HIGH',
  DB_SLOWDOWN:      'CRITICAL',
  MEMORY_PRESSURE:  'MEDIUM',
};

// Redis keys managed by chaos experiments
const CHAOS_REDIS_KEYS = ['chaos:latency', 'chaos:error_rate', 'chaos:db_slowdown', 'chaos:memory_pressure'] as const;

// Active experiment timers (in-memory — good enough for single-instance demo)
export const activeTimers = new Map<string, ReturnType<typeof setTimeout>>();

export async function stopExperiment(id: string, reason: 'COMPLETED' | 'STOPPED' = 'COMPLETED', stoppedBy?: string) {
  const timer = activeTimers.get(id);
  if (timer) {
    clearTimeout(timer);
    activeTimers.delete(id);
  }

  // Clear all chaos flags in Redis
  await redis.del(...CHAOS_REDIS_KEYS);

  const finalStatus: ExperimentStatus = reason === 'STOPPED' ? 'STOPPED' : 'COMPLETED';

  await db.chaosExperiment.update({
    where: { id },
    data: {
      status: finalStatus,
      endedAt: new Date(),
      ...(stoppedBy ? { stoppedBy } : {}),
    },
  });

  chaosExperimentsActive.dec();
  chaosExperimentsTotal.inc({ type: 'unknown', status: finalStatus });
}

async function startExperimentSideEffects(experiment: { id: string; type: ExperimentType; durationMs: number }) {
  const ttl = Math.ceil(experiment.durationMs / 1000) + 5; // +5s buffer

  if (experiment.type === 'HIGH_LATENCY') {
    await redis.set('chaos:latency', '800', 'EX', ttl);
  }
  if (experiment.type === 'SERVICE_ERROR') {
    await redis.set('chaos:error_rate', '0.4', 'EX', ttl);
  }
  if (experiment.type === 'DB_SLOWDOWN') {
    await redis.set('chaos:db_slowdown', '600', 'EX', ttl); // 600ms DB delay
  }
  if (experiment.type === 'MEMORY_PRESSURE') {
    await redis.set('chaos:memory_pressure', '400', 'EX', ttl); // 400ms extra delay simulating GC pressure
  }
  if (experiment.type === 'HIGH_CPU') {
    // Spin CPU for up to 10s in a non-blocking way (capped to avoid total lockup)
    const end = Date.now() + Math.min(experiment.durationMs, 10_000);
    setImmediate(function spin() {
      if (Date.now() < end) setImmediate(spin);
    });
  }

  // Auto-stop after duration
  const timer = setTimeout(() => stopExperiment(experiment.id, 'COMPLETED'), experiment.durationMs);
  activeTimers.set(experiment.id, timer);

  // Increment counter with type label
  chaosExperimentsTotal.inc({ type: experiment.type, status: 'STARTED' });
}

// ── GET /api/chaos/status ─────────────────────────────────────────────────────
// Returns the currently active experiment plus which Redis chaos flags are set.
// Used by the Dashboard live-status widget.
router.get('/status', async (_req, res: Response): Promise<void> => {
  const [active, flags] = await Promise.all([
    db.chaosExperiment.findFirst({
      where: { status: 'RUNNING' },
      include: { incident: { select: { id: true, status: true } } },
    }),
    Promise.all(CHAOS_REDIS_KEYS.map((k) => redis.get(k).then((v) => [k, v] as const))),
  ]);

  const activeFlags = Object.fromEntries(flags.filter(([, v]) => v !== null));

  res.json({ active: active ?? null, activeFlags });
});

// ── GET /api/chaos/experiments ────────────────────────────────────────────────
router.get('/experiments', async (_req, res: Response): Promise<void> => {
  const experiments = await db.chaosExperiment.findMany({
    orderBy: { createdAt: 'desc' },
    include: { incident: { select: { id: true, status: true, severity: true } } },
    take: 50,
  });
  res.json(experiments);
});

// ── POST /api/chaos/experiments ───────────────────────────────────────────────
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

    // Enforce single-experiment-at-a-time
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

// ── GET /api/chaos/experiments/:id ───────────────────────────────────────────
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

// ── POST /api/chaos/experiments/:id/stop ─────────────────────────────────────
router.post(
  '/experiments/:id/stop',
  requireRole('OPERATOR', 'ADMIN'),
  async (req: AuthRequest, res: Response): Promise<void> => {
    const experiment = await db.chaosExperiment.findUnique({ where: { id: req.params.id } });
    if (!experiment) {
      res.status(404).json({ error: 'Experiment not found' });
      return;
    }
    if (experiment.status !== 'RUNNING') {
      res.status(400).json({ error: 'Experiment is not running' });
      return;
    }
    const userId = req.user!.sub;
    await stopExperiment(experiment.id, 'STOPPED', userId);
    res.json({ message: 'Experiment stopped' });
  },
);

export default router;
