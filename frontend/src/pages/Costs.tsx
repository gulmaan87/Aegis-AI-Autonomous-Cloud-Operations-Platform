import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';

type OptimizationStatus = 'OPTIMAL' | 'UNDERUTILIZED' | 'OVERPROVISIONED' | 'WASTEFUL';

interface ResourceCostRecord {
  id: string;
  service: string;
  cpuCores: number;
  cpuUsagePct: number;
  memoryGb: number;
  memoryUsagePct: number;
  hourlyCostUsd: number;
  wasteUsd: number;
  optimizationStatus: OptimizationStatus;
  timestamp: string;
}

interface RecommendationItem {
  service: string;
  action: string;
  estimatedSavingUsd: number;
  priority: 'P1' | 'P2' | 'P3';
}

interface CostOptimizationReport {
  id: string;
  totalMonthlyCostUsd: number;
  projectedSavingsUsd: number;
  savingsPct: number;
  recommendations: string; // JSON string
  model: string;
  createdAt: string;
}

const STATUS_BADGE: Record<OptimizationStatus, string> = {
  OPTIMAL:         'badge badge-green',
  UNDERUTILIZED:   'badge badge-yellow',
  OVERPROVISIONED: 'badge badge-blue',
  WASTEFUL:        'badge badge-red',
};

const PRIORITY_BADGE: Record<'P1' | 'P2' | 'P3', string> = {
  P1: 'badge badge-red',
  P2: 'badge badge-yellow',
  P3: 'badge badge-blue',
};

export default function Costs() {
  const queryClient = useQueryClient();
  const [analyzing, setAnalyzing] = useState(false);

  const { data: resources = [], isLoading: loadingResources } = useQuery<ResourceCostRecord[]>({
    queryKey: ['costs-resources'],
    queryFn: async () => (await api.get('/costs/resources')).data,
    refetchInterval: 10000,
  });

  const { data: reports = [], isLoading: loadingReports } = useQuery<CostOptimizationReport[]>({
    queryKey: ['costs-reports'],
    queryFn: async () => (await api.get('/costs/reports')).data,
    refetchInterval: 10000,
  });

  const analyzeMutation = useMutation({
    mutationFn: async () => (await api.post('/costs/analyze')).data,
    onMutate: () => setAnalyzing(true),
    onSettled: () => {
      setAnalyzing(false);
      queryClient.invalidateQueries({ queryKey: ['costs-resources'] });
      queryClient.invalidateQueries({ queryKey: ['costs-reports'] });
    },
  });

  const latestReport = reports[0];

  const recommendations: RecommendationItem[] = latestReport
    ? (() => {
        try {
          return JSON.parse(latestReport.recommendations);
        } catch {
          return [];
        }
      })()
    : [];

  const totalMonthlyCost = latestReport?.totalMonthlyCostUsd ?? 0;
  const projectedSavings = latestReport?.projectedSavingsUsd ?? 0;
  const savingsPct       = latestReport?.savingsPct ?? 0;

  const totalMonthlyWaste = resources.reduce((acc, r) => acc + (r.wasteUsd * 24 * 30), 0);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight flex items-center gap-2 text-slate-900 dark:text-white">
            <span>💰 Cost &amp; Resource Optimization AI</span>
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            Real-time cloud resource FinOps analytics, waste identification, and automated cost reduction recommendations.
          </p>
        </div>

        <button
          onClick={() => analyzeMutation.mutate()}
          disabled={analyzing}
          className="btn-primary self-start sm:self-auto flex items-center gap-2 text-sm"
        >
          {analyzing ? (
            <>
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin inline-block" />
              Analyzing FinOps Data…
            </>
          ) : (
            <>
              <span>⚡ Run Cost Analysis</span>
            </>
          )}
        </button>
      </div>

      {/* Metrics Summary Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card">
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Total Monthly Cost
          </p>
          <p className="text-3xl font-extrabold mt-2 text-slate-900 dark:text-white">
            ${totalMonthlyCost.toLocaleString()} <span className="text-xs font-normal text-slate-500">/mo</span>
          </p>
          <p className="text-xs text-slate-500 mt-1">Based on 5 active workload specs</p>
        </div>

        <div className="card">
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Projected Savings
          </p>
          <p className="text-3xl font-extrabold mt-2 text-emerald-600 dark:text-emerald-400">
            ${projectedSavings.toLocaleString()} <span className="text-sm font-semibold">({savingsPct}%)</span>
          </p>
          <p className="text-xs text-slate-500 mt-1">Recoverable idle resource budget</p>
        </div>

        <div className="card">
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Detected Monthly Waste
          </p>
          <p className="text-3xl font-extrabold mt-2 text-amber-600 dark:text-amber-400">
            ${Math.round(totalMonthlyWaste).toLocaleString()} <span className="text-xs font-normal text-slate-500">/mo</span>
          </p>
          <p className="text-xs text-slate-500 mt-1">Unutilized allocated capacity</p>
        </div>

        <div className="card">
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Analyzed Workloads
          </p>
          <p className="text-3xl font-extrabold mt-2 text-brand-600 dark:text-brand-400">
            {resources.length}
          </p>
          <p className="text-xs text-slate-500 mt-1">Services continuously monitored</p>
        </div>
      </div>

      {/* AI FinOps Optimization Recommendations */}
      <div className="card space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-200/80 dark:border-slate-800">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span>🤖 AI Cost Reduction Recommendations</span>
            </h2>
            <p className="text-xs text-slate-500">
              Engineered by Aegis FinOps AI ({latestReport?.model ?? 'mock engine'})
            </p>
          </div>
          {latestReport && (
            <span className="text-xs font-mono text-slate-500">
              Updated: {new Date(latestReport.createdAt).toLocaleTimeString()}
            </span>
          )}
        </div>

        {loadingReports ? (
          <div className="py-8 text-center text-slate-500">
            <span className="inline-block w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin mb-2" />
            <p>Evaluating cluster resource waste and generating recommendations…</p>
          </div>
        ) : recommendations.length === 0 ? (
          <div className="py-8 text-center text-slate-500 text-sm">
            All workloads are currently operating at optimal efficiency! Click "Run Cost Analysis" to re-evaluate.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {recommendations.map((item, idx) => (
              <div
                key={idx}
                className="p-4 rounded-xl bg-slate-100/60 dark:bg-surface-850 border border-slate-200/80 dark:border-slate-800 space-y-3 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 dark:text-white text-sm">
                      {item.service}
                    </span>
                    <span className={PRIORITY_BADGE[item.priority]}>
                      Priority {item.priority}
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-2 leading-relaxed">
                    {item.action}
                  </p>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-200/60 dark:border-slate-800">
                  <span className="text-xs font-semibold text-slate-500">
                    Est. Savings:
                  </span>
                  <span className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400 font-mono">
                    +${item.estimatedSavingUsd}/mo
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Per-Service Resource Utilization Table */}
      <div className="card">
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-200/80 dark:border-slate-800">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">
            Per-Service Resource Utilization &amp; Waste Breakdown
          </h2>
          <span className="text-xs text-slate-500 font-mono">
            Auto-refreshes every 10s
          </span>
        </div>

        {loadingResources ? (
          <div className="py-12 text-center text-slate-500">
            <span className="inline-block w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin mb-2" />
            <p>Fetching workload cost records…</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200/80 dark:border-slate-800 text-xs font-bold uppercase tracking-wider text-slate-500">
                  <th className="pb-3 px-2">Workload Service</th>
                  <th className="pb-3 px-2">Allocated Specs</th>
                  <th className="pb-3 px-2">CPU Utilization</th>
                  <th className="pb-3 px-2">Memory Utilization</th>
                  <th className="pb-3 px-2">Monthly Cost</th>
                  <th className="pb-3 px-2">Monthly Waste</th>
                  <th className="pb-3 px-2">Efficiency Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/60 dark:divide-slate-800/60">
                {resources.map((item) => {
                  const monthlyCost = +(item.hourlyCostUsd * 24 * 30).toFixed(2);
                  const monthlyWaste = +(item.wasteUsd * 24 * 30).toFixed(2);

                  return (
                    <tr key={item.id} className="hover:bg-slate-100/50 dark:hover:bg-slate-800/30 transition-colors">
                      <td className="py-4 px-2">
                        <p className="font-bold text-slate-900 dark:text-white">{item.service}</p>
                      </td>

                      <td className="py-4 px-2 font-mono text-xs text-slate-600 dark:text-slate-300">
                        {item.cpuCores} Cores · {item.memoryGb} GB RAM
                      </td>

                      <td className="py-4 px-2">
                        <div className="flex items-center gap-2">
                          <div className="w-20 bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full ${
                                item.cpuUsagePct > 80
                                  ? 'bg-rose-500'
                                  : item.cpuUsagePct < 25
                                  ? 'bg-amber-500'
                                  : 'bg-emerald-500'
                              }`}
                              style={{ width: `${Math.min(100, item.cpuUsagePct)}%` }}
                            />
                          </div>
                          <span className="text-xs font-mono font-semibold text-slate-700 dark:text-slate-300">
                            {item.cpuUsagePct}%
                          </span>
                        </div>
                      </td>

                      <td className="py-4 px-2">
                        <div className="flex items-center gap-2">
                          <div className="w-20 bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full ${
                                item.memoryUsagePct > 80
                                  ? 'bg-rose-500'
                                  : item.memoryUsagePct < 30
                                  ? 'bg-amber-500'
                                  : 'bg-emerald-500'
                              }`}
                              style={{ width: `${Math.min(100, item.memoryUsagePct)}%` }}
                            />
                          </div>
                          <span className="text-xs font-mono font-semibold text-slate-700 dark:text-slate-300">
                            {item.memoryUsagePct}%
                          </span>
                        </div>
                      </td>

                      <td className="py-4 px-2 font-mono font-bold text-slate-900 dark:text-slate-100">
                        ${monthlyCost}
                      </td>

                      <td className="py-4 px-2 font-mono font-bold text-amber-600 dark:text-amber-400">
                        ${monthlyWaste}
                      </td>

                      <td className="py-4 px-2">
                        <span className={STATUS_BADGE[item.optimizationStatus]}>
                          {item.optimizationStatus}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
