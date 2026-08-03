import db from './db';
import redis from './redis';
import { OptimizationStatus } from '@prisma/client';
import { openaiClient, DEPLOYMENT, isAiConfigured } from './openai';

export interface ServiceSpec {
  service: string;
  cpuCores: number;
  memoryGb: number;
  hourlyCostUsd: number;
}

export interface RecommendationItem {
  service: string;
  action: string;
  estimatedSavingUsd: number; // Monthly saving estimate
  priority: 'P1' | 'P2' | 'P3';
}

const SERVICE_CATALOG: ServiceSpec[] = [
  { service: 'backend-api',     cpuCores: 2.0, memoryGb: 4.0,  hourlyCostUsd: 0.096 },
  { service: 'redis-cache',     cpuCores: 1.0, memoryGb: 8.0,  hourlyCostUsd: 0.068 },
  { service: 'postgres-db',     cpuCores: 4.0, memoryGb: 16.0, hourlyCostUsd: 0.240 },
  { service: 'gateway-router', cpuCores: 1.0, memoryGb: 2.0,  hourlyCostUsd: 0.035 },
  { service: 'prometheus-mon', cpuCores: 2.0, memoryGb: 8.0,  hourlyCostUsd: 0.110 },
];

/**
 * Evaluates current resource utilization per service based on baseline stats
 * and active Redis chaos experiment flags, then saves records to DB.
 */
export async function computeResourceCosts() {
  const flags = (await redis.hgetall('chaos:flags')) || {};

  const isCpuActive     = flags['HIGH_CPU'] === 'true';
  const isLatencyActive = flags['HIGH_LATENCY'] === 'true';
  const isErrorActive   = flags['SERVICE_ERROR'] === 'true';
  const isMemoryActive  = flags['MEMORY_PRESSURE'] === 'true';
  const isDbActive      = flags['DB_SLOWDOWN'] === 'true';

  const records = [];

  for (const spec of SERVICE_CATALOG) {
    let cpuUsagePct = 0;
    let memoryUsagePct = 0;

    switch (spec.service) {
      case 'backend-api':
        cpuUsagePct    = isCpuActive ? 92.4 : 18.5 + Math.random() * 5;
        memoryUsagePct = isMemoryActive ? 85.0 : 32.0 + Math.random() * 4;
        break;
      case 'redis-cache':
        cpuUsagePct    = isLatencyActive ? 68.0 : 12.0 + Math.random() * 3;
        memoryUsagePct = isMemoryActive ? 91.5 : 28.4 + Math.random() * 3;
        break;
      case 'postgres-db':
        cpuUsagePct    = isDbActive ? 84.0 : 15.2 + Math.random() * 4;
        memoryUsagePct = isDbActive ? 78.0 : 42.0 + Math.random() * 5;
        break;
      case 'gateway-router':
        cpuUsagePct    = isErrorActive ? 75.0 : 22.0 + Math.random() * 6;
        memoryUsagePct = 35.0 + Math.random() * 5;
        break;
      case 'prometheus-mon':
        cpuUsagePct    = 25.0 + Math.random() * 4;
        memoryUsagePct = 62.0 + Math.random() * 5;
        break;
    }

    cpuUsagePct    = +cpuUsagePct.toFixed(1);
    memoryUsagePct = +memoryUsagePct.toFixed(1);

    const avgUsagePct = (cpuUsagePct + memoryUsagePct) / 2;
    const wasteUsd   = +(spec.hourlyCostUsd * (1 - avgUsagePct / 100)).toFixed(4);

    let status: OptimizationStatus = 'OPTIMAL';
    if (avgUsagePct < 20.0) {
      status = 'WASTEFUL';
    } else if (cpuUsagePct < 25.0 && spec.cpuCores >= 2.0) {
      status = 'OVERPROVISIONED';
    } else if (memoryUsagePct < 35.0 && spec.memoryGb >= 8.0) {
      status = 'UNDERUTILIZED';
    } else if (avgUsagePct < 40.0) {
      status = 'UNDERUTILIZED';
    }

    const record = await db.resourceCostRecord.create({
      data: {
        service: spec.service,
        cpuCores: spec.cpuCores,
        cpuUsagePct,
        memoryGb: spec.memoryGb,
        memoryUsagePct,
        hourlyCostUsd: spec.hourlyCostUsd,
        wasteUsd,
        optimizationStatus: status,
      },
    });

    records.push(record);
  }

  return records;
}

/**
 * Runs a complete cost optimization analysis, generating an AI report with savings.
 */
export async function generateOptimizationReport() {
  const latestRecords = await computeResourceCosts();

  const totalHourlyCost = SERVICE_CATALOG.reduce((sum, s) => sum + s.hourlyCostUsd, 0);
  const totalMonthlyCostUsd = +(totalHourlyCost * 24 * 30).toFixed(2); // 720h / mo

  const totalHourlyWaste = latestRecords.reduce((sum, r) => sum + r.wasteUsd, 0);
  const projectedSavingsUsd = +(totalHourlyWaste * 24 * 30 * 0.65).toFixed(2); // Assume 65% recoverable waste
  const savingsPct = +((projectedSavingsUsd / totalMonthlyCostUsd) * 100).toFixed(1);

  let recommendations: RecommendationItem[] = [];
  let modelUsed = 'mock';

  if (isAiConfigured && openaiClient) {
    try {
      const prompt = `Analyze this cloud service resource cost and utilization data:
${JSON.stringify(latestRecords, null, 2)}
Total Monthly Spend: $${totalMonthlyCostUsd}
Projected Recoverable Waste: $${projectedSavingsUsd} (${savingsPct}%)

Provide actionable cost optimization recommendations in JSON format:
{
  "recommendations": [
    {
      "service": "service-name",
      "action": "clear concise recommendation action",
      "estimatedSavingUsd": 120,
      "priority": "P1"
    }
  ]
}`;

      const completion = await openaiClient.chat.completions.create({
        model: DEPLOYMENT,
        messages: [
          { role: 'system', content: 'You are an AWS/Azure Cloud Financial Operations (FinOps) AI specialist. Respond ONLY with valid JSON.' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.3,
        response_format: { type: 'json_object' },
      });

      const raw = completion.choices[0]?.message?.content ?? '{}';
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed.recommendations)) {
        recommendations = parsed.recommendations;
        modelUsed = DEPLOYMENT;
      }
    } catch {
      // Fallback to mock logic below if API fails
    }
  }

  if (recommendations.length === 0) {
    // Generate intelligent mock recommendations
    for (const r of latestRecords) {
      if (r.optimizationStatus === 'WASTEFUL' || r.optimizationStatus === 'OVERPROVISIONED') {
        const monthlyWaste = Math.round(r.wasteUsd * 24 * 30 * 0.7);
        if (r.service === 'backend-api') {
          recommendations.push({
            service: 'backend-api',
            action: 'Downsize CPU from 2.0 to 1.0 cores & enable Horizontal Pod Autoscaling (HPA) during off-peak hours.',
            estimatedSavingUsd: Math.max(35, monthlyWaste),
            priority: 'P1',
          });
        } else if (r.service === 'redis-cache') {
          recommendations.push({
            service: 'redis-cache',
            action: 'Reduce memory allocation from 8GB to 4GB and enable maxmemory-policy allkeys-lru eviction.',
            estimatedSavingUsd: Math.max(25, monthlyWaste),
            priority: 'P2',
          });
        } else if (r.service === 'postgres-db') {
          recommendations.push({
            service: 'postgres-db',
            action: 'Switch to Azure/AWS Burstable instance class (Standard_B2ms / t4g.medium) for non-production environments.',
            estimatedSavingUsd: Math.max(85, monthlyWaste),
            priority: 'P1',
          });
        } else if (r.service === 'prometheus-mon') {
          recommendations.push({
            service: 'prometheus-mon',
            action: 'Reduce Prometheus metrics retention window from 30 days to 7 days and compress WAL storage block size.',
            estimatedSavingUsd: Math.max(40, monthlyWaste),
            priority: 'P3',
          });
        }
      }
    }

    if (recommendations.length === 0) {
      recommendations.push({
        service: 'backend-api',
        action: 'Enable Kubernetes HPA with target CPU threshold at 75%.',
        estimatedSavingUsd: 28,
        priority: 'P3',
      });
    }
  }

  const report = await db.costOptimizationReport.create({
    data: {
      totalMonthlyCostUsd,
      projectedSavingsUsd,
      savingsPct,
      recommendations: JSON.stringify(recommendations),
      model: modelUsed,
    },
  });

  return { report, latestRecords, recommendations };
}
