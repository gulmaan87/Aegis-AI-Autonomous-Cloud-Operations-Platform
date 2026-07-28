import { Router, Request, Response } from 'express';
import db from '../lib/db';
import { requireAuth, requireRole } from '../middleware/auth';
import { runAnomalyDetectionScan } from '../lib/anomalyDetector';

const router = Router();

router.use(requireAuth);

// ── GET /api/predictions ───────────────────────────────────────────────────────
// Fetch current metric anomaly predictions from DB (triggers scan if empty).
router.get('/', async (_req: Request, res: Response): Promise<void> => {
  let predictions = await db.anomalyPrediction.findMany({
    orderBy: [{ status: 'desc' }, { updatedAt: 'desc' }],
  });

  if (predictions.length === 0) {
    await runAnomalyDetectionScan();
    predictions = await db.anomalyPrediction.findMany({
      orderBy: [{ status: 'desc' }, { updatedAt: 'desc' }],
    });
  }

  res.json(predictions);
});

// ── POST /api/predictions/scan ────────────────────────────────────────────────
// Triggers fresh time-series predictive scan across target services.
router.post(
  '/scan',
  requireRole('OPERATOR', 'ADMIN'),
  async (_req: Request, res: Response): Promise<void> => {
    try {
      const forecasts = await runAnomalyDetectionScan();
      const predictions = await db.anomalyPrediction.findMany({
        orderBy: [{ status: 'desc' }, { updatedAt: 'desc' }],
      });
      res.json({ message: 'Anomaly detection scan completed', forecasts, predictions });
    } catch (err) {
      res.status(500).json({ error: 'Anomaly scan failed', detail: String(err) });
    }
  },
);

export default router;
