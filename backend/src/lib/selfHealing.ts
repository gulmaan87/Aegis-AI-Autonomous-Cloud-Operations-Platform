import db from './db';
import redis from './redis';
import { RemediationType } from '@prisma/client';

export async function seedDefaultPolicies(): Promise<void> {
  const defaults = [
    { alertName: 'HighErrorRate', actionType: 'CLEAR_REDIS_FLAGS' as RemediationType, cooldownSec: 60 },
    { alertName: 'HighLatencyAlert', actionType: 'CLEAR_REDIS_FLAGS' as RemediationType, cooldownSec: 60 },
    { alertName: 'ChaosExperimentActive', actionType: 'STOP_CHAOS_EXPERIMENT' as RemediationType, cooldownSec: 120 },
  ];

  for (const item of defaults) {
    const existing = await db.selfHealingPolicy.findUnique({ where: { alertName: item.alertName } });
    if (!existing) {
      await db.selfHealingPolicy.create({ data: item });
    }
  }
}

export async function triggerSelfHealing(alertName: string, incidentId?: string): Promise<void> {
  const policy = await db.selfHealingPolicy.findUnique({ where: { alertName } });
  if (!policy || !policy.isEnabled) return;

  const now = new Date();
  if (policy.lastTriggeredAt) {
    const elapsedSec = (now.getTime() - policy.lastTriggeredAt.getTime()) / 1000;
    if (elapsedSec < policy.cooldownSec) return;
  }

  await db.selfHealingPolicy.update({
    where: { id: policy.id },
    data: { lastTriggeredAt: now },
  });

  const run = await db.selfHealingRun.create({
    data: {
      policyId: policy.id,
      incidentId: incidentId || null,
      status: 'RUNNING',
      logs: `Triggered remediation action ${policy.actionType} for alert ${alertName}`,
    },
  });

  try {
    if (policy.actionType === 'CLEAR_REDIS_FLAGS') {
      await redis.del('chaos:latency', 'chaos:error_rate', 'chaos:db_slowdown', 'chaos:memory_pressure');
    } else if (policy.actionType === 'STOP_CHAOS_EXPERIMENT') {
      await redis.del('chaos:latency', 'chaos:error_rate', 'chaos:db_slowdown', 'chaos:memory_pressure');
      await db.chaosExperiment.updateMany({
        where: { status: 'RUNNING' },
        data: { status: 'STOPPED', endedAt: new Date() },
      });
    }

    await db.selfHealingRun.update({
      where: { id: run.id },
      data: { status: 'SUCCESS', completedAt: new Date(), logs: `${run.logs}\nRemediation executed successfully.` },
    });
  } catch (err: any) {
    await db.selfHealingRun.update({
      where: { id: run.id },
      data: { status: 'FAILED', completedAt: new Date(), logs: `${run.logs}\nError: ${err.message}` },
    });
  }
}
