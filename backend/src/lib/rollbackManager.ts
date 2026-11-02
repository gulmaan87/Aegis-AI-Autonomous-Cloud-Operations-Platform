import db from './db';

export async function triggerDeployment(
  service: string,
  version: string,
  gitCommit = 'head',
  deployedBy = 'Operator'
) {
  const previous = await db.deploymentRecord.findFirst({
    where: { service, status: 'HEALTHY' },
    orderBy: { createdAt: 'desc' },
  });

  const previousVersion = previous?.version ?? 'v1.0.0';

  return db.deploymentRecord.create({
    data: {
      service,
      version,
      previousVersion,
      gitCommit,
      deployedBy,
      status: 'CANARY_TESTING',
      canaryErrorRate: 0.0,
      canaryLatencyP99: 45.0,
    },
  });
}

export async function evaluateCanaryHealth(deploymentId: string) {
  const deployment = await db.deploymentRecord.findUnique({
    where: { id: deploymentId },
  });

  if (!deployment) throw new Error('Deployment not found');

  const passed = deployment.canaryErrorRate < 1.0 && deployment.canaryLatencyP99 < 100.0;
  const newStatus = passed ? 'HEALTHY' : 'ROLLED_BACK';

  await db.deploymentHealthCheck.create({
    data: {
      deploymentId,
      checkName: 'CANARY_HEALTH_GATE',
      status: passed ? 'PASSED' : 'FAILED',
      message: passed
        ? `Canary passed: error rate ${deployment.canaryErrorRate}%, latency ${deployment.canaryLatencyP99}ms`
        : `Canary failed: error rate ${deployment.canaryErrorRate}%, latency ${deployment.canaryLatencyP99}ms`,
    },
  });

  return db.deploymentRecord.update({
    where: { id: deploymentId },
    data: {
      status: newStatus,
      rollbackReason: passed ? null : 'Automated canary failure threshold exceeded',
    },
    include: { healthChecks: true },
  });
}

export async function executeManualRollback(
  deploymentId: string,
  reason: string,
  _operator: string
) {
  return db.deploymentRecord.update({
    where: { id: deploymentId },
    data: {
      status: 'ROLLED_BACK',
      rollbackReason: reason,
    },
  });
}

