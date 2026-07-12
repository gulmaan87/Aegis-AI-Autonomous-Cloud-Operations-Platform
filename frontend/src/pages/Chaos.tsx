import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';

type ExperimentType = 'HIGH_CPU' | 'HIGH_LATENCY' | 'SERVICE_ERROR' | 'DB_SLOWDOWN' | 'MEMORY_PRESSURE';
type ExperimentStatus = 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'STOPPED';

interface Experiment {
  id: string;
  name: string;
  type: ExperimentType;
  durationMs: number;
  status: ExperimentStatus;
  startedAt: string | null;
  endedAt: string | null;
  createdAt: string;
  incident?: { id: string; status: string; severity: string } | null;
}

const EXPERIMENT_TYPES: { value: ExperimentType; label: string; description: string; color: string }[] = [
  { value: 'HIGH_LATENCY',     label: '🐢 High Latency',      description: 'Adds 800ms delay to all API responses',  color: 'border-amber-500/40 bg-amber-500/5'   },
  { value: 'SERVICE_ERROR',    label: '💥 Service Errors',     description: 'Returns 500 errors at 40% probability',   color: 'border-red-500/40 bg-red-500/5'       },
  { value: 'HIGH_CPU',         label: '🔥 High CPU',           description: 'Spins CPU to simulate compute pressure',  color: 'border-orange-500/40 bg-orange-500/5' },
  { value: 'DB_SLOWDOWN',      label: '🗄️ DB Slowdown',        description: 'Slows database query responses',          color: 'border-purple-500/40 bg-purple-500/5' },
  { value: 'MEMORY_PRESSURE',  label: '🧠 Memory Pressure',    description: 'Allocates memory to simulate pressure',   color: 'border-blue-500/40 bg-blue-500/5'     },
];

const STATUS_BADGE: Record<ExperimentStatus, string> = {
  PENDING:   'badge badge-yellow',
  RUNNING:   'badge badge-red',
  COMPLETED: 'badge badge-green',
  FAILED:    'badge badge-red',
  STOPPED:   'badge badge-blue',
};

function duration(ms: number) {
  return ms >= 60_000 ? `${ms / 60_000}m` : `${ms / 1000}s`;
}

export default function Chaos() {
  const qc = useQueryClient();
  const [selectedType, setSelectedType] = useState<ExperimentType>('HIGH_LATENCY');
  const [name, setName] = useState('');
  const [durationMs, setDurationMs] = useState(30_000);
  const [error, setError] = useState('');

  const { data: experiments = [] } = useQuery<Experiment[]>({
    queryKey: ['chaos-experiments'],
    queryFn: async () => (await api.get('/chaos/experiments')).data,
    refetchInterval: 3000,
  });

  const running = experiments.find((e) => e.status === 'RUNNING');

  const create = useMutation({
    mutationFn: (body: { name: string; type: ExperimentType; durationMs: number }) =>
      api.post('/chaos/experiments', body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['chaos-experiments'] });
      qc.invalidateQueries({ queryKey: ['incidents'] });
      setName('');
      setError('');
    },
    onError: (err: unknown) => {
      setError((err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Failed to start experiment');
    },
  });

  const stop = useMutation({
    mutationFn: (id: string) => api.post(`/chaos/experiments/${id}/stop`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['chaos-experiments'] }),
  });

  const handleLaunch = () => {
    if (!name.trim()) { setError('Give your experiment a name'); return; }
    create.mutate({ name: name.trim(), type: selectedType, durationMs });
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-100">Chaos Engineering</h1>
        <p className="text-slate-400 text-sm mt-0.5">Inject failures to test system resilience</p>
      </div>

      {/* Launch panel */}
      <div className="card space-y-5">
        <h2 className="text-sm font-semibold text-slate-300">Launch Experiment</h2>

        {/* Type selector */}
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {EXPERIMENT_TYPES.map(({ value, label, description, color }) => (
            <button
              key={value}
              onClick={() => setSelectedType(value)}
              className={`text-left rounded-lg border p-3 transition-colors ${
                selectedType === value
                  ? color + ' border-opacity-100'
                  : 'border-white/8 bg-surface-700 hover:bg-surface-600'
              }`}
            >
              <p className="text-sm font-medium text-slate-100">{label}</p>
              <p className="text-xs text-slate-400 mt-0.5">{description}</p>
            </button>
          ))}
        </div>

        {/* Name + duration */}
        <div className="flex gap-3 flex-wrap">
          <input
            className="input flex-1 min-w-48"
            placeholder="Experiment name…"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <select
            className="input w-36"
            value={durationMs}
            onChange={(e) => setDurationMs(Number(e.target.value))}
          >
            {[15_000, 30_000, 60_000, 120_000, 300_000].map((ms) => (
              <option key={ms} value={ms}>{duration(ms)}</option>
            ))}
          </select>
          <button
            className="btn-primary whitespace-nowrap"
            onClick={handleLaunch}
            disabled={create.isPending || !!running}
          >
            {create.isPending ? 'Launching…' : running ? 'Experiment running…' : '⚡ Launch'}
          </button>
        </div>

        {error && <p className="text-red-400 text-sm bg-red-500/10 px-3 py-2 rounded-lg">{error}</p>}
        {running && (
          <div className="flex items-center justify-between bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3">
            <div>
              <p className="text-sm font-medium text-red-300">🔴 Active: <span className="text-white">{running.name}</span></p>
              <p className="text-xs text-slate-400 mt-0.5">{running.type.replace(/_/g, ' ')} · {duration(running.durationMs)}</p>
            </div>
            <button
              className="text-xs bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded-lg transition-colors"
              onClick={() => stop.mutate(running.id)}
              disabled={stop.isPending}
            >
              Stop
            </button>
          </div>
        )}
      </div>

      {/* History */}
      <div className="card">
        <h2 className="text-sm font-semibold text-slate-300 mb-4">Experiment History</h2>
        {experiments.length === 0 ? (
          <p className="text-slate-500 text-sm text-center py-8">No experiments yet. Launch one above.</p>
        ) : (
          <div className="space-y-2">
            {experiments.map((exp) => (
              <div key={exp.id} className="flex items-center justify-between bg-surface-700 rounded-lg px-4 py-3">
                <div className="flex items-center gap-3 min-w-0">
                  <span className={STATUS_BADGE[exp.status]}>
                    <span className={`w-1.5 h-1.5 rounded-full ${exp.status === 'RUNNING' ? 'animate-pulse bg-red-400' : 'bg-current'}`} />
                    {exp.status}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm text-slate-200 truncate">{exp.name}</p>
                    <p className="text-xs text-slate-500">{exp.type.replace(/_/g, ' ')} · {duration(exp.durationMs)}</p>
                  </div>
                </div>
                {exp.incident && (
                  <span className="badge badge-red text-xs flex-shrink-0">Incident created</span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
