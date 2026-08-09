import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { requireAuth } from '../middleware/auth';
import {
  extractLearningFromIncident,
  findSimilarLearnings,
  getKnowledgeBaseStats,
} from '../lib/learningEngine';

const db = new PrismaClient();
const router = Router();

router.use(requireAuth);

// GET /api/learning/stats
router.get('/stats', async (_req, res) => {
  try {
    const stats = await getKnowledgeBaseStats();
    res.json(stats);
  } catch (err) {
    console.error('[learning/stats]', err);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// GET /api/learning/learnings
router.get('/learnings', async (_req, res) => {
  try {
    const learnings = await db.incidentLearning.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    res.json(learnings.map((l) => ({ ...l, keywords: JSON.parse(l.keywords) })));
  } catch (err) {
    console.error('[learning/learnings]', err);
    res.status(500).json({ error: 'Failed to fetch learnings' });
  }
});

// GET /api/learning/similar?incidentId=X
router.get('/similar', async (req, res) => {
  const { incidentId } = req.query as { incidentId?: string };
  if (!incidentId) return res.status(400).json({ error: 'incidentId query param required' });

  try {
    const similar = await findSimilarLearnings(incidentId);
    res.json(similar);
  } catch (err) {
    console.error('[learning/similar]', err);
    res.status(500).json({ error: 'Failed to find similar learnings' });
  }
});

// GET /api/learning/feedback
router.get('/feedback', async (_req, res) => {
  try {
    const feedback = await db.resolutionFeedback.findMany({
      orderBy: { createdAt: 'desc' },
      take: 30,
    });
    res.json(feedback);
  } catch (err) {
    console.error('[learning/feedback]', err);
    res.status(500).json({ error: 'Failed to fetch feedback' });
  }
});

// POST /api/learning/feedback — submit feedback & trigger learning extraction
router.post('/feedback', async (req, res) => {
  const {
    incidentId,
    resolvedBy,
    ttmMins,
    whatWorked,
    whatFailed,
    suggestedImprovements,
    rating,
  } = req.body as {
    incidentId: string;
    resolvedBy: string;
    ttmMins: number;
    whatWorked: string;
    whatFailed?: string;
    suggestedImprovements?: string;
    rating: number;
  };

  if (!incidentId || !whatWorked || !ttmMins || !rating) {
    return res.status(400).json({ error: 'incidentId, whatWorked, ttmMins, and rating are required' });
  }

  try {
    const learning = await extractLearningFromIncident(incidentId, {
      resolvedBy: resolvedBy ?? 'anonymous',
      ttmMins,
      whatWorked,
      whatFailed,
      suggestedImprovements,
      rating,
    });
    res.status(201).json({ learning });
  } catch (err: any) {
    console.error('[learning/feedback POST]', err);
    res.status(500).json({ error: err?.message ?? 'Failed to extract learning' });
  }
});

// POST /api/learning/extract/:incidentId — manual extraction trigger
router.post('/extract/:incidentId', async (req, res) => {
  const { incidentId } = req.params;

  // Use a generic synthetic feedback when manually triggered
  try {
    const learning = await extractLearningFromIncident(incidentId, {
      resolvedBy: 'system',
      ttmMins: 30,
      whatWorked: 'Manual extraction triggered — see incident AI analysis for details.',
      rating: 3,
    });
    res.status(201).json({ learning });
  } catch (err: any) {
    console.error('[learning/extract]', err);
    res.status(500).json({ error: err?.message ?? 'Failed to extract learning' });
  }
});

// POST /api/learning/vote/:learningId — upvote or downvote a learning
router.post('/vote/:learningId', async (req, res) => {
  const { direction } = req.body as { direction: 'up' | 'down' };
  if (!direction || !['up', 'down'].includes(direction)) {
    return res.status(400).json({ error: 'direction must be "up" or "down"' });
  }

  try {
    const updated = await db.incidentLearning.update({
      where: { id: req.params.learningId },
      data: { usefulnessVotes: { increment: direction === 'up' ? 1 : -1 } },
    });
    res.json({ ...updated, keywords: JSON.parse(updated.keywords) });
  } catch (err) {
    console.error('[learning/vote]', err);
    res.status(500).json({ error: 'Failed to record vote' });
  }
});

export default router;
