import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';

type Severity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
type IncidentStatus = 'OPEN' | 'INVESTIGATING' | 'RESOLVED';

interface AiAnalysis {
  id: string;
  rootCause: string;
  impact: string;
  remediationSteps: string;
  riskScore: Severity;
  confidence: number;
  model: string;
  createdAt: string;
}

interface Postmortem {
  id: string;
  incidentId: string;
  content: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

interface Incident {
  id: string;
  title: string;
  severity: Severity;
  status: IncidentStatus;
  notes: string | null;
  source: 'CHAOS' | 'ALERT';
  createdAt: string;
  resolvedAt: string | null;
  aiAnalysis: AiAnalysis | null;
  postmortem: Postmortem | null;
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

const RISK_COLOR: Record<Severity, string> = {
  LOW:      'text-blue-400 border-blue-500/30 bg-blue-500/10',
  MEDIUM:   'text-amber-400 border-amber-500/30 bg-amber-500/10',
  HIGH:     'text-red-400 border-red-500/30 bg-red-500/10',
  CRITICAL: 'text-red-300 border-red-600/40 bg-red-600/10',
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

function parseSteps(raw: string): string[] {
  try { return JSON.parse(raw); } catch { return []; }
}

// ── Postmortem Panel ───────────────────────────────────────────────────────────
function PostmortemPanel({ incident, onSaved }: { incident: Incident; onSaved: () => void }) {
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [pm, setPm] = useState<Postmortem | null>(incident.postmortem ?? null);
  const [draft, setDraft] = useState(incident.postmortem?.content ?? '');
  const [editMode, setEditMode] = useState(false);
  const isDirty = editMode && draft !== pm?.content;

  async function generate() {
    setGenerating(true);
    setError('');
    try {
      const { data } = await api.post<Postmortem>(`/incidents/${incident.id}/postmortem`);
      setPm(data);
      setDraft(data.content);
      setEditMode(false);
      onSaved();
    } catch (e: unknown) {
      setError((e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Generation failed');
    } finally {
      setGenerating(false);
    }
  }

  async function saveEdits() {
    if (!pm) return;
    setSaving(true);
    try {
      const { data } = await api.patch<Postmortem>(`/incidents/${incident.id}/postmortem`, { content: draft });
      setPm(data);
      setEditMode(false);
      onSaved();
    } catch (e: unknown) {
      setError((e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  async function setStatus(status: string) {
    if (!pm) return;
    try {
      const { data } = await api.patch<Postmortem>(`/incidents/${incident.id}/postmortem`, { status });
      setPm(data);
      onSaved();
    } catch { /* silent */ }
  }

  const STATUS_COLOR: Record<string, string> = {
    DRAFT:     'badge badge-yellow',
    IN_REVIEW: 'badge badge-blue',
    PUBLISHED: 'badge badge-green',
  };

  return (
    <div className="space-y-3 border border-emerald-500/20 rounded-lg p-4 bg-emerald-500/5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-base">📋</span>
          <p className="text-sm font-semibold text-emerald-300">AI Postmortem</p>
          {pm && (
            <span className={STATUS_COLOR[pm.status] ?? 'badge badge-yellow'}>{pm.status}</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {pm && !editMode && (
            <>
              {pm.status === 'DRAFT' && (
                <button
                  className="text-xs text-slate-400 hover:text-blue-300 transition-colors"
                  onClick={() => setStatus('IN_REVIEW')}
                >Send for Review</button>
              )}
              {pm.status === 'IN_REVIEW' && (
                <button
                  className="text-xs text-slate-400 hover:text-green-300 transition-colors"
                  onClick={() => setStatus('PUBLISHED')}
                >Publish</button>
              )}
              <button
                className="text-xs text-slate-400 hover:text-slate-200 transition-colors"
                onClick={() => setEditMode(true)}
              >✏️ Edit</button>
              <button
                className="text-xs text-slate-400 hover:text-slate-200 transition-colors disabled:opacity-50"
                onClick={generate}
                disabled={generating}
              >{generating ? '⏳ Regenerating…' : '🔄 Regenerate'}</button>
            </>
          )}
          {!pm && (
            <button
              className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-1.5"
              onClick={generate}
              disabled={generating}
            >
              {generating ? (
                <><span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin inline-block" />Generating…</>
              ) : '📋 Generate Postmortem'}
            </button>
          )}
        </div>
      </div>

      {error && <p className="text-red-400 text-xs bg-red-500/10 px-3 py-2 rounded-lg">{error}</p>}

      {generating && !pm && (
        <div className="space-y-2 animate-pulse">
          <div className="h-3 bg-surface-600 rounded w-3/4" />
          <div className="h-3 bg-surface-600 rounded w-full" />
          <div className="h-3 bg-surface-600 rounded w-5/6" />
          <div className="h-3 bg-surface-600 rounded w-2/3" />
        </div>
      )}

      {pm && !editMode && (
        <div className="mt-2">
          {/* Markdown rendered as simple pre for now; avoids external dependency */}
          <pre className="text-xs text-slate-300 whitespace-pre-wrap leading-relaxed font-sans bg-surface-700/50 rounded-lg p-4 max-h-96 overflow-y-auto border border-white/5">
            {pm.content}
          </pre>
          <p className="text-xs text-slate-600 mt-2">
            Last updated {timeAgo(pm.updatedAt)} · {pm.status}
          </p>
        </div>
      )}

      {pm && editMode && (
        <div className="space-y-2">
          <textarea
            rows={20}
            className="w-full bg-surface-700 border border-white/10 rounded-lg px-3 py-2 text-xs text-slate-200 placeholder-slate-600 resize-y focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
          />
          <div className="flex items-center gap-2">
            <button
              className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
              onClick={saveEdits}
              disabled={saving || !isDirty}
            >{saving ? 'Saving…' : 'Save Changes'}</button>
            <button
              className="text-xs text-slate-400 hover:text-slate-200 transition-colors"
              onClick={() => { setDraft(pm.content); setEditMode(false); }}
            >Cancel</button>
          </div>
        </div>
      )}

      {!pm && !generating && (
        <p className="text-xs text-slate-500">
          Generate a full SRE postmortem document from this resolved incident — includes timeline, root cause, action items and lessons learned.
        </p>
      )}
    </div>
  );
}

// ── AI Commander Panel ────────────────────────────────────────────────────────
function AiCommanderPanel({ incident, onAnalyzed }: { incident: Incident; onAnalyzed: () => void }) {
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState('');
  const [localAnalysis, setLocalAnalysis] = useState<AiAnalysis | null>(incident.aiAnalysis);

  async function runAnalysis(force = false) {
    setAnalyzing(true);
    setError('');
    try {
      const { data } = await api.post(`/incidents/${incident.id}/analyze${force ? '?force=true' : ''}`);
      setLocalAnalysis(data);
      onAnalyzed();
    } catch (err: unknown) {
      setError((err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Analysis failed');
    } finally {
      setAnalyzing(false);
    }
  }

  const analysis = localAnalysis;

  return (
    <div className="space-y-3 border border-brand-500/20 rounded-lg p-4 bg-brand-500/5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-base">🤖</span>
          <p className="text-sm font-semibold text-brand-300">AI Incident Commander</p>
        </div>
        {analysis ? (
          <button
            className="text-xs text-slate-400 hover:text-slate-200 transition-colors disabled:opacity-50"
            onClick={() => runAnalysis(true)}
            disabled={analyzing}
          >
            {analyzing ? '⏳ Re-analyzing…' : '🔄 Re-analyze'}
          </button>
        ) : (
          <button
            className="text-xs bg-brand-600 hover:bg-brand-700 text-white px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-1.5"
            onClick={() => runAnalysis(false)}
            disabled={analyzing}
          >
            {analyzing ? (
              <>
                <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin inline-block" />
                Analyzing…
              </>
            ) : (
              '🤖 Analyze with AI'
            )}
          </button>
        )}
      </div>

      {error && <p className="text-red-400 text-xs bg-red-500/10 px-3 py-2 rounded-lg">{error}</p>}

      {/* Loading shimmer */}
      {analyzing && !analysis && (
        <div className="space-y-2 animate-pulse">
          <div className="h-3 bg-surface-600 rounded w-3/4" />
          <div className="h-3 bg-surface-600 rounded w-full" />
          <div className="h-3 bg-surface-600 rounded w-5/6" />
        </div>
      )}

      {/* Analysis result */}
      {analysis && (
        <div className="space-y-4">
          {/* Risk + Confidence */}
          <div className="flex items-center gap-3">
            <span className={`text-xs font-bold px-2.5 py-1 rounded-lg border ${RISK_COLOR[analysis.riskScore]}`}>
              {analysis.riskScore} RISK
            </span>
            <div className="flex-1 flex items-center gap-2">
              <div className="flex-1 bg-surface-700 rounded-full h-1.5">
                <div
                  className="bg-brand-500 h-1.5 rounded-full transition-all"
                  style={{ width: `${analysis.confidence}%` }}
                />
              </div>
              <span className="text-xs text-slate-400 flex-shrink-0">{analysis.confidence}% confidence</span>
            </div>
          </div>

          {/* Root Cause */}
          <div>
            <p className="text-xs text-slate-500 mb-1 font-medium uppercase tracking-wide">Root Cause</p>
            <p className="text-sm text-slate-200 leading-relaxed">{analysis.rootCause}</p>
          </div>

          {/* Impact */}
          <div>
            <p className="text-xs text-slate-500 mb-1 font-medium uppercase tracking-wide">Impact</p>
            <p className="text-sm text-slate-200 leading-relaxed">{analysis.impact}</p>
          </div>

          {/* Remediation Steps */}
          <div>
            <p className="text-xs text-slate-500 mb-2 font-medium uppercase tracking-wide">Remediation Steps</p>
            <ol className="space-y-1.5">
              {parseSteps(analysis.remediationSteps).map((step, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-slate-200">
                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-brand-600/30 text-brand-300 text-xs flex items-center justify-center font-bold mt-0.5">
                    {i + 1}
                  </span>
                  {step}
                </li>
              ))}
            </ol>
          </div>

          {/* Footer */}
          <p className="text-xs text-slate-600 pt-1 border-t border-white/5">
            Analyzed {timeAgo(analysis.createdAt)} · {analysis.model}
          </p>
        </div>
      )}

      {!analysis && !analyzing && !error && (
        <p className="text-xs text-slate-500">
          AI will analyze incident context, linked experiment, and operator notes to suggest root cause and remediation.
        </p>
      )}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function Incidents() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<IncidentStatus | 'ALL'>('ALL');
  const [expanded, setExpanded] = useState<string | null>(null);
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
                    {inc.aiAnalysis && (
                      <span title="AI analysis available" className="text-brand-400 text-xs">🤖</span>
                    )}
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

                      {/* AI Commander */}
                      <AiCommanderPanel
                        incident={inc}
                        onAnalyzed={() => qc.invalidateQueries({ queryKey: ['incidents'] })}
                      />

                      {/* Postmortem — only for resolved incidents */}
                      {inc.status === 'RESOLVED' && (
                        <PostmortemPanel
                          incident={inc}
                          onSaved={() => qc.invalidateQueries({ queryKey: ['incidents'] })}
                        />
                      )}

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
