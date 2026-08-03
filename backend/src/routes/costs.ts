import { Router, Request, Response } from 'express';
import db from '../lib/db';
import { requireAuth, requireRole } from '../middleware/auth';
import { generateOptimizationReport, computeResourceCosts } from '../lib/costAnalyzer';

const router = Router();

router.use(requireAuth);

// ── GET /api/costs/resources ──────────────────────────────────────────────────
// Returns the latest resource cost records per service.
router.get('/resources', async (_req: Request, res: Response): Promise<void> => {
  let records = await db.resourceCostRecord.findMany({
    orderBy: { timestamp: 'desc' },
    take: 5,
  });

  if (records.length === 0) {
    records = await computeResourceCosts();
  }

  res.json(records);
});

// ── GET /api/costs/reports ─────────────────────────────────────────────────────
// Returns past cost optimization reports.
router.get('/reports', async (_req: Request, res: Response): Promise<void> => {
  let reports = await db.costOptimizationReport.findMany({
    orderBy: { createdAt: 'desc' },
    take: 10,
  });

  if (reports.length === 0) {
    const { report } = await generateOptimizationReport();
    reports = [report];
  }

  res.json(reports);
});

// ── POST /api/costs/analyze ────────────────────────────────────────────────────
// Triggers an on-demand cost analysis scan and generates an AI FinOps report.
router.post(
  '/analyze',
  requireRole('OPERATOR', 'ADMIN'),
  async (_req: Request, res: Response): Promise<void> => {
    try {
      const result = await generateOptimizationReport();
      res.json({
        message: 'Cost optimization scan completed successfully',
        report: result.report,
        latestRecords: result.latestRecords,
        recommendations: result.recommendations,
      });
    } catch (err) {
      res.status(500).json({ error: 'Cost analysis failed', detail: String(err) });
    }
  },
);

export default router;
