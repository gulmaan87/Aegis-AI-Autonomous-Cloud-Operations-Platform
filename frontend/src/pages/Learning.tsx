import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';

// ── Types ─────────────────────────────────────────────────────────────────────

interface Stats {
  totalLearnings: number;
  totalFeedback: number;
  avgConfidence: number;
  topPatterns: { pattern: string; count: number }[];
  severityCoverage: Record<string, number>;
}

interface Learning {
  id: string;
  incidentId: string;
  incidentTitle: string;
  rootCausePattern: string;
  resolutionPattern: string;
  summary: string;
  keywords: string[];
  confidenceScore: number;
  usefulnessVotes: number;
  severity: string;
  ttmMins: number | null;
  model: string;
  createdAt: string;
}

interface Incident {
  id: string;
  title: string;
  severity: string;
  status: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const SEV_BADGE: Record<string, string> = {
  CRITICAL: 'badge-red',
  HIGH: 'badge-orange',
  MEDIUM: 'badge-yellow',
  LOW: 'badge-slate',
};

function ConfidenceBar({ score }: { score: number }) {
  const pct = Math.round(score * 100);
  const color = pct >= 80 ? 'bg-emerald-500' : pct >= 60 ? 'bg-amber-500' : 'bg-rose-500';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 bg-slate-200 dark:bg-slate-800 rounded-full h-1.5">
        <div className={`${color} h-1.5 rounded-full transition-all`} style={{ width: `${pct}%` }} />
      </div>
      <span className={`text-xs font-bold font-mono ${pct >= 80 ? 'text-emerald-400' : pct >= 60 ? 'text-amber-400' : 'text-rose-400'}`}>
        {pct}%
      </span>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function Learning() {
  const qc = useQueryClient();

  // Feedback form state
  const [selectedIncidentId, setSelectedIncidentId] = useState('');
  const [ttmMins, setTtmMins] = useState('');
  const [whatWorked, setWhatWorked] = useState('');
  const [whatFailed, setWhatFailed] = useState('');
  const [improvements, setImprovements] = useState('');
  const [rating, setRating] = useState(0);
  const [activeLearning, setActiveLearning] = useState<Learning | null>(null);
  const [similarFor, setSimilarFor] = useState<string | null>(null);

  // Queries
  const { data: stats } = useQuery<Stats>({
    queryKey: ['learning-stats'],
    queryFn: () => api.get('/learning/stats').then((r) => r.data),
    refetchInterval: 15000,
  });

  const { data: learnings = [], isLoading } = useQuery<Learning[]>({
    queryKey: ['learning-learnings'],
    queryFn: () => api.get('/learning/learnings').then((r) => r.data),
    refetchInterval: 15000,
  });

  const { data: incidents = [] } = useQuery<Incident[]>({
    queryKey: ['incidents'],
    queryFn: () => api.get('/incidents').then((r) => r.data),
  });

  const { data: similarLearnings = [], isFetching: similarFetching } = useQuery<Learning[]>({
    queryKey: ['learning-similar', similarFor],
    queryFn: () => api.get(`/learning/similar?incidentId=${similarFor}`).then((r) => r.data),
    enabled: !!similarFor,
  });

  // Mutations
  const submitFeedback = useMutation({
    mutationFn: (body: object) => api.post('/learning/feedback', body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['learning-learnings'] });
      qc.invalidateQueries({ queryKey: ['learning-stats'] });
      setSelectedIncidentId('');
      setTtmMins('');
      setWhatWorked('');
      setWhatFailed('');
      setImprovements('');
      setRating(0);
    },
  });

  const vote = useMutation({
    mutationFn: ({ id, direction }: { id: string; direction: 'up' | 'down' }) =>
      api.post(`/learning/vote/${id}`, { direction }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['learning-learnings'] }),
  });

  const handleSubmitFeedback = () => {
    if (!selectedIncidentId || !whatWorked || !ttmMins || !rating) return;
    submitFeedback.mutate({
      incidentId: selectedIncidentId,
      resolvedBy: 'operator',
      ttmMins: parseInt(ttmMins),
      whatWorked,
      whatFailed: whatFailed || undefined,
      suggestedImprovements: improvements || undefined,
      rating,
    });
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight flex items-center gap-2 text-slate-900 dark:text-white">
          🧠 AI Learning Engine
        </h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
          The platform learns from every incident. Submit resolution feedback to build a growing knowledge base of root cause patterns and proven remediation strategies.
        </p>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Total Learnings', value: stats.totalLearnings, icon: '📚', color: 'text-brand-500' },
            { label: 'Feedback Submissions', value: stats.totalFeedback, icon: '📝', color: 'text-emerald-500' },
            { label: 'Avg Confidence', value: `${Math.round(stats.avgConfidence * 100)}%`, icon: '🎯', color: 'text-amber-500' },
            { label: 'Top Pattern', value: stats.topPatterns[0]?.pattern?.replace(/_/g, ' ') ?? 'N/A', icon: '🔍', color: 'text-violet-500' },
          ].map((s, i) => (
            <div key={i} className="card space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xl">{s.icon}</span>
              </div>
              <p className={`text-xl font-extrabold font-mono ${s.color} truncate`}>{s.value}</p>
              <p className="text-xs text-slate-500">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Submit Resolution Feedback Form */}
        <div className="card space-y-4">
          <h2 className="text-base font-bold text-slate-900 dark:text-white pb-2 border-b border-slate-200/80 dark:border-slate-800">
            📝 Submit Resolution Feedback
          </h2>

          <div className="space-y-3">
            <div>
              <label className="label">Incident</label>
              <select
                value={selectedIncidentId}
                onChange={(e) => setSelectedIncidentId(e.target.value)}
                className="input"
              >
                <option value="">— Select resolved incident —</option>
                {incidents
                  .filter((i) => i.status === 'RESOLVED')
                  .map((i) => (
                    <option key={i.id} value={i.id}>
                      [{i.severity}] {i.title}
                    </option>
                  ))}
                {incidents.filter((i) => i.status === 'RESOLVED').length === 0 && (
                  <option value="" disabled>No resolved incidents yet</option>
                )}
              </select>
            </div>

            <div>
              <label className="label">Time to Mitigate (minutes)</label>
              <input
                type="number"
                placeholder="e.g. 45"
                value={ttmMins}
                min={1}
                onChange={(e) => setTtmMins(e.target.value)}
                className="input"
              />
            </div>

            <div>
              <label className="label">What worked? <span className="text-rose-400">*</span></label>
              <textarea
                rows={3}
                placeholder="Describe the remediation steps that resolved the incident…"
                value={whatWorked}
                onChange={(e) => setWhatWorked(e.target.value)}
                className="input resize-none"
              />
            </div>

            <div>
              <label className="label">What failed? <span className="text-slate-400">(optional)</span></label>
              <textarea
                rows={2}
                placeholder="Describe any approaches that didn't work…"
                value={whatFailed}
                onChange={(e) => setWhatFailed(e.target.value)}
                className="input resize-none"
              />
            </div>

            <div>
              <label className="label">Suggested improvements <span className="text-slate-400">(optional)</span></label>
              <textarea
                rows={2}
                placeholder="Process or tooling improvements to prevent recurrence…"
                value={improvements}
                onChange={(e) => setImprovements(e.target.value)}
                className="input resize-none"
              />
            </div>

            {/* Star Rating */}
            <div>
              <label className="label">Resolution Quality Rating</label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => setRating(star)}
                    className={`text-2xl transition-transform hover:scale-110 ${star <= rating ? 'text-amber-400' : 'text-slate-300 dark:text-slate-700'}`}
                  >
                    ★
                  </button>
                ))}
                {rating > 0 && <span className="text-xs text-slate-500 self-center ml-1">{rating}/5</span>}
              </div>
            </div>

            <button
              onClick={handleSubmitFeedback}
              disabled={submitFeedback.isPending || !selectedIncidentId || !whatWorked || !ttmMins || !rating}
              className="btn-primary w-full flex items-center justify-center gap-2"
            >
              {submitFeedback.isPending ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Extracting learning…
                </>
              ) : (
                '🧠 Submit & Extract Learning'
              )}
            </button>

            {submitFeedback.isSuccess && (
              <p className="text-xs text-emerald-500 font-medium text-center">
                ✅ Learning successfully extracted and added to knowledge base!
              </p>
            )}
          </div>
        </div>

        {/* Top Root Cause Patterns */}
        <div className="card space-y-4">
          <h2 className="text-base font-bold text-slate-900 dark:text-white pb-2 border-b border-slate-200/80 dark:border-slate-800">
            📊 Root Cause Pattern Heatmap
          </h2>

          {!stats?.topPatterns?.length ? (
            <p className="text-sm text-slate-500 py-8 text-center">
              No patterns yet. Submit resolution feedback to build the knowledge base.
            </p>
          ) : (
            <div className="space-y-3">
              {stats.topPatterns.map(({ pattern, count }, i) => (
                <div key={i} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-mono font-bold text-slate-900 dark:text-white">
                      {pattern.replace(/_/g, ' ')}
                    </span>
                    <span className="text-slate-500">{count} incidents</span>
                  </div>
                  <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-2">
                    <div
                      className="bg-brand-500 h-2 rounded-full transition-all"
                      style={{ width: `${Math.min(100, (count / (stats.topPatterns[0]?.count || 1)) * 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Severity Coverage */}
          {stats?.severityCoverage && Object.keys(stats.severityCoverage).length > 0 && (
            <div className="pt-3 border-t border-slate-200/80 dark:border-slate-800 space-y-2">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Coverage by Severity</p>
              <div className="flex flex-wrap gap-2">
                {Object.entries(stats.severityCoverage).map(([sev, count]) => (
                  <span key={sev} className={`badge ${SEV_BADGE[sev] ?? 'badge-slate'} text-xs`}>
                    {sev}: {count}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Find Similar Learnings */}
          <div className="pt-3 border-t border-slate-200/80 dark:border-slate-800 space-y-3">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">🔍 Find Similar Past Learnings</h3>
            <select
              value={similarFor ?? ''}
              onChange={(e) => setSimilarFor(e.target.value || null)}
              className="input"
            >
              <option value="">— Select incident to match —</option>
              {incidents.map((i) => (
                <option key={i.id} value={i.id}>[{i.severity}] {i.title}</option>
              ))}
            </select>

            {similarFetching && (
              <p className="text-xs text-slate-500 animate-pulse font-mono">Scanning knowledge base…</p>
            )}

            {similarLearnings.length > 0 && (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {similarLearnings.map((l) => (
                  <button
                    key={l.id}
                    onClick={() => setActiveLearning(l)}
                    className="w-full text-left p-2 rounded-lg bg-slate-100/60 dark:bg-surface-850 border border-slate-200/80 dark:border-slate-800 hover:border-brand-500/40 transition-colors"
                  >
                    <p className="text-xs font-bold text-slate-900 dark:text-white">{l.incidentTitle}</p>
                    <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                      {l.rootCausePattern.replace(/_/g, ' ')} · {Math.round(l.confidenceScore * 100)}% confidence
                    </p>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Learning Detail Modal / Expanded Card */}
      {activeLearning && (
        <div className="card border-2 border-brand-500/30 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200/80 dark:border-slate-800">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                📖 {activeLearning.incidentTitle}
              </h2>
              <div className="flex gap-2 mt-1 flex-wrap">
                <span className={`badge ${SEV_BADGE[activeLearning.severity] ?? 'badge-slate'}`}>{activeLearning.severity}</span>
                <span className="badge badge-blue font-mono text-[10px]">{activeLearning.rootCausePattern.replace(/_/g, ' ')}</span>
                {activeLearning.ttmMins && (
                  <span className="text-[11px] text-slate-500 font-mono">TTM: {activeLearning.ttmMins}m</span>
                )}
              </div>
            </div>
            <button onClick={() => setActiveLearning(null)} className="text-slate-400 hover:text-slate-600 text-xl">✕</button>
          </div>

          <ConfidenceBar score={activeLearning.confidenceScore} />

          <div className="prose prose-sm dark:prose-invert prose-slate max-w-none">
            <pre className="whitespace-pre-wrap font-sans text-xs text-slate-700 dark:text-slate-200 leading-relaxed">
              {activeLearning.summary}
            </pre>
          </div>

          <div className="flex flex-wrap gap-2">
            {activeLearning.keywords.map((kw) => (
              <span key={kw} className="text-[11px] px-2 py-0.5 bg-brand-500/10 text-brand-400 rounded font-mono border border-brand-500/20">
                {kw}
              </span>
            ))}
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-slate-200/80 dark:border-slate-800">
            <span className="text-xs text-slate-500 font-mono">
              Usefulness: {activeLearning.usefulnessVotes > 0 ? '+' : ''}{activeLearning.usefulnessVotes} votes
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => vote.mutate({ id: activeLearning.id, direction: 'up' })}
                className="text-sm px-3 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20 transition-colors"
              >
                👍 Helpful
              </button>
              <button
                onClick={() => vote.mutate({ id: activeLearning.id, direction: 'down' })}
                className="text-sm px-3 py-1 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 hover:bg-rose-500/20 transition-colors"
              >
                👎 Not helpful
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Knowledge Base Table */}
      <div className="card space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-200/80 dark:border-slate-800">
          <h2 className="text-base font-bold text-slate-900 dark:text-white">📚 Knowledge Base</h2>
          <span className="text-xs font-mono text-slate-500">{learnings.length} learnings</span>
        </div>

        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => <div key={i} className="h-16 rounded-xl bg-slate-100 dark:bg-surface-850 animate-pulse" />)}
          </div>
        ) : learnings.length === 0 ? (
          <div className="py-12 text-center text-slate-500 space-y-2">
            <p className="text-3xl">🧠</p>
            <p className="text-sm font-medium">No learnings yet</p>
            <p className="text-xs">Submit resolution feedback above to extract the first incident learning!</p>
          </div>
        ) : (
          <div className="space-y-2">
            {learnings.map((l) => (
              <button
                key={l.id}
                onClick={() => setActiveLearning(l)}
                className="w-full text-left p-4 rounded-xl bg-slate-100/60 dark:bg-surface-850 border border-slate-200/80 dark:border-slate-800 hover:border-brand-500/40 transition-colors group"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0 space-y-1.5">
                    <p className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-brand-500 truncate">
                      {l.incidentTitle}
                    </p>
                    <div className="flex flex-wrap gap-2 items-center">
                      <span className={`badge ${SEV_BADGE[l.severity] ?? 'badge-slate'} text-[10px]`}>{l.severity}</span>
                      <span className="text-[11px] font-mono text-slate-600 dark:text-slate-400">
                        {l.rootCausePattern.replace(/_/g, ' ')}
                      </span>
                      {l.ttmMins && (
                        <span className="text-[11px] text-slate-500 font-mono">TTM: {l.ttmMins}m</span>
                      )}
                      <span className="text-[10px] text-slate-400 font-mono">{l.model}</span>
                    </div>
                    <div className="w-48">
                      <ConfidenceBar score={l.confidenceScore} />
                    </div>
                  </div>

                  <div className="flex-shrink-0 text-right space-y-1">
                    <p className="text-[11px] text-slate-500 font-mono">
                      {l.usefulnessVotes >= 0 ? '+' : ''}{l.usefulnessVotes} votes
                    </p>
                    <p className="text-[10px] text-slate-400">
                      {new Date(l.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
