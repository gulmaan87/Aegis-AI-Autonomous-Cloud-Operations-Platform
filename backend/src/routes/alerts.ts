import { Router, Request, Response } from 'express';
import { Severity } from '@prisma/client';
import db from '../lib/db';
import { incidentsTotal } from '../index';
import { triggerSelfHealing } from '../lib/selfHealing';

const router = Router();

// ── Alertmanager webhook payload types ───────────────────────────────────────
interface AlertmanagerAlert {
  status: 'firing' | 'resolved';
  labels: Record<string, string>;
  annotations: Record<string, string>;
  fingerprint: string;
  startsAt: string;
  endsAt: string;
}

interface AlertmanagerPayload {
  version: string;
  groupKey: string;
  status: 'firing' | 'resolved';
  receiver: string;
  alerts: AlertmanagerAlert[];
}
// ─────────────────────────────────────────────────────────────────────────────

/** Map Alertmanager severity labels → Prisma Severity enum */
function mapSeverity(label: string | undefined): Severity {
  switch (label?.toLowerCase()) {
    case 'critical': return 'CRITICAL';
    case 'high':     return 'HIGH';
    case 'low':      return 'LOW';
    default:         return 'MEDIUM';
  }
}

/**
 * POST /api/alerts/webhook
 *
 * Called by Alertmanager (no user auth — secured by Bearer token from env).
 * For each alert in the payload:
 *   - firing  → create an OPEN incident (idempotent via fingerprint)
 *   - resolved → resolve the matching OPEN incident
 *
 * Skipped for alerts without a fingerprint (shouldn't happen in practice).
 */
router.post('/webhook', async (req: Request, res: Response): Promise<void> => {
  // ── Token verification ────────────────────────────────────────────────────
  const secret = process.env.ALERT_WEBHOOK_SECRET;
  if (secret) {
    const authHeader = req.headers.authorization ?? '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
    if (token !== secret) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
  }

  const payload = req.body as AlertmanagerPayload;

  if (!Array.isArray(payload?.alerts)) {
    res.status(400).json({ error: 'Invalid payload: missing alerts array' });
    return;
  }

  const results: Array<{ fingerprint: string; action: string }> = [];

  for (const alert of payload.alerts) {
    const { fingerprint, labels, annotations, status } = alert;

    if (!fingerprint) continue;

    const alertName = labels.alertname ?? 'UnknownAlert';
    const severity  = mapSeverity(labels.severity);
    const title     = annotations.summary
      ? `[Alert] ${annotations.summary}`
      : `[Alert] ${alertName}`;

    if (status === 'firing') {
      // Idempotent create — skip if an OPEN incident with this fingerprint exists
      const existing = await db.incident.findUnique({ where: { fingerprint } });

      if (existing) {
        // Already tracked — skip silently
        results.push({ fingerprint, action: 'skipped (duplicate)' });
        continue;
      }

      const incident = await db.incident.create({
        data: {
          title,
          severity,
          status: 'OPEN',
          alertName,
          fingerprint,
          source: 'ALERT',
        },
      });

      incidentsTotal.inc({ severity });
      results.push({ fingerprint, action: 'created' });

      // Run self-healing remediation asynchronously
      await triggerSelfHealing(alertName, incident.id);

    } else if (status === 'resolved') {
      // Resolve the matching incident if it's still OPEN or INVESTIGATING
      const incident = await db.incident.findUnique({ where: { fingerprint } });

      if (incident && incident.status !== 'RESOLVED') {
        await db.incident.update({
          where: { id: incident.id },
          data: { status: 'RESOLVED', resolvedAt: new Date() },
        });
        results.push({ fingerprint, action: 'resolved' });
      } else {
        results.push({ fingerprint, action: 'skipped (already resolved or not found)' });
      }
    }
  }

  res.json({ processed: results.length, results });
});

export default router;
