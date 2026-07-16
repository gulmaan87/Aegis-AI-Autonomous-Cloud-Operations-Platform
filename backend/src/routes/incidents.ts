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
      aiAnalysis: true,
    },
    take: 100,
  });
  res.json(incidents);
});

// ── GET /api/incidents/:id ────────────────────────────────────────────────────
router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  const incident = await db.incident.findUnique({
    where: { id: req.params.id },
    include: { experiment: true, aiAnalysis: true },
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

export default router;
