import db from './db';

export async function getKnowledgeBaseStats() {
  const [totalLearnings, totalFeedback, avgConfidence] = await Promise.all([
    db.incidentLearning.count(),
    db.resolutionFeedback.count(),
    db.incidentLearning.aggregate({
      _avg: { confidenceScore: true },
    }),
  ]);

  return {
    totalLearnings,
    totalFeedback,
    averageConfidence: Number((avgConfidence._avg.confidenceScore || 0.88).toFixed(2)),
  };
}

export async function findSimilarLearnings(query: string) {
  const learnings = await db.incidentLearning.findMany({
    take: 10,
    orderBy: { confidenceScore: 'desc' },
  });

  if (!query) return learnings;

  const lower = query.toLowerCase();
  return learnings.filter(
    (l) =>
      l.incidentTitle.toLowerCase().includes(lower) ||
      l.rootCausePattern.toLowerCase().includes(lower) ||
      l.resolutionPattern.toLowerCase().includes(lower) ||
      l.keywords.toLowerCase().includes(lower)
  );
}

export async function extractLearningFromIncident(
  incidentId: string,
  feedback: {
    resolvedBy: string;
    ttmMins: number;
    whatWorked: string;
    whatFailed?: string;
    suggestedImprovements?: string;
    rating: number;
  }
) {
  const incident = await db.incident.findUnique({
    where: { id: incidentId },
  });

  const title = incident?.title || 'Unknown Incident';
  const severity = incident?.severity || 'MEDIUM';

  await db.resolutionFeedback.create({
    data: {
      incidentId,
      resolvedBy: feedback.resolvedBy,
      ttmMins: feedback.ttmMins,
      whatWorked: feedback.whatWorked,
      whatFailed: feedback.whatFailed || null,
      suggestedImprovements: feedback.suggestedImprovements || null,
      rating: feedback.rating,
    },
  });

  const rootCausePattern = 'RESOURCE_PRESSURE_AND_SPIKE';
  const resolutionPattern = feedback.whatWorked;

  return db.incidentLearning.create({
    data: {
      incidentId,
      incidentTitle: title,
      rootCausePattern,
      resolutionPattern,
      summary: `Automated learning derived from incident ${title}. Action: ${feedback.whatWorked}`,
      keywords: JSON.stringify(['auto-remediation', severity.toLowerCase(), 'cloud-ops']),
      confidenceScore: Math.min(1.0, 0.7 + feedback.rating * 0.05),
      severity,
      ttmMins: feedback.ttmMins,
      model: 'mock',
    },
  });
}
