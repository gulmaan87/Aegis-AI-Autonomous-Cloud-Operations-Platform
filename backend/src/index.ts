import express from 'express';
import cors from 'cors';
import { collectDefaultMetrics, register, Gauge, Counter } from 'prom-client';
import authRouter from './routes/auth';
import healthRouter from './routes/health';
import chaosRouter from './routes/chaos';
import incidentsRouter from './routes/incidents';
import alertsRouter from './routes/alerts';
import chatRouter from './routes/chat';
import { chaosMiddleware } from './middleware/chaos';

collectDefaultMetrics();

// ── Custom Prometheus metrics (exported so routes can use them) ──────────────
export const chaosExperimentsActive = new Gauge({
  name: 'chaos_experiments_active',
  help: 'Number of currently running chaos experiments',
});

export const chaosExperimentsTotal = new Counter({
  name: 'chaos_experiments_total',
  help: 'Total chaos experiments run',
  labelNames: ['type', 'status'],
});

export const incidentsTotal = new Counter({
  name: 'incidents_total',
  help: 'Total incidents created',
  labelNames: ['severity'],
});
// ────────────────────────────────────────────────────────────────────────────

const app = express();
const PORT = process.env.PORT ?? 8000;

app.use(cors({ origin: process.env.FRONTEND_URL ?? 'http://localhost:3000' }));
app.use(express.json());

// Chaos injection — must be before routes
app.use(chaosMiddleware);

// Routes
app.use('/api/auth', authRouter);
app.use('/api/health', healthRouter);
app.use('/api/chaos', chaosRouter);
app.use('/api/incidents', incidentsRouter);
app.use('/api/alerts', alertsRouter);  // Alertmanager webhook — no user auth
app.use('/api/chat', chatRouter);


// Prometheus metrics
app.get('/metrics', async (_req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

app.use((_req, res) => res.status(404).json({ error: 'Not found' }));

app.listen(PORT, () => {
  console.log(`[aegis-backend] listening on http://localhost:${PORT}`);
});

export default app;
