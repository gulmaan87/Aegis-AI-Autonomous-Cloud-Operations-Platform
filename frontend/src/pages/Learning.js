import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
// ── Helpers ───────────────────────────────────────────────────────────────────
const SEV_BADGE = {
    CRITICAL: 'badge-red',
    HIGH: 'badge-orange',
    MEDIUM: 'badge-yellow',
    LOW: 'badge-slate',
};
function ConfidenceBar({ score }) {
    const pct = Math.round(score * 100);
    const color = pct >= 80 ? 'bg-emerald-500' : pct >= 60 ? 'bg-amber-500' : 'bg-rose-500';
    return (_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("div", { className: "flex-1 bg-slate-200 dark:bg-slate-800 rounded-full h-1.5", children: _jsx("div", { className: `${color} h-1.5 rounded-full transition-all`, style: { width: `${pct}%` } }) }), _jsxs("span", { className: `text-xs font-bold font-mono ${pct >= 80 ? 'text-emerald-400' : pct >= 60 ? 'text-amber-400' : 'text-rose-400'}`, children: [pct, "%"] })] }));
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
    const [activeLearning, setActiveLearning] = useState(null);
    const [similarFor, setSimilarFor] = useState(null);
    // Queries
    const { data: stats } = useQuery({
        queryKey: ['learning-stats'],
        queryFn: () => api.get('/learning/stats').then((r) => r.data),
        refetchInterval: 15000,
    });
    const { data: learnings = [], isLoading } = useQuery({
        queryKey: ['learning-learnings'],
        queryFn: () => api.get('/learning/learnings').then((r) => r.data),
        refetchInterval: 15000,
    });
    const { data: incidents = [] } = useQuery({
        queryKey: ['incidents'],
        queryFn: () => api.get('/incidents').then((r) => r.data),
    });
    const { data: similarLearnings = [], isFetching: similarFetching } = useQuery({
        queryKey: ['learning-similar', similarFor],
        queryFn: () => api.get(`/learning/similar?incidentId=${similarFor}`).then((r) => r.data),
        enabled: !!similarFor,
    });
    // Mutations
    const submitFeedback = useMutation({
        mutationFn: (body) => api.post('/learning/feedback', body),
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
        mutationFn: ({ id, direction }) => api.post(`/learning/vote/${id}`, { direction }),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['learning-learnings'] }),
    });
    const handleSubmitFeedback = () => {
        if (!selectedIncidentId || !whatWorked || !ttmMins || !rating)
            return;
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
    return (_jsxs("div", { className: "p-6 space-y-6", children: [_jsxs("div", { children: [_jsx("h1", { className: "text-2xl font-extrabold tracking-tight flex items-center gap-2 text-slate-900 dark:text-white", children: "\uD83E\uDDE0 AI Learning Engine" }), _jsx("p", { className: "text-slate-500 dark:text-slate-400 text-sm mt-1", children: "The platform learns from every incident. Submit resolution feedback to build a growing knowledge base of root cause patterns and proven remediation strategies." })] }), stats && (_jsx("div", { className: "grid grid-cols-2 lg:grid-cols-4 gap-4", children: [
                    { label: 'Total Learnings', value: stats.totalLearnings, icon: '📚', color: 'text-brand-500' },
                    { label: 'Feedback Submissions', value: stats.totalFeedback, icon: '📝', color: 'text-emerald-500' },
                    { label: 'Avg Confidence', value: `${Math.round(stats.avgConfidence * 100)}%`, icon: '🎯', color: 'text-amber-500' },
                    { label: 'Top Pattern', value: stats.topPatterns[0]?.pattern?.replace(/_/g, ' ') ?? 'N/A', icon: '🔍', color: 'text-violet-500' },
                ].map((s, i) => (_jsxs("div", { className: "card space-y-2", children: [_jsx("div", { className: "flex items-center justify-between", children: _jsx("span", { className: "text-xl", children: s.icon }) }), _jsx("p", { className: `text-xl font-extrabold font-mono ${s.color} truncate`, children: s.value }), _jsx("p", { className: "text-xs text-slate-500", children: s.label })] }, i))) })), _jsxs("div", { className: "grid grid-cols-1 lg:grid-cols-2 gap-6", children: [_jsxs("div", { className: "card space-y-4", children: [_jsx("h2", { className: "text-base font-bold text-slate-900 dark:text-white pb-2 border-b border-slate-200/80 dark:border-slate-800", children: "\uD83D\uDCDD Submit Resolution Feedback" }), _jsxs("div", { className: "space-y-3", children: [_jsxs("div", { children: [_jsx("label", { className: "label", children: "Incident" }), _jsxs("select", { value: selectedIncidentId, onChange: (e) => setSelectedIncidentId(e.target.value), className: "input", children: [_jsx("option", { value: "", children: "\u2014 Select resolved incident \u2014" }), incidents
                                                        .filter((i) => i.status === 'RESOLVED')
                                                        .map((i) => (_jsxs("option", { value: i.id, children: ["[", i.severity, "] ", i.title] }, i.id))), incidents.filter((i) => i.status === 'RESOLVED').length === 0 && (_jsx("option", { value: "", disabled: true, children: "No resolved incidents yet" }))] })] }), _jsxs("div", { children: [_jsx("label", { className: "label", children: "Time to Mitigate (minutes)" }), _jsx("input", { type: "number", placeholder: "e.g. 45", value: ttmMins, min: 1, onChange: (e) => setTtmMins(e.target.value), className: "input" })] }), _jsxs("div", { children: [_jsxs("label", { className: "label", children: ["What worked? ", _jsx("span", { className: "text-rose-400", children: "*" })] }), _jsx("textarea", { rows: 3, placeholder: "Describe the remediation steps that resolved the incident\u2026", value: whatWorked, onChange: (e) => setWhatWorked(e.target.value), className: "input resize-none" })] }), _jsxs("div", { children: [_jsxs("label", { className: "label", children: ["What failed? ", _jsx("span", { className: "text-slate-400", children: "(optional)" })] }), _jsx("textarea", { rows: 2, placeholder: "Describe any approaches that didn't work\u2026", value: whatFailed, onChange: (e) => setWhatFailed(e.target.value), className: "input resize-none" })] }), _jsxs("div", { children: [_jsxs("label", { className: "label", children: ["Suggested improvements ", _jsx("span", { className: "text-slate-400", children: "(optional)" })] }), _jsx("textarea", { rows: 2, placeholder: "Process or tooling improvements to prevent recurrence\u2026", value: improvements, onChange: (e) => setImprovements(e.target.value), className: "input resize-none" })] }), _jsxs("div", { children: [_jsx("label", { className: "label", children: "Resolution Quality Rating" }), _jsxs("div", { className: "flex gap-2", children: [[1, 2, 3, 4, 5].map((star) => (_jsx("button", { onClick: () => setRating(star), className: `text-2xl transition-transform hover:scale-110 ${star <= rating ? 'text-amber-400' : 'text-slate-300 dark:text-slate-700'}`, children: "\u2605" }, star))), rating > 0 && _jsxs("span", { className: "text-xs text-slate-500 self-center ml-1", children: [rating, "/5"] })] })] }), _jsx("button", { onClick: handleSubmitFeedback, disabled: submitFeedback.isPending || !selectedIncidentId || !whatWorked || !ttmMins || !rating, className: "btn-primary w-full flex items-center justify-center gap-2", children: submitFeedback.isPending ? (_jsxs(_Fragment, { children: [_jsx("span", { className: "w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" }), "Extracting learning\u2026"] })) : ('🧠 Submit & Extract Learning') }), submitFeedback.isSuccess && (_jsx("p", { className: "text-xs text-emerald-500 font-medium text-center", children: "\u2705 Learning successfully extracted and added to knowledge base!" }))] })] }), _jsxs("div", { className: "card space-y-4", children: [_jsx("h2", { className: "text-base font-bold text-slate-900 dark:text-white pb-2 border-b border-slate-200/80 dark:border-slate-800", children: "\uD83D\uDCCA Root Cause Pattern Heatmap" }), !stats?.topPatterns?.length ? (_jsx("p", { className: "text-sm text-slate-500 py-8 text-center", children: "No patterns yet. Submit resolution feedback to build the knowledge base." })) : (_jsx("div", { className: "space-y-3", children: stats.topPatterns.map(({ pattern, count }, i) => (_jsxs("div", { className: "space-y-1", children: [_jsxs("div", { className: "flex items-center justify-between text-xs", children: [_jsx("span", { className: "font-mono font-bold text-slate-900 dark:text-white", children: pattern.replace(/_/g, ' ') }), _jsxs("span", { className: "text-slate-500", children: [count, " incidents"] })] }), _jsx("div", { className: "w-full bg-slate-200 dark:bg-slate-800 rounded-full h-2", children: _jsx("div", { className: "bg-brand-500 h-2 rounded-full transition-all", style: { width: `${Math.min(100, (count / (stats.topPatterns[0]?.count || 1)) * 100)}%` } }) })] }, i))) })), stats?.severityCoverage && Object.keys(stats.severityCoverage).length > 0 && (_jsxs("div", { className: "pt-3 border-t border-slate-200/80 dark:border-slate-800 space-y-2", children: [_jsx("p", { className: "text-xs font-bold text-slate-500 uppercase tracking-wider", children: "Coverage by Severity" }), _jsx("div", { className: "flex flex-wrap gap-2", children: Object.entries(stats.severityCoverage).map(([sev, count]) => (_jsxs("span", { className: `badge ${SEV_BADGE[sev] ?? 'badge-slate'} text-xs`, children: [sev, ": ", count] }, sev))) })] })), _jsxs("div", { className: "pt-3 border-t border-slate-200/80 dark:border-slate-800 space-y-3", children: [_jsx("h3", { className: "text-sm font-bold text-slate-900 dark:text-white", children: "\uD83D\uDD0D Find Similar Past Learnings" }), _jsxs("select", { value: similarFor ?? '', onChange: (e) => setSimilarFor(e.target.value || null), className: "input", children: [_jsx("option", { value: "", children: "\u2014 Select incident to match \u2014" }), incidents.map((i) => (_jsxs("option", { value: i.id, children: ["[", i.severity, "] ", i.title] }, i.id)))] }), similarFetching && (_jsx("p", { className: "text-xs text-slate-500 animate-pulse font-mono", children: "Scanning knowledge base\u2026" })), similarLearnings.length > 0 && (_jsx("div", { className: "space-y-2 max-h-48 overflow-y-auto", children: similarLearnings.map((l) => (_jsxs("button", { onClick: () => setActiveLearning(l), className: "w-full text-left p-2 rounded-lg bg-slate-100/60 dark:bg-surface-850 border border-slate-200/80 dark:border-slate-800 hover:border-brand-500/40 transition-colors", children: [_jsx("p", { className: "text-xs font-bold text-slate-900 dark:text-white", children: l.incidentTitle }), _jsxs("p", { className: "text-[11px] text-slate-500 font-mono mt-0.5", children: [l.rootCausePattern.replace(/_/g, ' '), " \u00B7 ", Math.round(l.confidenceScore * 100), "% confidence"] })] }, l.id))) }))] })] })] }), activeLearning && (_jsxs("div", { className: "card border-2 border-brand-500/30 space-y-4", children: [_jsxs("div", { className: "flex items-center justify-between pb-3 border-b border-slate-200/80 dark:border-slate-800", children: [_jsxs("div", { children: [_jsxs("h2", { className: "text-base font-bold text-slate-900 dark:text-white", children: ["\uD83D\uDCD6 ", activeLearning.incidentTitle] }), _jsxs("div", { className: "flex gap-2 mt-1 flex-wrap", children: [_jsx("span", { className: `badge ${SEV_BADGE[activeLearning.severity] ?? 'badge-slate'}`, children: activeLearning.severity }), _jsx("span", { className: "badge badge-blue font-mono text-[10px]", children: activeLearning.rootCausePattern.replace(/_/g, ' ') }), activeLearning.ttmMins && (_jsxs("span", { className: "text-[11px] text-slate-500 font-mono", children: ["TTM: ", activeLearning.ttmMins, "m"] }))] })] }), _jsx("button", { onClick: () => setActiveLearning(null), className: "text-slate-400 hover:text-slate-600 text-xl", children: "\u2715" })] }), _jsx(ConfidenceBar, { score: activeLearning.confidenceScore }), _jsx("div", { className: "prose prose-sm dark:prose-invert prose-slate max-w-none", children: _jsx("pre", { className: "whitespace-pre-wrap font-sans text-xs text-slate-700 dark:text-slate-200 leading-relaxed", children: activeLearning.summary }) }), _jsx("div", { className: "flex flex-wrap gap-2", children: activeLearning.keywords.map((kw) => (_jsx("span", { className: "text-[11px] px-2 py-0.5 bg-brand-500/10 text-brand-400 rounded font-mono border border-brand-500/20", children: kw }, kw))) }), _jsxs("div", { className: "flex items-center justify-between pt-2 border-t border-slate-200/80 dark:border-slate-800", children: [_jsxs("span", { className: "text-xs text-slate-500 font-mono", children: ["Usefulness: ", activeLearning.usefulnessVotes > 0 ? '+' : '', activeLearning.usefulnessVotes, " votes"] }), _jsxs("div", { className: "flex gap-2", children: [_jsx("button", { onClick: () => vote.mutate({ id: activeLearning.id, direction: 'up' }), className: "text-sm px-3 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20 transition-colors", children: "\uD83D\uDC4D Helpful" }), _jsx("button", { onClick: () => vote.mutate({ id: activeLearning.id, direction: 'down' }), className: "text-sm px-3 py-1 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 hover:bg-rose-500/20 transition-colors", children: "\uD83D\uDC4E Not helpful" })] })] })] })), _jsxs("div", { className: "card space-y-4", children: [_jsxs("div", { className: "flex items-center justify-between pb-3 border-b border-slate-200/80 dark:border-slate-800", children: [_jsx("h2", { className: "text-base font-bold text-slate-900 dark:text-white", children: "\uD83D\uDCDA Knowledge Base" }), _jsxs("span", { className: "text-xs font-mono text-slate-500", children: [learnings.length, " learnings"] })] }), isLoading ? (_jsx("div", { className: "space-y-2", children: [1, 2, 3].map((i) => _jsx("div", { className: "h-16 rounded-xl bg-slate-100 dark:bg-surface-850 animate-pulse" }, i)) })) : learnings.length === 0 ? (_jsxs("div", { className: "py-12 text-center text-slate-500 space-y-2", children: [_jsx("p", { className: "text-3xl", children: "\uD83E\uDDE0" }), _jsx("p", { className: "text-sm font-medium", children: "No learnings yet" }), _jsx("p", { className: "text-xs", children: "Submit resolution feedback above to extract the first incident learning!" })] })) : (_jsx("div", { className: "space-y-2", children: learnings.map((l) => (_jsx("button", { onClick: () => setActiveLearning(l), className: "w-full text-left p-4 rounded-xl bg-slate-100/60 dark:bg-surface-850 border border-slate-200/80 dark:border-slate-800 hover:border-brand-500/40 transition-colors group", children: _jsxs("div", { className: "flex items-start justify-between gap-3", children: [_jsxs("div", { className: "flex-1 min-w-0 space-y-1.5", children: [_jsx("p", { className: "text-sm font-bold text-slate-900 dark:text-white group-hover:text-brand-500 truncate", children: l.incidentTitle }), _jsxs("div", { className: "flex flex-wrap gap-2 items-center", children: [_jsx("span", { className: `badge ${SEV_BADGE[l.severity] ?? 'badge-slate'} text-[10px]`, children: l.severity }), _jsx("span", { className: "text-[11px] font-mono text-slate-600 dark:text-slate-400", children: l.rootCausePattern.replace(/_/g, ' ') }), l.ttmMins && (_jsxs("span", { className: "text-[11px] text-slate-500 font-mono", children: ["TTM: ", l.ttmMins, "m"] })), _jsx("span", { className: "text-[10px] text-slate-400 font-mono", children: l.model })] }), _jsx("div", { className: "w-48", children: _jsx(ConfidenceBar, { score: l.confidenceScore }) })] }), _jsxs("div", { className: "flex-shrink-0 text-right space-y-1", children: [_jsxs("p", { className: "text-[11px] text-slate-500 font-mono", children: [l.usefulnessVotes >= 0 ? '+' : '', l.usefulnessVotes, " votes"] }), _jsx("p", { className: "text-[10px] text-slate-400", children: new Date(l.createdAt).toLocaleDateString() })] })] }) }, l.id))) }))] })] }));
}
