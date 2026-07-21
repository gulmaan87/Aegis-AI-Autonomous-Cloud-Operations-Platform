import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';

// ── Types ─────────────────────────────────────────────────────────────────────
type RemediationType = 'STOP_CHAOS_EXPERIMENT' | 'CLEAR_REDIS_FLAGS' | 'RESTART_CONTAINER' | 'SCALE_SERVICE';
type RunStatus = 'PENDING' | 'RUNNING' | 'SUCCESS' | 'FAILED';

interface Policy {
  id: string;
  alertName: string;
  actionType: RemediationType;
  isEnabled: boolean;
  cooldownSec: number;
  lastTriggeredAt: string | null;
  createdAt: string;
}

interface Run {
  id: string;
  policyId: string;
  policy: Policy;
  incidentId: string | null;
  incident: { id: string; title: string; status: string; severity: string } | null;
  status: RunStatus;
  logs: string;
  createdAt: string;
  completedAt: string | null;
}

const ACTION_LABELS: Record<RemediationType, string> = {
  STOP_CHAOS_EXPERIMENT: '🛑 Stop Active Chaos Experiment',
  CLEAR_REDIS_FLAGS: '🧹 Clear Redis Stress Flags',
  RESTART_CONTAINER: '🔄 Hot-Restart API Container',
  SCALE_SERVICE: '📈 Scale Backend Replicas (AKS)',
};

const RUN_STATUS_BADGE: Record<RunStatus, string> = {
  PENDING: 'badge bg-slate-500/20 text-slate-400',
  RUNNING: 'badge badge-yellow animate-pulse',
  SUCCESS: 'badge badge-green',
  FAILED: 'badge badge-red',
};

function formatTime(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString();
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

// ── Policy Config Card ────────────────────────────────────────────────────────
function PolicyCard({ policy }: { policy: Policy }) {
  const qc = useQueryClient();
  const [cooldown, setCooldown] = useState(policy.cooldownSec);
  const [isEditingCooldown, setIsEditingCooldown] = useState(false);

  const updatePolicy = useMutation({
    mutationFn: (updates: { isEnabled?: boolean; cooldownSec?: number }) =>
      api.patch(`/self-healing/policies/${policy.id}`, updates),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['self-healing-policies'] });
    },
  });

  const handleToggle = () => {
    updatePolicy.mutate({ isEnabled: !policy.isEnabled });
  };

  const handleSaveCooldown = () => {
    updatePolicy.mutate({ cooldownSec: cooldown });
    setIsEditingCooldown(false);
  };

  return (
    <div className="bg-surface-700 border border-white/5 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div className="space-y-1.5 flex-1">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-100">{policy.alertName}</span>
          <span className={`badge ${policy.isEnabled ? 'badge-green' : 'bg-slate-500/20 text-slate-500'}`}>
            {policy.isEnabled ? 'ENABLED' : 'DISABLED'}
          </span>
        </div>
        <p className="text-xs text-brand-400 font-medium">{ACTION_LABELS[policy.actionType]}</p>
        <div className="text-[11px] text-slate-400 flex items-center gap-4">
          <span>
            Last Triggered: <span className="text-slate-300">{formatTime(policy.lastTriggeredAt)}</span>
          </span>
          <div className="flex items-center gap-1">
            <span>Cooldown:</span>
            {isEditingCooldown ? (
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  value={cooldown}
                  onChange={(e) => setCooldown(parseInt(e.target.value) || 10)}
                  className="w-16 bg-surface-800 border border-white/10 rounded px-1 text-[11px] text-slate-200 focus:outline-none"
                  min={10}
                  max={3600}
                />
                <button
                  onClick={handleSaveCooldown}
                  className="text-emerald-400 hover:text-emerald-300"
                >
                  ✓
                </button>
                <button
                  onClick={() => {
                    setCooldown(policy.cooldownSec);
                    setIsEditingCooldown(false);
                  }}
                  className="text-red-400 hover:text-red-300"
                >
                  ✕
                </button>
              </div>
            ) : (
              <span
                onClick={() => setIsEditingCooldown(true)}
                className="text-slate-300 underline decoration-dotted cursor-pointer hover:text-white"
              >
                {policy.cooldownSec}s
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-end">
        <button
          onClick={handleToggle}
          disabled={updatePolicy.isPending}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
            policy.isEnabled
              ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
              : 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30'
          }`}
        >
          {policy.isEnabled ? 'Disable' : 'Enable'}
        </button>
      </div>
    </div>
  );
}

// ── Main Page Component ───────────────────────────────────────────────────────
export default function SelfHealing() {
  const [expandedRun, setExpandedRun] = useState<string | null>(null);

  const { data: policies = [], isLoading: policiesLoading } = useQuery<Policy[]>({
    queryKey: ['self-healing-policies'],
    queryFn: async () => (await api.get('/self-healing/policies')).data,
    refetchInterval: 10_000,
  });

  const { data: runs = [], isLoading: runsLoading } = useQuery<Run[]>({
    queryKey: ['self-healing-runs'],
    queryFn: async () => (await api.get('/self-healing/runs')).data,
    refetchInterval: 5000,
  });

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
          <span>🛡️</span> Auto-Healing Operations
        </h1>
        <p className="text-slate-400 text-sm mt-0.5">
          Configure remediation policies that execute automatically to heal the infrastructure when Prometheus alerts fire.
        </p>
      </div>

      {/* Grid: Policies Left, Execution Logs Right */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Left Column: Remediation Policies */}
        <div className="xl:col-span-2 space-y-4">
          <div className="card">
            <h2 className="text-sm font-semibold text-slate-300 mb-4 flex items-center gap-2">
              <span>⚙️</span> Remediation Policies
            </h2>

            {policiesLoading ? (
              <p className="text-slate-500 text-sm text-center py-6">Loading policies...</p>
            ) : policies.length === 0 ? (
              <p className="text-slate-500 text-sm text-center py-6">No policies seeded. Restart application to seed defaults.</p>
            ) : (
              <div className="space-y-3">
                {policies.map((policy) => (
                  <PolicyCard key={policy.id} policy={policy} />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Execution Runs */}
        <div className="xl:col-span-1 space-y-4">
          <div className="card h-full flex flex-col min-h-[500px]">
            <h2 className="text-sm font-semibold text-slate-300 mb-4 flex items-center gap-2">
              <span>📊</span> Mitigation Execution History
            </h2>

            {runsLoading ? (
              <p className="text-slate-500 text-sm text-center py-6">Loading runs history...</p>
            ) : runs.length === 0 ? (
              <p className="text-slate-500 text-xs text-center py-10 text-slate-500">
                No self-healing operations executed yet. Firing alerts will trigger auto-mitigation events.
              </p>
            ) : (
              <div className="space-y-3 flex-1 overflow-y-auto max-h-[600px] scrollbar pr-1">
                {runs.map((run) => {
                  const isExpanded = expandedRun === run.id;
                  return (
                    <div
                      key={run.id}
                      className="border border-white/5 rounded-xl bg-surface-700 hover:border-white/10 transition-all overflow-hidden"
                    >
                      {/* Run Summary Row */}
                      <button
                        onClick={() => setExpandedRun(isExpanded ? null : run.id)}
                        className="w-full text-left p-3.5 flex flex-col gap-1.5 focus:outline-none"
                      >
                        <div className="flex items-center justify-between">
                          <span className={RUN_STATUS_BADGE[run.status]}>{run.status}</span>
                          <span className="text-[10px] text-slate-500">{timeAgo(run.createdAt)}</span>
                        </div>
                        <p className="text-xs font-semibold text-slate-200 truncate">
                          {run.policy.alertName}
                        </p>
                        <p className="text-[10px] text-brand-400 font-medium">
                          {ACTION_LABELS[run.policy.actionType]}
                        </p>
                        {run.incident && (
                          <p className="text-[9px] text-slate-400 mt-1 truncate">
                            Linked Incident: {run.incident.title}
                          </p>
                        )}
                      </button>

                      {/* Expanded Log Console */}
                      {isExpanded && (
                        <div className="border-t border-white/5 bg-surface-900/60 p-3 space-y-2">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                            Execution Logs
                          </p>
                          <pre className="bg-surface-900 border border-white/5 font-mono text-[9px] leading-relaxed rounded-lg p-2.5 text-slate-300 overflow-x-auto whitespace-pre-wrap max-h-48 overflow-y-auto scrollbar">
                            {run.logs}
                          </pre>
                          {run.completedAt && (
                            <div className="text-[9px] text-slate-500 flex justify-between">
                              <span>Completed</span>
                              <span>{formatTime(run.completedAt)}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
