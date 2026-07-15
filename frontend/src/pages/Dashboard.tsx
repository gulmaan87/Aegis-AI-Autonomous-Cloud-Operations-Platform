import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../lib/auth';
import api from '../lib/api';
import { Link } from 'react-router-dom';

interface HealthStatus {
  status: string;
  checks?: { database: string; redis: string };
}

interface DashboardStats {
  openIncidents: number;
  totalExperiments: number;
}

interface ChaosStatus {
  active: {
    id: string;
    name: string;
    type: string;
    durationMs: number;
    startedAt: string;
  } | null;
  activeFlags: Record<string, string>;
}

interface Incident {
  id: string;
  title: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  status: 'OPEN' | 'INVESTIGATING' | 'RESOLVED';
  source: 'CHAOS' | 'ALERT';
  createdAt: string;
}

const FLAG_LABELS: Record<string, { label: string; color: string }> = {
  'chaos:latency':         { label: '🐢 High Latency',   color: 'text-amber-400'  },
  'chaos:error_rate':      { label: '💥 Service Errors',  color: 'text-red-400'    },
  'chaos:db_slowdown':     { label: '🗄️ DB Slowdown',     color: 'text-purple-400' },
  'chaos:memory_pressure': { label: '🧠 Memory Pressure', color: 'text-blue-400'   },
};

const SEVERITY_COLOR: Record<string, string> = {
  LOW:      'badge-blue',
  MEDIUM:   'badge-yellow',
  HIGH:     'badge-red',
  CRITICAL: 'bg-red-600/30 text-red-300',
};

function elapsed(startedAt: string) {
  const secs = Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000);
  return secs < 60 ? `${secs}s` : `${Math.floor(secs / 60)}m ${secs % 60}s`;
}

function progress(startedAt: string, durationMs: number) {
  return Math.min(100, Math.round(((Date.now() - new Date(startedAt).getTime()) / durationMs) * 100));
}

function timeAgo(iso: string) {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  return hrs < 24 ? `${hrs}h ago` : `${Math.floor(hrs / 24)}d ago`;
}

export default function Dashboard() {
  const { user } = useAuth();

  const { data: health, isLoading: healthLoading } = useQuery<HealthStatus>({
    queryKey: ['health'],
    queryFn: async () => (await api.get<HealthStatus>('/health/ready')).data,
    refetchInterval: 10_000,
  });

  const { data: stats } = useQuery<DashboardStats>({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const [incidents, experiments] = await Promise.all([
        api.get('/incidents?status=OPEN'),
        api.get('/chaos/experiments'),
      ]);
      return {
        openIncidents: incidents.data.length,
        totalExperiments: experiments.data.length,
      };
    },
    refetchInterval: 5000,
  });

  const { data: chaosStatus } = useQuery<ChaosStatus>({
    queryKey: ['chaos-status'],
    queryFn: async () => (await api.get('/chaos/status')).data,
    refetchInterval: 3000,
  });

  // Recent open incidents (all sources — chaos + alerts)
  const { data: recentIncidents = [] } = useQuery<Incident[]>({
    queryKey: ['dashboard-incidents'],
    queryFn: async () => (await api.get('/incidents', { params: { status: 'OPEN' } })).data,
    refetchInterval: 5000,
    select: (data) => data.slice(0, 5),
  });

  const statCards = [
    { label: 'Open Incidents',     value: stats ? String(stats.openIncidents)   : '—', badge: 'Live',   color: stats?.openIncidents ? 'badge-red' : 'badge-green' },
    { label: 'Chaos Experiments',  value: stats ? String(stats.totalExperiments) : '—', badge: 'Live',   color: 'badge-yellow' },
    { label: 'AI Remediations',    value: '—',                                          badge: 'Week 7', color: 'badge-blue' },
    { label: 'Cost Savings (USD)', value: '—',                                          badge: 'Week 8', color: 'badge-blue' },
  ];

  const activeExp  = chaosStatus?.active ?? null;
  const activeFlags = chaosStatus?.activeFlags ?? {};
  const flagKeys   = Object.keys(activeFlags);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-100">Operations Dashboard</h1>
          <p className="text-slate-400 text-sm mt-0.5">Welcome back, {user?.email}</p>
        </div>
        <span className={`badge ${health?.status === 'ready' ? 'badge-green' : 'badge-red'}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${health?.status === 'ready' ? 'bg-emerald-400' : 'bg-red-400'} animate-pulse`} />
          {healthLoading ? 'Checking…' : health?.status === 'ready' ? 'All Systems Operational' : 'Degraded'}
        </span>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {statCards.map(({ label, value, badge, color }) => (
          <div key={label} className="card">
            <div className="flex items-start justify-between mb-3">
              <p className="text-slate-400 text-xs">{label}</p>
              <span className={`badge ${color}`}>{badge}</span>
            </div>
            <p className="text-2xl font-bold text-slate-100">{value}</p>
          </div>
        ))}
      </div>

      {/* Live Chaos Status */}
      <div className={`card border ${activeExp ? 'border-red-500/30 bg-red-500/5' : 'border-white/8'}`}>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-slate-300">Live Chaos Status</h2>
          {activeExp ? (
            <span className="badge badge-red">
              <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
              RUNNING
            </span>
          ) : (
            <span className="badge badge-green">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              All Clear
            </span>
          )}
        </div>

        {activeExp ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-100">{activeExp.name}</p>
                <p className="text-xs text-slate-400 mt-0.5">
                  {activeExp.type.replace(/_/g, ' ')} · {elapsed(activeExp.startedAt)} elapsed
                </p>
              </div>
              <p className="text-xs text-slate-400">{Math.round(activeExp.durationMs / 1000)}s total</p>
            </div>
            <div className="w-full bg-surface-700 rounded-full h-1.5">
              <div
                className="bg-red-500 h-1.5 rounded-full transition-all duration-1000"
                style={{ width: `${progress(activeExp.startedAt, activeExp.durationMs)}%` }}
              />
            </div>
            {flagKeys.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-1">
                {flagKeys.map((key) => {
                  const meta = FLAG_LABELS[key];
                  return (
                    <span key={key} className={`text-xs font-medium ${meta?.color ?? 'text-slate-400'}`}>
                      {meta?.label ?? key} ({activeFlags[key]}ms)
                    </span>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          <p className="text-slate-500 text-sm">No experiment running. Head to Chaos to launch one.</p>
        )}
      </div>

      {/* Recent Open Incidents */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-slate-300">Recent Open Incidents</h2>
          <Link to="/incidents" className="text-xs text-brand-400 hover:text-brand-300 transition-colors">
            View all →
          </Link>
        </div>
        {recentIncidents.length === 0 ? (
          <p className="text-slate-500 text-sm text-center py-4">
            ✅ No open incidents — system is healthy.
          </p>
        ) : (
          <div className="space-y-2">
            {recentIncidents.map((inc) => (
              <div key={inc.id} className="flex items-center gap-3 bg-surface-700 rounded-lg px-3 py-2.5">
                <span className={`badge ${SEVERITY_COLOR[inc.severity]}`}>{inc.severity}</span>
                <span className="text-xs text-slate-500 flex-shrink-0">
                  {inc.source === 'ALERT' ? '🔔 Alert' : '⚡ Chaos'}
                </span>
                <p className="text-sm text-slate-200 flex-1 truncate">{inc.title}</p>
                <p className="text-xs text-slate-500 flex-shrink-0">{timeAgo(inc.createdAt)}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* System health detail */}
      <div className="card">
        <h2 className="text-sm font-semibold text-slate-300 mb-4">System Health</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {[
            { name: 'API Server', status: health?.status === 'ready' ? 'ok' : 'unknown' },
            { name: 'Database',   status: health?.checks?.database ?? 'unknown' },
            { name: 'Redis',      status: health?.checks?.redis    ?? 'unknown' },
          ].map(({ name, status }) => (
            <div key={name} className="flex items-center gap-3 bg-surface-700 rounded-lg px-3 py-2.5">
              <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
                status === 'ok' ? 'bg-emerald-400' : status === 'error' ? 'bg-red-400' : 'bg-slate-500'
              }`} />
              <div>
                <p className="text-sm text-slate-200">{name}</p>
                <p className={`text-xs capitalize ${
                  status === 'ok' ? 'text-emerald-400' : status === 'error' ? 'text-red-400' : 'text-slate-500'
                }`}>{status}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Roadmap progress */}
      <div className="card">
        <h2 className="text-sm font-semibold text-slate-300 mb-4">15-Level Roadmap</h2>
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: 15 }, (_, i) => {
            const level = i + 1;
            const done  = level <= 2;
            return (
              <div
                key={level}
                title={`Level ${level}`}
                className={`w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold transition-colors ${
                  done ? 'bg-brand-600 text-white' : 'bg-surface-700 text-slate-600'
                }`}
              >
                {level}
              </div>
            );
          })}
        </div>
        <p className="text-slate-500 text-xs mt-3">Levels 1–2 complete · 13 levels remaining</p>
      </div>
    </div>
  );
}
