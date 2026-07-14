import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';

type Severity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
type IncidentStatus = 'OPEN' | 'INVESTIGATING' | 'RESOLVED';

interface Incident {
  id: string;
  title: string;
  severity: Severity;
  status: IncidentStatus;
  notes: string | null;
  createdAt: string;
  resolvedAt: string | null;
  experiment?: { id: string; name: string; type: string; status: string } | null;
}

const SEVERITY_BADGE: Record<Severity, string> = {
  LOW:      'badge badge-blue',
  MEDIUM:   'badge badge-yellow',
  HIGH:     'badge badge-red',
  CRITICAL: 'badge bg-red-600/30 text-red-300',
};

const STATUS_BADGE: Record<IncidentStatus, string> = {
  OPEN:          'badge badge-red',
  INVESTIGATING: 'badge badge-yellow',
  RESOLVED:      'badge badge-green',
};

const STATUS_NEXT: Record<IncidentStatus, { label: string; next: IncidentStatus } | null> = {
  OPEN:          { label: 'Investigate', next: 'INVESTIGATING' },
  INVESTIGATING: { label: 'Resolve',     next: 'RESOLVED'      },
  RESOLVED:      null,
};

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function Incidents() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<IncidentStatus | 'ALL'>('ALL');
  const [expanded, setExpanded] = useState<string | null>(null);
  // Draft notes per incident id
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({});
  const [noteSaving, setNoteSaving] = useState<string | null>(null);

  const { data: incidents = [], isLoading } = useQuery<Incident[]>({
    queryKey: ['incidents', filter],
    queryFn: async () =>
      (await api.get('/incidents', { params: filter !== 'ALL' ? { status: filter } : {} })).data,
    refetchInterval: 5000,
  });

  const update = useMutation({
    mutationFn: ({ id, status }: { id: string; status: IncidentStatus }) =>
      api.patch(`/incidents/${id}`, { status }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['incidents'] });
      qc.invalidateQueries({ queryKey: ['dashboard-stats'] });
      qc.invalidateQueries({ queryKey: ['chaos-status'] });
    },
  });

  async function saveNote(id: string) {
    const notes = noteDrafts[id];
    if (notes === undefined) return;
    setNoteSaving(id);
    try {
      await api.patch(`/incidents/${id}`, { notes });
      qc.invalidateQueries({ queryKey: ['incidents'] });
      setNoteDrafts((d) => { const n = { ...d }; delete n[id]; return n; });
    } finally {
      setNoteSaving(null);
    }
  }

  const openCount = incidents.filter((i) => i.status === 'OPEN').length;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-100">Incidents</h1>
          <p className="text-slate-400 text-sm mt-0.5">
            {openCount > 0
              ? <span className="text-red-400 font-medium">{openCount} open incident{openCount > 1 ? 's' : ''}</span>
              : 'All clear'}
          </p>
        </div>

        {/* Filter tabs */}
        <div className="flex rounded-lg bg-surface-700 p-1 text-xs">
          {(['ALL', 'OPEN', 'INVESTIGATING', 'RESOLVED'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1 rounded-md font-medium transition-colors ${
                filter === f ? 'bg-brand-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="card">
        {isLoading ? (
          <p className="text-slate-500 text-sm text-center py-8">Loading…</p>
        ) : incidents.length === 0 ? (
          <p className="text-slate-500 text-sm text-center py-8">
            {filter === 'ALL' ? 'No incidents yet. Launch a chaos experiment to generate one.' : `No ${filter.toLowerCase()} incidents.`}
          </p>
        ) : (
          <div className="space-y-2">
            {incidents.map((inc) => {
              const nextAction = STATUS_NEXT[inc.status];
              const isExpanded = expanded === inc.id;
              const draft = noteDrafts[inc.id] ?? inc.notes ?? '';
              const isDirty = noteDrafts[inc.id] !== undefined && noteDrafts[inc.id] !== (inc.notes ?? '');

              return (
                <div key={inc.id} className="rounded-lg border border-white/8 overflow-hidden">
                  {/* Row */}
                  <button
                    className="w-full flex items-center gap-3 px-4 py-3 bg-surface-700 hover:bg-surface-600 transition-colors text-left"
                    onClick={() => setExpanded(isExpanded ? null : inc.id)}
                  >
                    <span className={SEVERITY_BADGE[inc.severity]}>{inc.severity}</span>
                    <span className={STATUS_BADGE[inc.status]}>{inc.status}</span>
                    <p className="flex-1 text-sm text-slate-200 truncate">{inc.title}</p>
                    <p className="text-xs text-slate-500 flex-shrink-0">{timeAgo(inc.createdAt)}</p>
                    <span className="text-slate-500 text-xs">{isExpanded ? '▲' : '▼'}</span>
                  </button>

                  {/* Detail */}
                  {isExpanded && (
                    <div className="px-4 py-3 bg-surface-800 border-t border-white/8 space-y-4">
                      {/* Meta */}
                      <div className="grid grid-cols-2 gap-4 text-xs">
                        <div>
                          <p className="text-slate-500">Created</p>
                          <p className="text-slate-300">{new Date(inc.createdAt).toLocaleString()}</p>
                        </div>
                        {inc.resolvedAt && (
                          <div>
                            <p className="text-slate-500">Resolved</p>
                            <p className="text-slate-300">{new Date(inc.resolvedAt).toLocaleString()}</p>
                          </div>
                        )}
                        {inc.experiment && (
                          <div className="col-span-2">
                            <p className="text-slate-500">Linked Experiment</p>
                            <p className="text-slate-300">{inc.experiment.name} — {inc.experiment.type.replace(/_/g, ' ')}</p>
                          </div>
                        )}
                      </div>

                      {/* Notes */}
                      <div className="space-y-2">
                        <p className="text-xs text-slate-500">Investigation Notes</p>
                        <textarea
                          rows={3}
                          disabled={inc.status === 'RESOLVED'}
                          className="w-full bg-surface-700 border border-white/10 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-600 resize-none focus:outline-none focus:ring-1 focus:ring-brand-500 disabled:opacity-50 disabled:cursor-not-allowed"
                          placeholder={inc.status === 'RESOLVED' ? 'Incident resolved.' : 'Add investigation notes…'}
                          value={draft}
                          onChange={(e) => setNoteDrafts((d) => ({ ...d, [inc.id]: e.target.value }))}
                        />
                        {isDirty && (
                          <button
                            className="text-xs bg-brand-600 hover:bg-brand-700 text-white px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                            onClick={() => saveNote(inc.id)}
                            disabled={noteSaving === inc.id}
                          >
                            {noteSaving === inc.id ? 'Saving…' : 'Save Notes'}
                          </button>
                        )}
                      </div>

                      {/* Status transition */}
                      {nextAction && (
                        <button
                          className="btn-primary text-xs px-3 py-1.5"
                          onClick={() => update.mutate({ id: inc.id, status: nextAction.next })}
                          disabled={update.isPending}
                        >
                          {nextAction.label}
                        </button>
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
  );
}
