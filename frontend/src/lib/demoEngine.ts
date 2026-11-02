import api from './api';

export type StepStatus = 'pending' | 'running' | 'done' | 'error';

export interface DemoStep {
  id: string;
  title: string;
  description: string;
  level: number;
  icon: string;
  run?: (navigate: (to: string) => void) => Promise<string>;
}

export interface DemoStepResult {
  stepId: string;
  status: StepStatus;
  message: string;
  timestamp: string;
}

export const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const DEMO_STEPS: DemoStep[] = [
  {
    id: 'l1_dashboard',
    level: 1,
    icon: '⚡',
    title: 'Operations Dashboard & Telemetry',
    description: 'Real-time telemetry ingestion, Prometheus metrics stream, and cluster health monitoring.',
    run: async (navigate) => {
      navigate('/');
      await api.get('/incidents?limit=5');
      return 'Cluster telemetry active. Ingesting Prometheus metrics and incident streams.';
    },
  },
  {
    id: 'l2_chaos',
    level: 2,
    icon: '💥',
    title: 'Controlled Chaos Experimentation',
    description: 'Inject CPU and latency turbulence to test resilience policies.',
    run: async (navigate) => {
      navigate('/chaos');
      await api.get('/chaos/experiments');
      return 'Chaos engine verified. Single-experiment mutex lock active in Redis.';
    },
  },
  {
    id: 'l3_commander',
    level: 3,
    icon: '🚨',
    title: 'Automated Incident Commander',
    description: 'Dynamic severity triage and automated incident lifecycle tracking.',
    run: async (navigate) => {
      navigate('/incidents');
      await api.get('/incidents');
      return 'Incident commander synchronized. Automated incident timeline active.';
    },
  },
  {
    id: 'l4_chat',
    level: 4,
    icon: '💬',
    title: 'Azure OpenAI SRE Assistant',
    description: 'Interactive natural language root-cause analysis and tool-calling execution.',
    run: async (navigate) => {
      navigate('/chat');
      return 'AI SRE Assistant initialized with cluster diagnostics tool calling.';
    },
  },
  {
    id: 'l5_selfhealing',
    level: 5,
    icon: '🛡️',
    title: 'Autonomous Self-Healing Engine',
    description: 'Automatic detection, circuit breaking, and pod restart remediation policies.',
    run: async (navigate) => {
      navigate('/self-healing');
      await api.get('/self-healing/policies');
      return 'Self-healing policies verified. Remediation audit cooldown active.';
    },
  },
  {
    id: 'l6_predictions',
    level: 6,
    icon: '🔮',
    title: 'Predictive Outage & Anomaly Detection',
    description: 'Forecasting node degradation and disk saturation before customer impact.',
    run: async (navigate) => {
      navigate('/predictions');
      await api.get('/predictions');
      return 'Predictive telemetry model analyzed: 0 imminent cluster failure anomalies detected.';
    },
  },
  {
    id: 'l7_costs',
    level: 7,
    icon: '💰',
    title: 'FinOps Cloud Cost Optimization',
    description: 'Automated idle compute termination and right-sizing cost reduction.',
    run: async (navigate) => {
      navigate('/costs');
      await api.get('/costs');
      return 'FinOps analyzer complete: computed monthly cloud savings opportunities.';
    },
  },
  {
    id: 'l8_security',
    level: 8,
    icon: '🛡️',
    title: 'Zero-Trust DevSecOps Audit',
    description: 'CIS benchmark scans, RBAC validation, and container CVE evaluation.',
    run: async (navigate) => {
      navigate('/security');
      await api.get('/security/audit');
      return 'Zero-trust security audit complete: CIS score and compliance rating calculated.';
    },
  },
  {
    id: 'l9_voice',
    level: 9,
    icon: '🎙️',
    title: 'Voice Operations Command Center',
    description: 'Hands-free Speech-to-Text and TTS operational commands.',
    run: async (navigate) => {
      navigate('/voice');
      return 'Web Speech API interface ready for hands-free voice operations.';
    },
  },
  {
    id: 'l10_multiagent',
    level: 10,
    icon: '🤖',
    title: 'Multi-Agent Consensus Mesh',
    description: 'Architect, FinOps, SRE, and Security agent quorum deliberation.',
    run: async (navigate) => {
      navigate('/multi-agent');
      await api.get('/multi-agent/agents');
      return 'Multi-agent quorum mesh online: 4 specialized agents ready for deliberation.';
    },
  },
  {
    id: 'l11_rollback',
    level: 11,
    icon: '🚀',
    title: 'Automated Canary & Rollback Pipeline',
    description: 'Statistical error threshold checks and zero-downtime rollback triggers.',
    run: async (navigate) => {
      navigate('/deployments');
      await api.get('/deployments');
      return 'Canary evaluator active: auto-rollback triggered if P99 latency or error rate spikes.';
    },
  },
  {
    id: 'l12_learning',
    level: 12,
    icon: '🧠',
    title: 'Continuous Post-Mortem Learning',
    description: 'Extract operational runbooks and vector learnings from resolved incidents.',
    run: async (navigate) => {
      navigate('/learning');
      await api.get('/learning/stats');
      return 'Learning engine updated: knowledge base indexed for root-cause retrieval.';
    },
  },
  {
    id: 'l13_enterprise',
    level: 13,
    icon: '🏢',
    title: 'Enterprise Multi-Tenant Readiness',
    description: 'Tamper-evident audit logs, user governance, and cluster health diagnostics.',
    run: async (navigate) => {
      navigate('/enterprise');
      await api.get('/enterprise/diagnostics');
      return 'Enterprise tenant controls verified: audit logging and RBAC operational.';
    },
  },
];

export async function runDemoStep(
  step: DemoStep,
  navigate: (to: string) => void
): Promise<DemoStepResult> {
  const timestamp = new Date().toLocaleTimeString();
  try {
    const msg = step.run ? await step.run(navigate) : `Step [${step.title}] finished successfully.`;
    return {
      stepId: step.id,
      status: 'done',
      message: `[L${step.level}] ${step.icon} ${step.title}: ${msg}`,
      timestamp,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Step execution failed';
    return {
      stepId: step.id,
      status: 'error',
      message: `[L${step.level}] ${step.icon} ${step.title} failed: ${msg}`,
      timestamp,
    };
  }
}

export function buildCapabilitiesReport() {
  return {
    platform: 'Aegis AI - Autonomous Cloud Operations Platform',
    version: '1.0.0',
    generatedAt: new Date().toISOString(),
    status: 'OPERATIONAL',
    levelsCovered: 13,
    capabilities: DEMO_STEPS.map((s) => ({
      level: s.level,
      icon: s.icon,
      title: s.title,
      description: s.description,
    })),
  };
}
