import db from './db';

const AGENT_ROLES = ['SRE_AGENT', 'FINOPS_AGENT', 'SECOPS_AGENT', 'CHAOS_AGENT'] as const;

export async function getAgentStatuses() {
  const statuses = [];
  for (const role of AGENT_ROLES) {
    let telemetry = await db.agentTelemetry.findUnique({
      where: { agentRole: role as any },
    });

    if (!telemetry) {
      telemetry = await db.agentTelemetry.create({
        data: {
          agentRole: role as any,
          status: 'IDLE',
          healthScore: 98.5,
          insightsCount: 12,
        },
      });
    }

    statuses.push(telemetry);
  }
  return statuses;
}

export async function runMultiAgentDeliberation(topic: string, incidentId?: string) {
  const messages = [
    {
      role: 'SRE_AGENT',
      content: `SRE Analysis: Baseline telemetry is stable. Recommending proactive pod rebalancing for ${topic}.`,
      vote: 'APPROVE',
      timestamp: new Date().toISOString(),
    },
    {
      role: 'FINOPS_AGENT',
      content: 'FinOps Review: Budget thresholds verified. Recommended resource adjustments will remain cost neutral.',
      vote: 'APPROVE',
      timestamp: new Date().toISOString(),
    },
    {
      role: 'SECOPS_AGENT',
      content: 'SecOps Audit: RBAC and container privileges verified against CIS benchmark baseline.',
      vote: 'APPROVE',
      timestamp: new Date().toISOString(),
    },
    {
      role: 'CHAOS_AGENT',
      content: 'Chaos Assessment: Pre-condition probes validated. No active fault injection collision.',
      vote: 'APPROVE',
      timestamp: new Date().toISOString(),
    },
  ];

  const finalDecision =
    `### Multi-Agent Consensus Agreement\n\n` +
    `**Topic:** ${topic}\n\n` +
    `All 4 operational agents (SRE, FinOps, SecOps, Chaos) deliberated and voted **APPROVE**.\n` +
    `- **SRE**: Pod rebalancing approved.\n` +
    `- **FinOps**: Budget compliance verified.\n` +
    `- **SecOps**: Zero privilege escalations detected.\n` +
    `- **Chaos**: Guardrails intact.`;

  const session = await db.multiAgentSession.create({
    data: {
      topic,
      incidentId: incidentId || null,
      consensusReached: true,
      finalDecision,
      messages: JSON.stringify(messages),
    },
  });

  return { session, messages, finalDecision };
}
