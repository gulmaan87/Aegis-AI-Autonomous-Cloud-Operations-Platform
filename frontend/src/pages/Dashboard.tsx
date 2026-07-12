import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../lib/auth';
import api from '../lib/api';

interface HealthStatus {
  status: string;
  checks?: { database: string; redis: string };
}

interface DashboardStats {
  openIncidents: number;
  totalExperiments: number;
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

  const statCards = [
    { label: 'Open Incidents',      value: stats ? String(stats.openIncidents)   : '—', badge: 'Live',   color: stats?.openIncidents ? 'badge-red'   : 'badge-green' },
    { label: 'Chaos Experiments',   value: stats ? String(stats.totalExperiments) : '—', badge: 'Live',   color: 'badge-yellow' },
    { label: 'AI Remediations',     value: '—',                                          badge: 'Week 7', color: 'badge-blue'   },
    { label: 'Cost Savings (USD)',   value: '—',                                          badge: 'Week 8', color: 'badge-blue'   },
  ];

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
            const done = level <= 2;
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
