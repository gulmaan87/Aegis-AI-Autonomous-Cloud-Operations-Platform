import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { IncidentStatus, Severity } from '@prisma/client';
import db from '../lib/db';
import { requireAuth, requireRole } from '../middleware/auth';
import { openaiClient, DEPLOYMENT, isAiConfigured } from '../lib/openai';
import { incidentsTotal } from '../index';

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
      experiment: { select: { id: true, name: true, type: true, status: true } },
      aiAnalysis:  true,
      postmortem:  true,
    },
    take: 100,
  });
  res.json(incidents);
});

// ── GET /api/incidents/:id ────────────────────────────────────────────────────
router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  const incident = await db.incident.findUnique({
    where: { id: req.params.id },
    include: { experiment: true, aiAnalysis: true, postmortem: true },
  });
  if (!incident) {
    res.status(404).json({ error: 'Incident not found' });
    return;
  }
  res.json(incident);
});

// ── PATCH /api/incidents/:id ──────────────────────────────────────────────────
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
        ...(notes  !== undefined ? { notes  } : {}),
      },
    });
    res.json(incident);
  },
);

// ── POST /api/incidents/:id/analyze ──────────────────────────────────────────
// Runs AI root cause analysis on the incident using Azure OpenAI.
// Returns cached result unless force=true is passed.
// OPERATOR / ADMIN only.
router.post(
  '/:id/analyze',
  requireRole('OPERATOR', 'ADMIN'),
  async (req: Request, res: Response): Promise<void> => {
    const force = req.query.force === 'true';

    const incident = await db.incident.findUnique({
      where: { id: req.params.id },
      include: { experiment: true, aiAnalysis: true },
    });
    if (!incident) {
      res.status(404).json({ error: 'Incident not found' });
      return;
    }

    // Return cached analysis unless force refresh requested
    if (incident.aiAnalysis && !force) {
      res.json(incident.aiAnalysis);
      return;
    }

    // ── Build context for the AI ────────────────────────────────────────────
    const experimentContext = incident.experiment
      ? `Linked chaos experiment: ${incident.experiment.name} (type: ${incident.experiment.type}, status: ${incident.experiment.status})`
      : 'No linked chaos experiment — alert-triggered incident';

    const systemPrompt = `You are Aegis AI — an expert SRE incident commander.
Analyze the incident and respond ONLY with a valid JSON object in this exact shape:
{
  "rootCause": "string — one paragraph explaining the most likely root cause",
  "impact": "string — one paragraph describing services/users affected",
  "remediationSteps": ["step 1", "step 2", "step 3"],
  "riskScore": "LOW" | "MEDIUM" | "HIGH" | "CRITICAL",
  "confidence": number (0-100)
}
Do not include any text outside the JSON.`;

    const userPrompt = `Incident: ${incident.title}
Severity: ${incident.severity}
Status: ${incident.status}
Source: ${incident.source}
Alert name: ${incident.alertName ?? 'N/A'}
${experimentContext}
Operator notes: ${incident.notes ?? 'None'}
Created: ${incident.createdAt.toISOString()}
${incident.resolvedAt ? `Resolved: ${incident.resolvedAt.toISOString()}` : ''}`;

    // ── Call Azure OpenAI or use mock ───────────────────────────────────────
    let rootCause: string;
    let impact: string;
    let remediationSteps: string[];
    let riskScore: Severity;
    let confidence: number;
    let modelUsed: string;

    if (isAiConfigured && openaiClient) {
      try {
        const completion = await openaiClient.chat.completions.create({
          model: DEPLOYMENT,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user',   content: userPrompt   },
          ],
          temperature: 0.3,
          max_tokens: 600,
          response_format: { type: 'json_object' },
        });

        const raw = completion.choices[0]?.message?.content ?? '{}';
        const parsed = JSON.parse(raw);

        rootCause        = parsed.rootCause        ?? 'Unable to determine root cause.';
        impact           = parsed.impact           ?? 'Impact assessment unavailable.';
        remediationSteps = Array.isArray(parsed.remediationSteps) ? parsed.remediationSteps : [];
        riskScore        = (['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].includes(parsed.riskScore)
                             ? parsed.riskScore : incident.severity) as Severity;
        confidence       = typeof parsed.confidence === 'number' ? Math.min(100, Math.max(0, parsed.confidence)) : 70;
        modelUsed        = DEPLOYMENT;
      } catch (err) {
        res.status(502).json({ error: 'Azure OpenAI call failed', detail: String(err) });
        return;
      }
    } else {
      // ── Mock / demo mode ────────────────────────────────────────────────
      const expType = incident.experiment?.type ?? incident.alertName ?? 'UNKNOWN';

      const MOCK_CAUSES: Record<string, string> = {
        HIGH_CPU:          'CPU saturation caused by a tight computation loop in the chaos experiment. The process was consuming 100% of available CPU cycles, starving other goroutines and causing request timeouts.',
        HIGH_LATENCY:      'Artificial 800ms latency injected via Redis flag. All inbound HTTP requests were delayed in the chaos middleware before reaching route handlers, inflating p99 response times.',
        SERVICE_ERROR:     '40% of requests are being returned as HTTP 500 errors by the chaos middleware. The error injection simulates a flapping dependency or upstream service failure.',
        DB_SLOWDOWN:       'Database query latency artificially elevated to 600ms per request. Combined with connection pool limits, this causes cascading timeouts in dependent services.',
        MEMORY_PRESSURE:   'Simulated GC pressure adding 400ms ±25% jitter to responses. In production this pattern indicates a heap memory leak or insufficient JVM/Node heap allocation.',
        BackendDown:       'The backend process stopped responding to Prometheus health checks. Possible causes: OOM kill, uncaught exception crash, or network partition.',
        ChaosExperimentActive: 'A deliberate chaos experiment is currently running. Failures are being injected by the Aegis chaos middleware.',
        SustainedChaosInjection: 'A chaos experiment has been active for more than 2 minutes. Verify this is intentional and that system resilience targets are being met.',
      };

      rootCause = MOCK_CAUSES[expType] ?? `Incident triggered by ${incident.source === 'ALERT' ? 'Prometheus alert' : 'chaos experiment'}. Detailed analysis requires Azure OpenAI credentials.`;
      impact = incident.severity === 'CRITICAL'
        ? 'All end-users affected. API error rate exceeds SLA thresholds. Immediate escalation required.'
        : incident.severity === 'HIGH'
        ? 'Partial service degradation. Subset of users experiencing errors or elevated latency.'
        : 'Minor service impact. Performance degraded but within acceptable bounds for most users.';
      remediationSteps = [
        'Verify the chaos experiment is intentional and document findings.',
        'Check Prometheus metrics for correlated anomalies (CPU, memory, error rate).',
        'If unintentional, stop the chaos experiment via the Chaos Engineering page.',
        'Review application logs for downstream errors caused by the injected failures.',
        'Run a health check against all dependent services before marking resolved.',
      ];
      riskScore  = incident.severity;
      confidence = 62;
      modelUsed  = 'mock [DEMO — set Azure OpenAI env vars for real analysis]';
    }

    // ── Persist analysis ────────────────────────────────────────────────────
    const analysis = await db.aiAnalysis.upsert({
      where:  { incidentId: incident.id },
      create: {
        incidentId: incident.id,
        rootCause,
        impact,
        remediationSteps: JSON.stringify(remediationSteps),
        riskScore,
        confidence,
        model: modelUsed,
      },
      update: {
        rootCause,
        impact,
        remediationSteps: JSON.stringify(remediationSteps),
        riskScore,
        confidence,
        model: modelUsed,
      },
    });

    res.json(analysis);
  },
);

// Suppress unused import warning — incidentsTotal is exported from index and used by alerts route
void incidentsTotal;

// ── GET /api/incidents/:id/postmortem ────────────────────────────────────────
router.get(
  '/:id/postmortem',
  requireRole('OPERATOR', 'ADMIN'),
  async (req: Request, res: Response): Promise<void> => {
    const pm = await db.postmortem.findUnique({ where: { incidentId: req.params.id } });
    if (!pm) { res.status(404).json({ error: 'Postmortem not generated yet' }); return; }
    res.json(pm);
  },
);

// ── POST /api/incidents/:id/postmortem ───────────────────────────────────────
// Generates (or regenerates) a postmortem using AI or mock fallback.
router.post(
  '/:id/postmortem',
  requireRole('OPERATOR', 'ADMIN'),
  async (req: Request, res: Response): Promise<void> => {
    const incident = await db.incident.findUnique({
      where: { id: req.params.id },
      include: { experiment: true, aiAnalysis: true, selfHealingRuns: true },
    });
    if (!incident) { res.status(404).json({ error: 'Incident not found' }); return; }
    if (incident.status !== 'RESOLVED') {
      res.status(400).json({ error: 'Postmortems can only be generated for RESOLVED incidents' });
      return;
    }

    // Build timeline string
    const durationMs = incident.resolvedAt
      ? new Date(incident.resolvedAt).getTime() - new Date(incident.createdAt).getTime()
      : null;
    const durationStr = durationMs
      ? `${Math.round(durationMs / 60_000)} minutes`
      : 'unknown';

    const healingActions = incident.selfHealingRuns
      .filter((r) => r.status === 'SUCCESS')
      .map((r) => `- Self-healing action executed at ${r.completedAt?.toISOString() ?? 'unknown time'}`)
      .join('\n');

    const timelineText = [
      `- **${incident.createdAt.toISOString()}** — Incident created (${incident.source} source)`,
      incident.aiAnalysis ? `- AI root cause analysis completed` : null,
      healingActions || null,
      incident.resolvedAt ? `- **${incident.resolvedAt.toISOString()}** — Incident resolved` : null,
    ].filter(Boolean).join('\n');

    const systemPrompt = `You are an expert SRE writing a postmortem document.
Respond with a complete, professional postmortem in Markdown format using this exact structure:

# Postmortem: [INCIDENT TITLE]

## Summary
[2-3 sentence incident summary]

## Impact
[Severity, affected systems, approximate user impact]

## Timeline
[Chronological list of events]

## Root Cause
[Technical explanation of what caused the incident]

## Resolution
[What fixed the issue and why it worked]

## Action Items
| Priority | Action | Owner | Due |
|----------|--------|-------|-----|
| P1 | ... | SRE Team | 1 week |

## Lessons Learned
[Key takeaways to prevent recurrence]

Write in clear, professional SRE language. Be concise and specific.`;

    const userPrompt = `Incident: ${incident.title}
Severity: ${incident.severity}
Source: ${incident.source}
Alert Name: ${incident.alertName ?? 'N/A'}
Experiment Type: ${incident.experiment?.type ?? 'N/A'}
Duration: ${durationStr}
AI Root Cause: ${incident.aiAnalysis?.rootCause ?? 'Not analyzed'}
AI Impact: ${incident.aiAnalysis?.impact ?? 'Not analyzed'}
Operator Notes: ${incident.notes ?? 'None'}

Timeline:
${timelineText}`;

    let content: string;

    if (isAiConfigured && openaiClient) {
      try {
        const completion = await openaiClient.chat.completions.create({
          model: DEPLOYMENT,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user',   content: userPrompt   },
          ],
          temperature: 0.4,
          max_tokens: 1500,
        });
        content = completion.choices[0]?.message?.content ?? '';
      } catch (err) {
        res.status(502).json({ error: 'Azure OpenAI call failed', detail: String(err) });
        return;
      }
    } else {
      // Mock postmortem
      const expType  = incident.experiment?.type ?? incident.alertName ?? 'UNKNOWN';
      const rootInfo = incident.aiAnalysis?.rootCause ?? `${expType} failure pattern detected.`;
      content = [
        `# Postmortem: ${incident.title}`,
        ``,
        `**Generated:** ${new Date().toUTCString()}  `,
        `**Severity:** ${incident.severity}  `,
        `**Duration:** ${durationStr}  `,
        `**Status:** DRAFT`,
        ``,
        `---`,
        ``,
        `## Summary`,
        ``,
        `A ${incident.severity.toLowerCase()}-severity incident was triggered via ${incident.source === 'CHAOS' ? 'chaos engineering experiment' : 'Prometheus alert'} (\`${incident.alertName ?? expType}\`).`,
        `The incident lasted ${durationStr} before being resolved. Self-healing automation ${incident.selfHealingRuns.length > 0 ? 'successfully intervened' : 'was not triggered'}.`,
        ``,
        `## Impact`,
        ``,
        `- **Severity Level:** ${incident.severity}`,
        `- **Affected Services:** Backend API, dependent downstream clients`,
        `- **Estimated Affected Users:** ${incident.severity === 'CRITICAL' ? '100% of users' : incident.severity === 'HIGH' ? 'Partial (estimated 30-60% of traffic)' : 'Minimal (< 15% of requests impacted)'}`,
        `- **Duration:** ${durationStr}`,
        ``,
        `## Timeline`,
        ``,
        timelineText,
        ``,
        `## Root Cause`,
        ``,
        rootInfo,
        ``,
        `## Resolution`,
        ``,
        incident.selfHealingRuns.length > 0
          ? `The Aegis self-healing engine automatically detected the anomaly and applied the configured remediation policy. The chaos experiment was stopped and Redis failure flags were cleared, allowing the system to recover.`
          : `The incident was manually resolved by the on-call operator after verifying that the root cause had been addressed. Prometheus alert thresholds returned to normal.`,
        ``,
        `## Action Items`,
        ``,
        `| Priority | Action | Owner | Due |`,
        `|----------|--------|-------|-----|`,
        `| P1 | Add automated chaos detection alert for early warning | SRE Team | 1 week |`,
        `| P2 | Update runbook for ${expType} scenarios | Platform Eng | 2 weeks |`,
        `| P3 | Review self-healing cooldown thresholds | SRE Lead | 1 month |`,
        ``,
        `## Lessons Learned`,
        ``,
        `- Chaos experiments should be time-bounded and gated by operator approval in production.`,
        `- Self-healing automation significantly reduced mean time to recovery (MTTR).`,
        `- Prometheus alerting thresholds should be tuned to detect ${expType.toLowerCase().replace(/_/g, ' ')} patterns earlier.`,
        ``,
        `---`,
        `*This postmortem was auto-generated by Aegis AI SRE Platform (demo mode). Provide Azure OpenAI credentials for fully AI-authored documents.*`,
      ].join('\n');
    }

    // Persist / overwrite
    const pm = await db.postmortem.upsert({
      where:  { incidentId: incident.id },
      create: { incidentId: incident.id, content, status: 'DRAFT' },
      update: { content, updatedAt: new Date() },
    });

    res.json(pm);
  },
);

// ── PATCH /api/incidents/:id/postmortem ──────────────────────────────────────
// Save manual edits to the postmortem markdown.
router.patch(
  '/:id/postmortem',
  requireRole('OPERATOR', 'ADMIN'),
  async (req: Request, res: Response): Promise<void> => {
    const { content, status } = req.body;
    if (typeof content !== 'string' && typeof status !== 'string') {
      res.status(400).json({ error: 'content or status string required' });
      return;
    }
    try {
      const pm = await db.postmortem.update({
        where: { incidentId: req.params.id },
        data: {
          ...(typeof content === 'string' ? { content } : {}),
          ...(typeof status  === 'string' ? { status  } : {}),
          updatedAt: new Date(),
        },
      });
      res.json(pm);
    } catch {
      res.status(404).json({ error: 'Postmortem not found — generate it first' });
    }
  },
);

export default router;
