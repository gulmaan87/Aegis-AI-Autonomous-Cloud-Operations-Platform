import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
const STATUS_BADGE = {
    IDLE: 'badge-slate',
    ANALYZING: 'badge-yellow',
    PROPOSING_ACTION: 'badge-blue',
    EXECUTING: 'badge-red',
    CONSENSUS_REACHED: 'badge-green',
};
const VOTE_STYLE = {
    APPROVE: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    REJECT: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
    MODIFY: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
};
const AGENT_COLORS = {
    SRE_AGENT: 'from-blue-500/20 to-blue-600/10 border-blue-500/30',
    FINOPS_AGENT: 'from-emerald-500/20 to-emerald-600/10 border-emerald-500/30',
    SECOPS_AGENT: 'from-violet-500/20 to-violet-600/10 border-violet-500/30',
    CHAOS_AGENT: 'from-rose-500/20 to-rose-600/10 border-rose-500/30',
};
const SUGGESTED_TOPICS = [
    'System Reliability, Cost Optimization & Security Hardening',
    'Incident Recovery: High Latency & SLO Breach',
    'Pre-Production Chaos Validation & Resilience Assessment',
    'Critical CVE Remediation & Compliance Sprint',
];
export default function MultiAgent() {
    const qc = useQueryClient();
    const [topic, setTopic] = useState('');
    const [activeSession, setActiveSession] = useState(null);
    const { data: agents = [], isLoading: agentsLoading } = useQuery({
        queryKey: ['multi-agent-agents'],
        queryFn: () => api.get('/multi-agent/agents').then((r) => r.data),
        refetchInterval: 5000,
    });
    const { data: sessions = [] } = useQuery({
        queryKey: ['multi-agent-sessions'],
        queryFn: () => api.get('/multi-agent/sessions').then((r) => r.data),
        refetchInterval: 10000,
    });
    const deliberate = useMutation({
        mutationFn: (t) => api.post('/multi-agent/deliberate', { topic: t }),
        onSuccess: (res) => {
            const { session, messages, finalDecision } = res.data;
            setActiveSession({ ...session, messages, finalDecision });
            qc.invalidateQueries({ queryKey: ['multi-agent-agents'] });
            qc.invalidateQueries({ queryKey: ['multi-agent-sessions'] });
        },
    });
    const handleDeliberate = () => {
        deliberate.mutate(topic || SUGGESTED_TOPICS[0]);
    };
    return (_jsxs("div", { className: "p-6 space-y-6", children: [_jsx("div", { className: "flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4", children: _jsxs("div", { children: [_jsx("h1", { className: "text-2xl font-extrabold tracking-tight flex items-center gap-2 text-slate-900 dark:text-white", children: "\uD83E\uDD16 Multi-Agent AI Collaboration Mesh" }), _jsx("p", { className: "text-slate-500 dark:text-slate-400 text-sm mt-1", children: "Coordinated autonomous AI agents deliberate, propose domain-specific actions, vote on consensus, and execute coordinated cloud ops plans." })] }) }), _jsx("div", { className: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4", children: agentsLoading
                    ? Array.from({ length: 4 }).map((_, i) => (_jsx("div", { className: "card animate-pulse h-36" }, i)))
                    : agents.map((agent) => (_jsxs("div", { className: `card bg-gradient-to-br border ${AGENT_COLORS[agent.agentRole] ?? 'from-slate-500/10 to-slate-600/5 border-slate-500/20'} space-y-3`, children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsx("span", { className: "text-2xl", children: agent.emoji }), _jsx("span", { className: `badge ${STATUS_BADGE[agent.status] ?? 'badge-slate'} text-[10px]`, children: agent.status.replace('_', ' ') })] }), _jsxs("div", { children: [_jsx("p", { className: "font-bold text-sm text-slate-900 dark:text-white", children: agent.displayName }), _jsx("p", { className: "text-[11px] text-slate-500 mt-0.5", children: agent.domain })] }), _jsxs("div", { className: "space-y-1", children: [_jsxs("div", { className: "flex items-center justify-between text-xs", children: [_jsx("span", { className: "text-slate-500", children: "Health" }), _jsxs("span", { className: "font-mono font-bold text-emerald-400", children: [agent.healthScore.toFixed(1), "%"] })] }), _jsx("div", { className: "w-full bg-slate-200 dark:bg-slate-800 rounded-full h-1.5", children: _jsx("div", { className: "bg-emerald-500 h-1.5 rounded-full transition-all", style: { width: `${agent.healthScore}%` } }) }), _jsxs("p", { className: "text-[11px] text-slate-500 font-mono", children: [agent.insightsCount, " insights generated"] })] })] }, agent.agentRole))) }), _jsxs("div", { className: "card space-y-4", children: [_jsx("h2", { className: "text-base font-bold text-slate-900 dark:text-white", children: "\u26A1 Run Agent Mesh Deliberation" }), _jsxs("div", { className: "flex flex-col sm:flex-row gap-3", children: [_jsx("input", { type: "text", placeholder: "Enter deliberation topic or select a suggestion below\u2026", value: topic, onChange: (e) => setTopic(e.target.value), className: "input flex-1" }), _jsx("button", { onClick: handleDeliberate, disabled: deliberate.isPending, className: "btn-primary whitespace-nowrap flex items-center gap-2", children: deliberate.isPending ? (_jsxs(_Fragment, { children: [_jsx("span", { className: "w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" }), "Agents deliberating\u2026"] })) : ('⚡ Start Deliberation') })] }), _jsx("div", { className: "flex flex-wrap gap-2", children: SUGGESTED_TOPICS.map((t) => (_jsx("button", { onClick: () => setTopic(t), className: "text-xs px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-surface-850 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-brand-500/50 hover:text-brand-500 transition-colors font-mono", children: t }, t))) })] }), (activeSession || deliberate.isPending) && (_jsxs("div", { className: "card space-y-4", children: [_jsxs("div", { className: "flex items-center justify-between pb-3 border-b border-slate-200/80 dark:border-slate-800", children: [_jsx("h2", { className: "text-base font-bold text-slate-900 dark:text-white", children: "\uD83D\uDDE3\uFE0F Agent Deliberation Feed" }), activeSession && (_jsx("span", { className: `badge ${activeSession.consensusReached ? 'badge-green' : 'badge-yellow'}`, children: activeSession.consensusReached ? '✅ CONSENSUS REACHED' : '⏳ DELIBERATING' }))] }), deliberate.isPending && !activeSession && (_jsxs("div", { className: "flex flex-col items-center gap-3 py-8 text-slate-500", children: [_jsx("div", { className: "w-8 h-8 border-4 border-brand-500/30 border-t-brand-500 rounded-full animate-spin" }), _jsx("p", { className: "text-sm font-mono animate-pulse", children: "Spawning 4 autonomous agents\u2026 building deliberation mesh\u2026" })] })), activeSession && (_jsx("div", { className: "space-y-3 max-h-[500px] overflow-y-auto pr-1", children: activeSession.messages.map((msg, i) => (_jsxs("div", { className: "flex gap-3 animate-in fade-in slide-in-from-left-2 duration-300", style: { animationDelay: `${i * 80}ms` }, children: [_jsx("div", { className: "w-9 h-9 rounded-xl flex items-center justify-center text-lg flex-shrink-0 bg-slate-100 dark:bg-surface-850 border border-slate-200 dark:border-slate-800", children: msg.emoji }), _jsxs("div", { className: "flex-1 space-y-1.5", children: [_jsxs("div", { className: "flex items-center gap-2 flex-wrap", children: [_jsx("span", { className: "text-xs font-bold text-slate-900 dark:text-white", children: msg.displayName }), msg.vote && (_jsx("span", { className: `text-[10px] font-bold px-2 py-0.5 rounded border ${VOTE_STYLE[msg.vote]}`, children: msg.vote })), _jsx("span", { className: "text-[10px] font-mono text-slate-500", children: new Date(msg.timestamp).toLocaleTimeString() })] }), _jsx("p", { className: "text-xs text-slate-600 dark:text-slate-300 leading-relaxed", children: msg.message }), msg.actionProposed && (_jsxs("div", { className: "mt-1 p-2 rounded-lg bg-brand-500/10 border border-brand-500/20 text-[11px] font-mono text-brand-400", children: ["\uD83D\uDCCB Action: ", msg.actionProposed] }))] })] }, i))) }))] })), activeSession?.finalDecision && activeSession.consensusReached && (_jsxs("div", { className: "card border-2 border-emerald-500/30 space-y-3", children: [_jsxs("div", { className: "flex items-center gap-2 pb-3 border-b border-slate-200/80 dark:border-slate-800", children: [_jsx("span", { className: "text-lg", children: "\uD83E\uDD1D" }), _jsx("h2", { className: "text-base font-bold text-slate-900 dark:text-white", children: "Agreed Coordinated Action Plan" }), _jsx("span", { className: "badge badge-green ml-auto", children: "CONSENSUS 4/4" })] }), _jsx("div", { className: "prose prose-sm dark:prose-invert prose-slate max-w-none", children: _jsx("pre", { className: "whitespace-pre-wrap font-sans text-xs text-slate-700 dark:text-slate-200 leading-relaxed", children: activeSession.finalDecision }) })] })), sessions.length > 0 && (_jsxs("div", { className: "card space-y-4", children: [_jsxs("div", { className: "flex items-center justify-between pb-3 border-b border-slate-200/80 dark:border-slate-800", children: [_jsx("h2", { className: "text-base font-bold text-slate-900 dark:text-white", children: "\uD83D\uDCCB Session History" }), _jsxs("span", { className: "text-xs font-mono text-slate-500", children: [sessions.length, " sessions"] })] }), _jsx("div", { className: "space-y-2", children: sessions.map((s) => (_jsxs("button", { onClick: () => setActiveSession(s), className: "w-full text-left p-3 rounded-xl bg-slate-100/60 dark:bg-surface-850 border border-slate-200/80 dark:border-slate-800 hover:border-brand-500/40 transition-colors flex items-center justify-between group", children: [_jsxs("div", { children: [_jsx("p", { className: "text-xs font-bold text-slate-900 dark:text-white group-hover:text-brand-500", children: s.topic }), _jsxs("p", { className: "text-[11px] font-mono text-slate-500 mt-0.5", children: [new Date(s.createdAt).toLocaleString(), " \u00B7 ", s.messages.length, " messages"] })] }), _jsx("span", { className: `badge ${s.consensusReached ? 'badge-green' : 'badge-yellow'} ml-4 flex-shrink-0`, children: s.consensusReached ? 'CONSENSUS' : 'PARTIAL' })] }, s.id))) })] }))] }));
}
