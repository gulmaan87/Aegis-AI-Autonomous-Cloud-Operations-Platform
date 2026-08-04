import { Router, Request, Response } from 'express';
import db from '../lib/db';
import { requireAuth, requireRole } from '../middleware/auth';
import { generateSecurityReport, runSecurityAuditScan } from '../lib/securityAuditor';

const router = Router();

router.use(requireAuth);

// ── GET /api/security/scans ──────────────────────────────────────────────────
// Returns the latest vulnerability and CIS benchmark scan records per target.
router.get('/scans', async (_req: Request, res: Response): Promise<void> => {
  let records = await db.securityScanRecord.findMany({
    orderBy: { createdAt: 'desc' },
    take: 5,
  });

  if (records.length === 0) {
    records = await runSecurityAuditScan();
  }

  res.json(records);
});

// ── GET /api/security/reports ────────────────────────────────────────────────
// Returns past security audit reports.
router.get('/reports', async (_req: Request, res: Response): Promise<void> => {
  let reports = await db.securityAuditReport.findMany({
    orderBy: { createdAt: 'desc' },
    take: 10,
  });

  if (reports.length === 0) {
    const { report } = await generateSecurityReport();
    reports = [report];
  }

  res.json(reports);
});

// ── POST /api/security/scan ──────────────────────────────────────────────────
// Triggers an on-demand container vulnerability & CIS benchmark audit scan.
router.post(
  '/scan',
  requireRole('OPERATOR', 'ADMIN'),
  async (_req: Request, res: Response): Promise<void> => {
    try {
      const result = await generateSecurityReport();
      res.json({
        message: 'Security & compliance audit scan completed',
        report: result.report,
        latestRecords: result.latestRecords,
      });
    } catch (err) {
      res.status(500).json({ error: 'Security scan failed', detail: String(err) });
    }
  },
);

export default router;
