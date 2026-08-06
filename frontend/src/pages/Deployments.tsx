import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';

type DeploymentStatus = 'PENDING' | 'DEPLOYING' | 'CANARY_TESTING' | 'HEALTHY' | 'DEGRADED' | 'ROLLED_BACK' | 'FAILED';

interface HealthCheckItem {
  id: string;
  checkName: string;
  status: 'PASSED' | 'FAILED';
  message: string;
  timestamp: string;
}

interface DeploymentRecord {
  id: string;
  service: string;
  version: string;
  previousVersion: string;
  gitCommit: string;
  deployedBy: string;
  status: DeploymentStatus;
  canaryErrorRate: number;
  canaryLatencyP99: number;
  rollbackReason?: string;
  healthChecks: HealthCheckItem[];
  createdAt: string;
}

const STATUS_BADGE: Record<DeploymentStatus, string> = {
  HEALTHY:        'badge badge-green',
  CANARY_TESTING: 'badge badge-blue animate-pulse',
  DEGRADED:       'badge badge-yellow',
  ROLLED_BACK:    'badge badge-red',
  FAILED:         'badge bg-rose-600/30 text-rose-300 font-bold',
  PENDING:        'badge badge-yellow',
  DEPLOYING:      'badge badge-blue',
};

export default function Deployments() {
  const queryClient = useQueryClient();
  const [showDeployModal, setShowDeployModal] = useState(false);
  const [selectedDeployment, setSelectedDeployment] = useState<DeploymentRecord | null>(null);

  const [service, setService] = useState('backend-api');
  const [version, setVersion] = useState('v2.5.0');
  const [gitCommit, setGitCommit] = useState('c89a8e2');

  const { data: deployments = [], isLoading } = useQuery<DeploymentRecord[]>({
    queryKey: ['deployments'],
    queryFn: async () => (await api.get('/deployments')).data,
    refetchInterval: 5000,
  });

  const deployMutation = useMutation({
    mutationFn: async () =>
      (await api.post('/deployments', { service, version, gitCommit })).data,
    onSuccess: () => {
      setShowDeployModal(false);
      queryClient.invalidateQueries({ queryKey: ['deployments'] });
    },
  });

  const evaluateMutation = useMutation({
    mutationFn: async (id: string) =>
      (await api.post(`/deployments/${id}/evaluate`)).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deployments'] });
    },
  });

  const rollbackMutation = useMutation({
    mutationFn: async (id: string) =>
      (await api.post(`/deployments/${id}/rollback`, { reason: 'Operator manual rollback requested' })).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deployments'] });
    },
  });

  const totalDeployments = deployments.length;
  const rolledBackCount = deployments.filter((d) => d.status === 'ROLLED_BACK').length;
  const healthyCount    = deployments.filter((d) => d.status === 'HEALTHY').length;
  const activeCanary    = deployments.find((d) => d.status === 'CANARY_TESTING');

  const passRate = totalDeployments > 0 ? Math.round((healthyCount / totalDeployments) * 100) : 100;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight flex items-center gap-2 text-slate-900 dark:text-white">
            <span>🚀 CI/CD &amp; Automated Rollback Engine</span>
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            Zero-downtime deployment releases, automated canary SLO health checks, and instant rollback automation.
          </p>
        </div>

        <button
          onClick={() => setShowDeployModal(true)}
          className="btn-primary self-start sm:self-auto flex items-center gap-2 text-sm"
        >
          <span>⚡ Deploy New Release</span>
        </button>
      </div>

      {/* Metrics Summary Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card">
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Total Release Deployments
          </p>
          <p className="text-3xl font-extrabold mt-2 text-slate-900 dark:text-white">
            {totalDeployments}
          </p>
          <p className="text-xs text-slate-500 mt-1">Tracked CI/CD release builds</p>
        </div>

        <div className="card">
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Canary Pass Rate
          </p>
          <p className="text-3xl font-extrabold mt-2 text-emerald-600 dark:text-emerald-400">
            {passRate}%
          </p>
          <p className="text-xs text-slate-500 mt-1">Deployments meeting SLO health gates</p>
        </div>

        <div className="card">
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Automated Rollbacks
          </p>
          <p className={`text-3xl font-extrabold mt-2 ${rolledBackCount > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-900 dark:text-white'}`}>
            {rolledBackCount}
          </p>
          <p className="text-xs text-slate-500 mt-1">Zero-downtime regression auto-remediations</p>
        </div>

        <div className="card">
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Active Canary Testing
          </p>
          <div className="mt-2">
            {activeCanary ? (
              <span className="badge badge-blue animate-pulse text-xs font-bold">
                {activeCanary.service} ({activeCanary.version})
              </span>
            ) : (
              <span className="badge badge-green text-xs">
                All Deployments Stable
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-1">Live post-deployment probe status</p>
        </div>
      </div>

      {/* Deployments History & Canary Table */}
      <div className="card">
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-200/80 dark:border-slate-800">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">
            Deployment Release Log &amp; Canary Health Gates
          </h2>
          <span className="text-xs text-slate-500 font-mono">
            Auto-refreshes every 5s
          </span>
        </div>

        {isLoading ? (
          <div className="py-12 text-center text-slate-500">
            <span className="inline-block w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin mb-2" />
            <p>Fetching deployment release logs…</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200/80 dark:border-slate-800 text-xs font-bold uppercase tracking-wider text-slate-500">
                  <th className="pb-3 px-2">Service / Release</th>
                  <th className="pb-3 px-2">Git Commit</th>
                  <th className="pb-3 px-2">Deployed By</th>
                  <th className="pb-3 px-2">Status</th>
                  <th className="pb-3 px-2">Canary Error Rate</th>
                  <th className="pb-3 px-2">Canary P99 Latency</th>
                  <th className="pb-3 px-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/60 dark:divide-slate-800/60">
                {deployments.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-100/50 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="py-4 px-2">
                      <p className="font-bold text-slate-900 dark:text-white">{item.service}</p>
                      <p className="text-xs font-mono text-brand-600 dark:text-brand-400">
                        {item.version} <span className="text-slate-400 font-normal">(from {item.previousVersion})</span>
                      </p>
                    </td>

                    <td className="py-4 px-2 font-mono text-xs text-slate-600 dark:text-slate-300">
                      {item.gitCommit}
                    </td>

                    <td className="py-4 px-2 text-xs text-slate-600 dark:text-slate-300">
                      {item.deployedBy}
                    </td>

                    <td className="py-4 px-2">
                      <span className={STATUS_BADGE[item.status]}>
                        {item.status.replace(/_/g, ' ')}
                      </span>
                    </td>

                    <td className="py-4 px-2 font-mono font-semibold text-slate-900 dark:text-slate-100">
                      <span className={item.canaryErrorRate > 5.0 ? 'text-rose-500 font-bold' : 'text-emerald-500'}>
                        {item.canaryErrorRate}%
                      </span>
                    </td>

                    <td className="py-4 px-2 font-mono font-semibold text-slate-900 dark:text-slate-100">
                      <span className={item.canaryLatencyP99 > 500 ? 'text-rose-500 font-bold' : 'text-emerald-500'}>
                        {item.canaryLatencyP99}ms
                      </span>
                    </td>

                    <td className="py-4 px-2 text-right space-x-2">
                      <button
                        onClick={() => evaluateMutation.mutate(item.id)}
                        disabled={evaluateMutation.isPending}
                        className="text-xs font-semibold text-brand-600 dark:text-brand-400 hover:underline"
                        title="Evaluate live canary health checks"
                      >
                        Evaluate Canary
                      </button>

                      {item.status !== 'ROLLED_BACK' && (
                        <button
                          onClick={() => rollbackMutation.mutate(item.id)}
                          disabled={rollbackMutation.isPending}
                          className="text-xs font-bold text-rose-500 hover:underline"
                        >
                          Rollback
                        </button>
                      )}

                      <button
                        onClick={() => setSelectedDeployment(item)}
                        className="text-xs text-slate-500 hover:underline"
                      >
                        Checks →
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Deploy Release Modal */}
      {showDeployModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-surface-850 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              ⚡ Trigger New Service Deployment
            </h3>

            <div className="space-y-3 text-sm">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Target Service</label>
                <select
                  value={service}
                  onChange={(e) => setService(e.target.value)}
                  className="w-full bg-slate-100 dark:bg-surface-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 text-slate-900 dark:text-white font-medium"
                >
                  <option value="backend-api">backend-api</option>
                  <option value="frontend-nginx">frontend-nginx</option>
                  <option value="gateway-router">gateway-router</option>
                  <option value="redis-cache">redis-cache</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Release Version Tag</label>
                <input
                  type="text"
                  value={version}
                  onChange={(e) => setVersion(e.target.value)}
                  className="w-full bg-slate-100 dark:bg-surface-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 text-slate-900 dark:text-white font-mono"
                  placeholder="v2.5.0"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Git Commit SHA</label>
                <input
                  type="text"
                  value={gitCommit}
                  onChange={(e) => setGitCommit(e.target.value)}
                  className="w-full bg-slate-100 dark:bg-surface-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 text-slate-900 dark:text-white font-mono"
                  placeholder="c89a8e2"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
              <button
                onClick={() => setShowDeployModal(false)}
                className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                onClick={() => deployMutation.mutate()}
                disabled={deployMutation.isPending}
                className="btn-primary text-xs"
              >
                {deployMutation.isPending ? 'Deploying…' : 'Deploy Release'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Canary Health Check Inspector Modal */}
      {selectedDeployment && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-surface-850 rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  Canary Checks: {selectedDeployment.service} ({selectedDeployment.version})
                </h3>
                <p className="text-xs text-slate-500">Status: {selectedDeployment.status}</p>
              </div>
              <button
                onClick={() => setSelectedDeployment(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white font-bold"
              >
                ✕
              </button>
            </div>

            {selectedDeployment.rollbackReason && (
              <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-mono">
                {selectedDeployment.rollbackReason}
              </div>
            )}

            <div className="space-y-2 max-h-60 overflow-y-auto">
              {selectedDeployment.healthChecks.length === 0 ? (
                <p className="text-xs text-slate-500">No health check logs captured yet.</p>
              ) : (
                selectedDeployment.healthChecks.map((check) => (
                  <div key={check.id} className="p-3 rounded-lg bg-slate-100 dark:bg-surface-800 flex items-start justify-between">
                    <div>
                      <p className="font-mono text-xs font-bold text-slate-900 dark:text-white">{check.checkName}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{check.message}</p>
                    </div>
                    <span className={check.status === 'PASSED' ? 'badge badge-green' : 'badge badge-red'}>
                      {check.status}
                    </span>
                  </div>
                ))
              )}
            </div>

            <div className="flex justify-end border-t border-slate-200 dark:border-slate-800 pt-3">
              <button
                onClick={() => setSelectedDeployment(null)}
                className="btn-primary text-xs"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
