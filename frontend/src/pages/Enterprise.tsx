import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';

interface AuditLog {
  id: string;
  userId?: string;
  userEmail: string;
  action: string;
  resourceTarget: string;
  details?: string;
  ipAddress: string;
  createdAt: string;
}

interface UserItem {
  id: string;
  email: string;
  name?: string;
  role: 'USER' | 'OPERATOR' | 'ADMIN';
  isActive: boolean;
  createdAt: string;
}

interface SystemConfig {
  id: string;
  clusterName: string;
  environment: string;
  retentionDays: number;
  slackWebhookUrl: string;
  pagerDutyIntegrationKey: string;
  autoRemediationEnabled: boolean;
  maxChaosDurationSec: number;
  updatedBy: string;
  updatedAt: string;
}

interface Diagnostics {
  status: string;
  uptimeSec: number;
  database: { status: string; pingMs: number; provider: string };
  redis: { status: string; keyCount: number };
  process: { nodeVersion: string; memoryRssMb: number; heapUsedMb: number; heapTotalMb: number };
  timestamp: string;
}

const ROLE_BADGE: Record<string, string> = {
  ADMIN: 'badge-red font-bold',
  OPERATOR: 'badge-yellow font-bold',
  USER: 'badge-slate',
};

export default function Enterprise() {
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState<'audit' | 'rbac' | 'settings' | 'diagnostics'>('audit');
  const [auditFilter, setAuditFilter] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Queries
  const { data: auditLogs = [], isLoading: auditLoading } = useQuery<AuditLog[]>({
    queryKey: ['enterprise-audit-logs'],
    queryFn: () => api.get('/enterprise/audit-logs').then((r) => r.data),
    refetchInterval: 10000,
  });

  const { data: users = [], isLoading: usersLoading } = useQuery<UserItem[]>({
    queryKey: ['enterprise-users'],
    queryFn: () => api.get('/enterprise/users').then((r) => r.data),
    refetchInterval: 15000,
  });

  const { data: config } = useQuery<SystemConfig>({
    queryKey: ['enterprise-config'],
    queryFn: () => api.get('/enterprise/config').then((r) => r.data),
  });

  const { data: diagnostics } = useQuery<Diagnostics>({
    queryKey: ['enterprise-diagnostics'],
    queryFn: () => api.get('/enterprise/diagnostics').then((r) => r.data),
    refetchInterval: 5000,
  });

  // Settings state
  const [formData, setFormData] = useState<Partial<SystemConfig>>({});

  const updateRole = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: string }) =>
      api.post('/enterprise/users/role', { userId, role }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['enterprise-users'] }),
  });

  const saveConfig = useMutation({
    mutationFn: (body: object) => api.put('/enterprise/config', body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['enterprise-config'] });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    },
  });

  const handleSaveConfig = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      clusterName: formData.clusterName ?? config?.clusterName,
      environment: formData.environment ?? config?.environment,
      retentionDays: formData.retentionDays ?? config?.retentionDays,
      slackWebhookUrl: formData.slackWebhookUrl ?? config?.slackWebhookUrl,
      pagerDutyIntegrationKey: formData.pagerDutyIntegrationKey ?? config?.pagerDutyIntegrationKey,
      autoRemediationEnabled: formData.autoRemediationEnabled ?? config?.autoRemediationEnabled,
      maxChaosDurationSec: formData.maxChaosDurationSec ?? config?.maxChaosDurationSec,
    };
    saveConfig.mutate(payload);
  };

  const exportAuditLogs = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(auditLogs, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `aegis_audit_trail_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const filteredAuditLogs = auditLogs.filter(
    (l) =>
      l.action.toLowerCase().includes(auditFilter.toLowerCase()) ||
      l.userEmail.toLowerCase().includes(auditFilter.toLowerCase()) ||
      l.resourceTarget.toLowerCase().includes(auditFilter.toLowerCase())
  );

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight flex items-center gap-2 text-slate-900 dark:text-white">
            🏢 Enterprise Platform Center
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            Multi-tenant RBAC permissions, audit log trail, cluster environment settings, and system health diagnostics.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="badge badge-green text-xs flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            {config?.clusterName ?? 'Aegis-Prod-Cluster'} · {config?.environment ?? 'PRODUCTION'}
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 gap-2 font-semibold text-sm">
        {[
          { id: 'audit', label: '🛡️ Audit Trail Log' },
          { id: 'rbac', label: '👥 User RBAC & Teams' },
          { id: 'settings', label: '⚙️ Platform Settings' },
          { id: 'diagnostics', label: '🩺 System Diagnostics' },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id as any)}
            className={`px-4 py-2.5 border-b-2 transition-colors ${
              activeTab === t.id
                ? 'border-brand-500 text-brand-500 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-white'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── TAB 1: Audit Log Trail ────────────────────────────────────────────── */}
      {activeTab === 'audit' && (
        <div className="card space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200/80 dark:border-slate-800">
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              🛡️ Audit Trail Events
            </h2>
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Filter by action or user…"
                value={auditFilter}
                onChange={(e) => setAuditFilter(e.target.value)}
                className="input text-xs w-48"
              />
              <button
                onClick={exportAuditLogs}
                className="btn-primary text-xs flex items-center gap-1.5 whitespace-nowrap"
              >
                📥 Export JSON Report
              </button>
            </div>
          </div>

          {auditLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => <div key={i} className="h-12 bg-slate-100 dark:bg-surface-850 animate-pulse rounded-xl" />)}
            </div>
          ) : filteredAuditLogs.length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-xs font-mono">
              No audit log entries recorded matching filter.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead>
                  <tr className="border-b border-slate-200/80 dark:border-slate-800 text-slate-500 uppercase font-bold text-[10px]">
                    <th className="py-2.5 px-3">Timestamp</th>
                    <th className="py-2.5 px-3">User</th>
                    <th className="py-2.5 px-3">Action</th>
                    <th className="py-2.5 px-3">Resource Target</th>
                    <th className="py-2.5 px-3">IP Address</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/60 dark:divide-slate-800/60">
                  {filteredAuditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-100/50 dark:hover:bg-surface-850/50">
                      <td className="py-2.5 px-3 text-slate-500 font-mono">
                        {new Date(log.createdAt).toLocaleString()}
                      </td>
                      <td className="py-2.5 px-3 font-bold text-slate-900 dark:text-white">
                        {log.userEmail}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="badge badge-blue text-[10px]">{log.action}</span>
                      </td>
                      <td className="py-2.5 px-3 text-brand-400 font-bold">
                        {log.resourceTarget}
                      </td>
                      <td className="py-2.5 px-3 text-slate-500">
                        {log.ipAddress ?? '127.0.0.1'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── TAB 2: RBAC & User Management ───────────────────────────────────── */}
      {activeTab === 'rbac' && (
        <div className="card space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200/80 dark:border-slate-800">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                👥 User Management &amp; Role-Based Access Control (RBAC)
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">Manage team member roles and operational permission boundaries.</p>
            </div>
            <span className="text-xs font-mono text-slate-500">{users.length} registered users</span>
          </div>

          {usersLoading ? (
            <div className="space-y-2">
              {[1, 2].map((i) => <div key={i} className="h-16 bg-slate-100 dark:bg-surface-850 animate-pulse rounded-xl" />)}
            </div>
          ) : (
            <div className="space-y-3">
              {users.map((u) => (
                <div
                  key={u.id}
                  className="p-4 rounded-xl bg-slate-100/60 dark:bg-surface-850 border border-slate-200/80 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold text-slate-900 dark:text-white">{u.email}</p>
                      <span className={`badge ${ROLE_BADGE[u.role] ?? 'badge-slate'} text-[10px]`}>
                        {u.role}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 font-mono">
                      Joined: {new Date(u.createdAt).toLocaleDateString()}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500 font-medium mr-1">Promote role:</span>
                    {(['USER', 'OPERATOR', 'ADMIN'] as const).map((r) => (
                      <button
                        key={r}
                        onClick={() => updateRole.mutate({ userId: u.id, role: r })}
                        disabled={u.role === r || updateRole.isPending}
                        className={`text-xs px-2.5 py-1 rounded-lg font-bold transition-all ${
                          u.role === r
                            ? 'bg-slate-300 dark:bg-slate-700 text-slate-500 opacity-50 cursor-default'
                            : 'bg-brand-500/10 border border-brand-500/30 text-brand-400 hover:bg-brand-500/20'
                        }`}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── TAB 3: Platform Settings ────────────────────────────────────────── */}
      {activeTab === 'settings' && (
        <form onSubmit={handleSaveConfig} className="card space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200/80 dark:border-slate-800">
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              ⚙️ Multi-Cluster &amp; Platform Settings
            </h2>
            {saveSuccess && (
              <span className="text-xs text-emerald-400 font-bold animate-fade-in">
                ✅ Settings saved successfully!
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">Cluster Environment Name</label>
              <input
                type="text"
                defaultValue={config?.clusterName ?? 'Aegis-Prod-Cluster-01'}
                onChange={(e) => setFormData((p) => ({ ...p, clusterName: e.target.value }))}
                className="input"
              />
            </div>

            <div>
              <label className="label">Environment Type</label>
              <select
                defaultValue={config?.environment ?? 'PRODUCTION'}
                onChange={(e) => setFormData((p) => ({ ...p, environment: e.target.value }))}
                className="input"
              >
                <option value="PRODUCTION">PRODUCTION</option>
                <option value="STAGING">STAGING</option>
                <option value="DR">DISASTER RECOVERY (DR)</option>
              </select>
            </div>

            <div>
              <label className="label">Audit &amp; Telemetry Retention (Days)</label>
              <input
                type="number"
                defaultValue={config?.retentionDays ?? 90}
                onChange={(e) => setFormData((p) => ({ ...p, retentionDays: Number(e.target.value) }))}
                className="input"
              />
            </div>

            <div>
              <label className="label">Max Chaos Duration Cap (Seconds)</label>
              <input
                type="number"
                defaultValue={config?.maxChaosDurationSec ?? 300}
                onChange={(e) => setFormData((p) => ({ ...p, maxChaosDurationSec: Number(e.target.value) }))}
                className="input"
              />
            </div>

            <div className="md:col-span-2">
              <label className="label">Slack Alert Webhook URL</label>
              <input
                type="text"
                defaultValue={config?.slackWebhookUrl ?? ''}
                onChange={(e) => setFormData((p) => ({ ...p, slackWebhookUrl: e.target.value }))}
                className="input font-mono text-xs"
              />
            </div>

            <div className="md:col-span-2">
              <label className="label">PagerDuty Integration Key</label>
              <input
                type="text"
                defaultValue={config?.pagerDutyIntegrationKey ?? ''}
                onChange={(e) => setFormData((p) => ({ ...p, pagerDutyIntegrationKey: e.target.value }))}
                className="input font-mono text-xs"
              />
            </div>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={saveConfig.isPending}
              className="btn-primary flex items-center gap-2"
            >
              {saveConfig.isPending ? 'Saving…' : '💾 Save Platform Settings'}
            </button>
          </div>
        </form>
      )}

      {/* ── TAB 4: System Diagnostics ──────────────────────────────────────── */}
      {activeTab === 'diagnostics' && diagnostics && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="card space-y-2">
              <span className="text-slate-500 text-xs font-semibold uppercase">Platform Status</span>
              <p className="text-xl font-extrabold text-emerald-400 flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                {diagnostics.status}
              </p>
              <p className="text-[11px] font-mono text-slate-500">Uptime: {diagnostics.uptimeSec}s</p>
            </div>

            <div className="card space-y-2">
              <span className="text-slate-500 text-xs font-semibold uppercase">Database Ping</span>
              <p className="text-xl font-extrabold text-brand-400 font-mono">
                {diagnostics.database.pingMs} ms
              </p>
              <p className="text-[11px] font-mono text-slate-500">{diagnostics.database.provider} · Connected</p>
            </div>

            <div className="card space-y-2">
              <span className="text-slate-500 text-xs font-semibold uppercase">Redis Cache</span>
              <p className="text-xl font-extrabold text-amber-400 font-mono">
                {diagnostics.redis.keyCount} keys
              </p>
              <p className="text-[11px] font-mono text-slate-500">Status: {diagnostics.redis.status}</p>
            </div>

            <div className="card space-y-2">
              <span className="text-slate-500 text-xs font-semibold uppercase">Process RSS</span>
              <p className="text-xl font-extrabold text-violet-400 font-mono">
                {diagnostics.process.memoryRssMb} MB
              </p>
              <p className="text-[11px] font-mono text-slate-500">Heap: {diagnostics.process.heapUsedMb} / {diagnostics.process.heapTotalMb} MB</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
