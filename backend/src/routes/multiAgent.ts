import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { requireAuth } from '../middleware/auth';
import { runMultiAgentDeliberation, getAgentStatuses } from '../lib/multiAgentMesh';

const db = new PrismaClient();
const router = Router();

// All multi-agent routes require authentication
router.use(requireAuth);

// GET /api/multi-agent/agents — current status of all 4 agents
router.get('/agents', async (_req, res) => {
  try {
    const agents = await getAgentStatuses();
    res.json(agents);
  } catch (err) {
    console.error('[multi-agent/agents]', err);
    res.status(500).json({ error: 'Failed to fetch agent statuses' });
  }
});

// GET /api/multi-agent/sessions — recent deliberation session history
router.get('/sessions', async (_req, res) => {
  try {
    const sessions = await db.multiAgentSession.findMany({
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    const parsed = sessions.map((s) => ({
      ...s,
      messages: JSON.parse(s.messages),
    }));

    res.json(parsed);
  } catch (err) {
    console.error('[multi-agent/sessions]', err);
    res.status(500).json({ error: 'Failed to fetch sessions' });
  }
});

// GET /api/multi-agent/sessions/:id — single session detail
router.get('/sessions/:id', async (req, res) => {
  try {
    const session = await db.multiAgentSession.findUnique({
      where: { id: req.params.id },
    });
    if (!session) return res.status(404).json({ error: 'Session not found' });

    res.json({ ...session, messages: JSON.parse(session.messages) });
  } catch (err) {
    console.error('[multi-agent/sessions/:id]', err);
    res.status(500).json({ error: 'Failed to fetch session' });
  }
});

// POST /api/multi-agent/deliberate — trigger on-demand agent mesh deliberation
router.post('/deliberate', async (req, res) => {
  const { topic, incidentId } = req.body as { topic?: string; incidentId?: string };

  const resolvedTopic =
    topic?.trim() ||
    'System Reliability, Cost Optimization, and Security Hardening Coordination';

  try {
    const { session, messages, finalDecision } = await runMultiAgentDeliberation(
      resolvedTopic,
      incidentId
    );
    res.json({ session, messages, finalDecision });
  } catch (err) {
    console.error('[multi-agent/deliberate]', err);
    res.status(500).json({ error: 'Multi-agent deliberation failed' });
  }
});

export default router;
