import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../lib/auth';
import api from '../lib/api';

interface HealthStatus {
  status: string;
  checks?: { database: string; redis: string };
}

interface StatCard {
  label: string;
  value: string;
  badge: string;
  color: string;
}

const STATS: StatCard[] = [
  { label: 'Active Incidents',   value: '0',    badge: 'Live',   color: 'badge-green'  },
  { label: 'Services Running',   value: '—',    badge: 'Week 5', color: 'badge-blue'   },
  { label: 'Chaos Experiments',  value: '—',    badge: 'Week 5', color: 'badge-yellow' },
  { label: 'AI Remediations',    value: '—',    badge: 'Week 7', color: 'badge-blue'   },
];

export default function Dashboard() {
  const { user } = useAuth();

  const { data: health, isLoading } = useQuery<HealthStatus>({
    queryKey: ['health'],
    queryFn: async () => (await api.get<HealthStatus>('/health/ready')).data,
    refetchInterval: 10_000,
  });

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
          {isLoading ? 'Checking…' : health?.status === 'ready' ? 'All Systems Operational' : 'Degraded'}
        </span>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {STATS.map(({ label, value, badge, color }) => (
          <div key={label} className="card">
            <div className="flex items-start justify-between mb-3">
              <p className="text-slate-400 text-xs">{label}</p>
              <span className={`badge ${color}`}>{badge}</span>
            </div>
            <p className="text-2xl font-bold text-slate-100">{value}</p>
          </div>
        ))}
      </div>

      {/* System health detail */}
      <div className="card">
        <h2 className="text-sm font-semibold text-slate-300 mb-4">System Health</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {[
            { name: 'API Server',  status: health?.status === 'ready' ? 'ok' : 'unknown' },
            { name: 'Database',    status: health?.checks?.database ?? 'unknown' },
            { name: 'Redis',       status: health?.checks?.redis    ?? 'unknown' },
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
        <div className="grid grid-cols-5 gap-2 sm:grid-cols-8 lg:grid-cols-15">
          {Array.from({ length: 15 }, (_, i) => {
            const level = i + 1;
            const done = level === 1;
            return (
              <div
                key={level}
                title={`Level ${level}`}
                className={`aspect-square rounded-lg flex items-center justify-center text-xs font-bold transition-colors ${
                  done
                    ? 'bg-brand-600 text-white'
                    : 'bg-surface-700 text-slate-600'
                }`}
              >
                {level}
              </div>
            );
          })}
        </div>
        <p className="text-slate-500 text-xs mt-3">Level 1 — Foundation complete · 14 levels remaining</p>
      </div>
    </div>
  );
}
