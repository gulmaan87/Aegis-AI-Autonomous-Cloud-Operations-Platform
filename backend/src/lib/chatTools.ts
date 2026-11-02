import db from './db';
import redis from './redis';

export const chatTools = [
  {
    type: 'function' as const,
    function: {
      name: 'get_recent_incidents',
      description: 'Fetch the most recent incidents and their status.',
      parameters: {
        type: 'object',
        properties: {
          limit: { type: 'number', description: 'Max number of incidents to return' },
        },
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'get_active_chaos_experiments',
      description: 'Fetch the currently running chaos experiment and active Redis flags.',
      parameters: {
        type: 'object',
        properties: {},
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'get_experiment_history',
      description: 'Fetch past chaos experiments history.',
      parameters: {
        type: 'object',
        properties: {
          limit: { type: 'number', description: 'Number of past experiments to return' },
        },
      },
    },
  },
];

export async function executeTool(name: string, args: Record<string, any>): Promise<any> {
  switch (name) {
    case 'get_recent_incidents': {
      const limit = args.limit || 5;
      const incidents = await db.incident.findMany({
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: { id: true, title: true, severity: true, status: true, source: true, createdAt: true },
      });
      return { incidents };
    }

    case 'get_active_chaos_experiments': {
      const active = await db.chaosExperiment.findFirst({
        where: { status: 'RUNNING' },
        select: { id: true, name: true, type: true, durationMs: true, startedAt: true },
      });

      const keys = ['chaos:latency', 'chaos:error_rate', 'chaos:db_slowdown', 'chaos:memory_pressure'];
      const values = await Promise.all(keys.map((k) => redis.get(k).then((v) => [k, v] as const)));
      const activeFlags = Object.fromEntries(values.filter(([, v]) => v !== null));

      return { activeExperiment: active, activeFlags };
    }

    case 'get_experiment_history': {
      const limit = args.limit || 5;
      const experiments = await db.chaosExperiment.findMany({
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: { id: true, name: true, type: true, status: true, durationMs: true, createdAt: true },
      });
      return { experiments };
    }

    default:
      return { error: `Tool ${name} not found` };
  }
}
