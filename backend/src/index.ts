import express from 'express';
import cors from 'cors';
import { collectDefaultMetrics, register } from 'prom-client';
import authRouter from './routes/auth';
import healthRouter from './routes/health';

collectDefaultMetrics();

const app = express();
const PORT = process.env.PORT ?? 8000;

// Middleware
app.use(cors({ origin: process.env.FRONTEND_URL ?? 'http://localhost:3000' }));
app.use(express.json());

// Routes
app.use('/api/auth', authRouter);
app.use('/api/health', healthRouter);

// Prometheus metrics endpoint
app.get('/metrics', async (_req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

// 404 catch-all
app.use((_req, res) => res.status(404).json({ error: 'Not found' }));

app.listen(PORT, () => {
  console.log(`[aegis-backend] listening on http://localhost:${PORT}`);
});

export default app;
