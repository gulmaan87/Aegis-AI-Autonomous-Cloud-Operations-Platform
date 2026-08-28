import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
const SEVERITY_BADGE = {
    LOW: 'badge badge-blue',
    MEDIUM: 'badge badge-yellow',
    HIGH: 'badge badge-red',
    CRITICAL: 'badge bg-red-600/30 text-red-300',
};
const STATUS_BADGE = {
    OPEN: 'badge badge-red',
    INVESTIGATING: 'badge badge-yellow',
    RESOLVED: 'badge badge-green',
};
const STATUS_NEXT = {
    OPEN: { label: 'Investigate', next: 'INVESTIGATING' },
    INVESTIGATING: { label: 'Resolve', next: 'RESOLVED' },
    RESOLVED: null,
};
const RISK_COLOR = {
    LOW: 'text-blue-400 border-blue-500/30 bg-blue-500/10',
    MEDIUM: 'text-amber-400 border-amber-500/30 bg-amber-500/10',
    HIGH: 'text-red-400 border-red-500/30 bg-red-500/10',
    CRITICAL: 'text-red-300 border-red-600/40 bg-red-600/10',
};
function timeAgo(iso) {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1)
        return 'just now';
    if (mins < 60)
        return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24)
        return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
}
function parseSteps(raw) {
    try {
        return JSON.parse(raw);
    }
    catch {
        return [];
    }
}
// ── Postmortem Panel ───────────────────────────────────────────────────────────
function PostmortemPanel({ incident, onSaved }) {
    const [generating, setGenerating] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [pm, setPm] = useState(incident.postmortem ?? null);
    const [draft, setDraft] = useState(incident.postmortem?.content ?? '');
    const [editMode, setEditMode] = useState(false);
    const isDirty = editMode && draft !== pm?.content;
    async function generate() {
        setGenerating(true);
        setError('');
        try {
            const { data } = await api.post(`/incidents/${incident.id}/postmortem`);
            setPm(data);
            setDraft(data.content);
            setEditMode(false);
            onSaved();
        }
        catch (e) {
            setError(e?.response?.data?.error ?? 'Generation failed');
        }
        finally {
            setGenerating(false);
        }
    }
    async function saveEdits() {
        if (!pm)
            return;
        setSaving(true);
        try {
            const { data } = await api.patch(`/incidents/${incident.id}/postmortem`, { content: draft });
            setPm(data);
            setEditMode(false);
            onSaved();
        }
        catch (e) {
            setError(e?.response?.data?.error ?? 'Save failed');
        }
        finally {
            setSaving(false);
        }
    }
    async function setStatus(status) {
        if (!pm)
            return;
        try {
            const { data } = await api.patch(`/incidents/${incident.id}/postmortem`, { status });
            setPm(data);
            onSaved();
        }
        catch { /* silent */ }
    }
    const STATUS_COLOR = {
        DRAFT: 'badge badge-yellow',
        IN_REVIEW: 'badge badge-blue',
        PUBLISHED: 'badge badge-green',
    };
    return (_jsxs("div", { className: "space-y-3 border border-emerald-500/20 rounded-lg p-4 bg-emerald-500/5", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("span", { className: "text-base", children: "\uD83D\uDCCB" }), _jsx("p", { className: "text-sm font-semibold text-emerald-300", children: "AI Postmortem" }), pm && (_jsx("span", { className: STATUS_COLOR[pm.status] ?? 'badge badge-yellow', children: pm.status }))] }), _jsxs("div", { className: "flex items-center gap-2", children: [pm && !editMode && (_jsxs(_Fragment, { children: [pm.status === 'DRAFT' && (_jsx("button", { className: "text-xs text-slate-400 hover:text-blue-300 transition-colors", onClick: () => setStatus('IN_REVIEW'), children: "Send for Review" })), pm.status === 'IN_REVIEW' && (_jsx("button", { className: "text-xs text-slate-400 hover:text-green-300 transition-colors", onClick: () => setStatus('PUBLISHED'), children: "Publish" })), _jsx("button", { className: "text-xs text-slate-400 hover:text-slate-200 transition-colors", onClick: () => setEditMode(true), children: "\u270F\uFE0F Edit" }), _jsx("button", { className: "text-xs text-slate-400 hover:text-slate-200 transition-colors disabled:opacity-50", onClick: generate, disabled: generating, children: generating ? '⏳ Regenerating…' : '🔄 Regenerate' })] })), !pm && (_jsx("button", { className: "text-xs bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-1.5", onClick: generate, disabled: generating, children: generating ? (_jsxs(_Fragment, { children: [_jsx("span", { className: "w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin inline-block" }), "Generating\u2026"] })) : '📋 Generate Postmortem' }))] })] }), error && _jsx("p", { className: "text-red-400 text-xs bg-red-500/10 px-3 py-2 rounded-lg", children: error }), generating && !pm && (_jsxs("div", { className: "space-y-2 animate-pulse", children: [_jsx("div", { className: "h-3 bg-surface-600 rounded w-3/4" }), _jsx("div", { className: "h-3 bg-surface-600 rounded w-full" }), _jsx("div", { className: "h-3 bg-surface-600 rounded w-5/6" }), _jsx("div", { className: "h-3 bg-surface-600 rounded w-2/3" })] })), pm && !editMode && (_jsxs("div", { className: "mt-2", children: [_jsx("pre", { className: "text-xs text-slate-300 whitespace-pre-wrap leading-relaxed font-sans bg-surface-700/50 rounded-lg p-4 max-h-96 overflow-y-auto border border-white/5", children: pm.content }), _jsxs("p", { className: "text-xs text-slate-600 mt-2", children: ["Last updated ", timeAgo(pm.updatedAt), " \u00B7 ", pm.status] })] })), pm && editMode && (_jsxs("div", { className: "space-y-2", children: [_jsx("textarea", { rows: 20, className: "w-full bg-surface-700 border border-white/10 rounded-lg px-3 py-2 text-xs text-slate-200 placeholder-slate-600 resize-y focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono", value: draft, onChange: (e) => setDraft(e.target.value) }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsx("button", { className: "text-xs bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50", onClick: saveEdits, disabled: saving || !isDirty, children: saving ? 'Saving…' : 'Save Changes' }), _jsx("button", { className: "text-xs text-slate-400 hover:text-slate-200 transition-colors", onClick: () => { setDraft(pm.content); setEditMode(false); }, children: "Cancel" })] })] })), !pm && !generating && (_jsx("p", { className: "text-xs text-slate-500", children: "Generate a full SRE postmortem document from this resolved incident \u2014 includes timeline, root cause, action items and lessons learned." }))] }));
}
// ── AI Commander Panel ────────────────────────────────────────────────────────
function AiCommanderPanel({ incident, onAnalyzed }) {
    const [analyzing, setAnalyzing] = useState(false);
    const [error, setError] = useState('');
    const [localAnalysis, setLocalAnalysis] = useState(incident.aiAnalysis);
    async function runAnalysis(force = false) {
        setAnalyzing(true);
        setError('');
        try {
            const { data } = await api.post(`/incidents/${incident.id}/analyze${force ? '?force=true' : ''}`);
            setLocalAnalysis(data);
            onAnalyzed();
        }
        catch (err) {
            setError(err?.response?.data?.error ?? 'Analysis failed');
        }
        finally {
            setAnalyzing(false);
        }
    }
    const analysis = localAnalysis;
    return (_jsxs("div", { className: "space-y-3 border border-brand-500/20 rounded-lg p-4 bg-brand-500/5", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("span", { className: "text-base", children: "\uD83E\uDD16" }), _jsx("p", { className: "text-sm font-semibold text-brand-300", children: "AI Incident Commander" })] }), analysis ? (_jsx("button", { className: "text-xs text-slate-400 hover:text-slate-200 transition-colors disabled:opacity-50", onClick: () => runAnalysis(true), disabled: analyzing, children: analyzing ? '⏳ Re-analyzing…' : '🔄 Re-analyze' })) : (_jsx("button", { className: "text-xs bg-brand-600 hover:bg-brand-700 text-white px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-1.5", onClick: () => runAnalysis(false), disabled: analyzing, children: analyzing ? (_jsxs(_Fragment, { children: [_jsx("span", { className: "w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin inline-block" }), "Analyzing\u2026"] })) : ('🤖 Analyze with AI') }))] }), error && _jsx("p", { className: "text-red-400 text-xs bg-red-500/10 px-3 py-2 rounded-lg", children: error }), analyzing && !analysis && (_jsxs("div", { className: "space-y-2 animate-pulse", children: [_jsx("div", { className: "h-3 bg-surface-600 rounded w-3/4" }), _jsx("div", { className: "h-3 bg-surface-600 rounded w-full" }), _jsx("div", { className: "h-3 bg-surface-600 rounded w-5/6" })] })), analysis && (_jsxs("div", { className: "space-y-4", children: [_jsxs("div", { className: "flex items-center gap-3", children: [_jsxs("span", { className: `text-xs font-bold px-2.5 py-1 rounded-lg border ${RISK_COLOR[analysis.riskScore]}`, children: [analysis.riskScore, " RISK"] }), _jsxs("div", { className: "flex-1 flex items-center gap-2", children: [_jsx("div", { className: "flex-1 bg-surface-700 rounded-full h-1.5", children: _jsx("div", { className: "bg-brand-500 h-1.5 rounded-full transition-all", style: { width: `${analysis.confidence}%` } }) }), _jsxs("span", { className: "text-xs text-slate-400 flex-shrink-0", children: [analysis.confidence, "% confidence"] })] })] }), _jsxs("div", { children: [_jsx("p", { className: "text-xs text-slate-500 mb-1 font-medium uppercase tracking-wide", children: "Root Cause" }), _jsx("p", { className: "text-sm text-slate-200 leading-relaxed", children: analysis.rootCause })] }), _jsxs("div", { children: [_jsx("p", { className: "text-xs text-slate-500 mb-1 font-medium uppercase tracking-wide", children: "Impact" }), _jsx("p", { className: "text-sm text-slate-200 leading-relaxed", children: analysis.impact })] }), _jsxs("div", { children: [_jsx("p", { className: "text-xs text-slate-500 mb-2 font-medium uppercase tracking-wide", children: "Remediation Steps" }), _jsx("ol", { className: "space-y-1.5", children: parseSteps(analysis.remediationSteps).map((step, i) => (_jsxs("li", { className: "flex items-start gap-2 text-sm text-slate-200", children: [_jsx("span", { className: "flex-shrink-0 w-5 h-5 rounded-full bg-brand-600/30 text-brand-300 text-xs flex items-center justify-center font-bold mt-0.5", children: i + 1 }), step] }, i))) })] }), _jsxs("p", { className: "text-xs text-slate-600 pt-1 border-t border-white/5", children: ["Analyzed ", timeAgo(analysis.createdAt), " \u00B7 ", analysis.model] })] })), !analysis && !analyzing && !error && (_jsx("p", { className: "text-xs text-slate-500", children: "AI will analyze incident context, linked experiment, and operator notes to suggest root cause and remediation." }))] }));
}
// ── Main Component ────────────────────────────────────────────────────────────
export default function Incidents() {
    const qc = useQueryClient();
    const [filter, setFilter] = useState('ALL');
    const [expanded, setExpanded] = useState(null);
    const [noteDrafts, setNoteDrafts] = useState({});
    const [noteSaving, setNoteSaving] = useState(null);
    const { data: incidents = [], isLoading } = useQuery({
        queryKey: ['incidents', filter],
        queryFn: async () => (await api.get('/incidents', { params: filter !== 'ALL' ? { status: filter } : {} })).data,
        refetchInterval: 5000,
    });
    const update = useMutation({
        mutationFn: ({ id, status }) => api.patch(`/incidents/${id}`, { status }),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['incidents'] });
            qc.invalidateQueries({ queryKey: ['dashboard-stats'] });
            qc.invalidateQueries({ queryKey: ['chaos-status'] });
        },
    });
    async function saveNote(id) {
        const notes = noteDrafts[id];
        if (notes === undefined)
            return;
        setNoteSaving(id);
        try {
            await api.patch(`/incidents/${id}`, { notes });
            qc.invalidateQueries({ queryKey: ['incidents'] });
            setNoteDrafts((d) => { const n = { ...d }; delete n[id]; return n; });
        }
        finally {
            setNoteSaving(null);
        }
    }
    const openCount = incidents.filter((i) => i.status === 'OPEN').length;
    return (_jsxs("div", { className: "p-6 space-y-6", children: [_jsxs("div", { className: "flex items-start justify-between", children: [_jsxs("div", { children: [_jsx("h1", { className: "text-xl font-bold text-slate-100", children: "Incidents" }), _jsx("p", { className: "text-slate-400 text-sm mt-0.5", children: openCount > 0
                                    ? _jsxs("span", { className: "text-red-400 font-medium", children: [openCount, " open incident", openCount > 1 ? 's' : ''] })
                                    : 'All clear' })] }), _jsx("div", { className: "flex rounded-lg bg-surface-700 p-1 text-xs", children: ['ALL', 'OPEN', 'INVESTIGATING', 'RESOLVED'].map((f) => (_jsx("button", { onClick: () => setFilter(f), className: `px-3 py-1 rounded-md font-medium transition-colors ${filter === f ? 'bg-brand-600 text-white' : 'text-slate-400 hover:text-slate-200'}`, children: f }, f))) })] }), _jsx("div", { className: "card", children: isLoading ? (_jsx("p", { className: "text-slate-500 text-sm text-center py-8", children: "Loading\u2026" })) : incidents.length === 0 ? (_jsx("p", { className: "text-slate-500 text-sm text-center py-8", children: filter === 'ALL' ? 'No incidents yet. Launch a chaos experiment to generate one.' : `No ${filter.toLowerCase()} incidents.` })) : (_jsx("div", { className: "space-y-2", children: incidents.map((inc) => {
                        const nextAction = STATUS_NEXT[inc.status];
                        const isExpanded = expanded === inc.id;
                        const draft = noteDrafts[inc.id] ?? inc.notes ?? '';
                        const isDirty = noteDrafts[inc.id] !== undefined && noteDrafts[inc.id] !== (inc.notes ?? '');
                        return (_jsxs("div", { className: "rounded-lg border border-white/8 overflow-hidden", children: [_jsxs("button", { className: "w-full flex items-center gap-3 px-4 py-3 bg-surface-700 hover:bg-surface-600 transition-colors text-left", onClick: () => setExpanded(isExpanded ? null : inc.id), children: [_jsx("span", { className: SEVERITY_BADGE[inc.severity], children: inc.severity }), _jsx("span", { className: STATUS_BADGE[inc.status], children: inc.status }), inc.aiAnalysis && (_jsx("span", { title: "AI analysis available", className: "text-brand-400 text-xs", children: "\uD83E\uDD16" })), _jsx("p", { className: "flex-1 text-sm text-slate-200 truncate", children: inc.title }), _jsx("p", { className: "text-xs text-slate-500 flex-shrink-0", children: timeAgo(inc.createdAt) }), _jsx("span", { className: "text-slate-500 text-xs", children: isExpanded ? '▲' : '▼' })] }), isExpanded && (_jsxs("div", { className: "px-4 py-3 bg-surface-800 border-t border-white/8 space-y-4", children: [_jsxs("div", { className: "grid grid-cols-2 gap-4 text-xs", children: [_jsxs("div", { children: [_jsx("p", { className: "text-slate-500", children: "Created" }), _jsx("p", { className: "text-slate-300", children: new Date(inc.createdAt).toLocaleString() })] }), inc.resolvedAt && (_jsxs("div", { children: [_jsx("p", { className: "text-slate-500", children: "Resolved" }), _jsx("p", { className: "text-slate-300", children: new Date(inc.resolvedAt).toLocaleString() })] })), inc.experiment && (_jsxs("div", { className: "col-span-2", children: [_jsx("p", { className: "text-slate-500", children: "Linked Experiment" }), _jsxs("p", { className: "text-slate-300", children: [inc.experiment.name, " \u2014 ", inc.experiment.type.replace(/_/g, ' ')] })] }))] }), _jsx(AiCommanderPanel, { incident: inc, onAnalyzed: () => qc.invalidateQueries({ queryKey: ['incidents'] }) }), inc.status === 'RESOLVED' && (_jsx(PostmortemPanel, { incident: inc, onSaved: () => qc.invalidateQueries({ queryKey: ['incidents'] }) })), _jsxs("div", { className: "space-y-2", children: [_jsx("p", { className: "text-xs text-slate-500", children: "Investigation Notes" }), _jsx("textarea", { rows: 3, disabled: inc.status === 'RESOLVED', className: "w-full bg-surface-700 border border-white/10 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-600 resize-none focus:outline-none focus:ring-1 focus:ring-brand-500 disabled:opacity-50 disabled:cursor-not-allowed", placeholder: inc.status === 'RESOLVED' ? 'Incident resolved.' : 'Add investigation notes…', value: draft, onChange: (e) => setNoteDrafts((d) => ({ ...d, [inc.id]: e.target.value })) }), isDirty && (_jsx("button", { className: "text-xs bg-brand-600 hover:bg-brand-700 text-white px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50", onClick: () => saveNote(inc.id), disabled: noteSaving === inc.id, children: noteSaving === inc.id ? 'Saving…' : 'Save Notes' }))] }), nextAction && (_jsx("button", { className: "btn-primary text-xs px-3 py-1.5", onClick: () => update.mutate({ id: inc.id, status: nextAction.next }), disabled: update.isPending, children: nextAction.label }))] }))] }, inc.id));
                    }) })) })] }));
}
