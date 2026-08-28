import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
const ACTION_LABELS = {
    STOP_CHAOS_EXPERIMENT: '🛑 Stop Active Chaos Experiment',
    CLEAR_REDIS_FLAGS: '🧹 Clear Redis Stress Flags',
    RESTART_CONTAINER: '🔄 Hot-Restart API Container',
    SCALE_SERVICE: '📈 Scale Backend Replicas (AKS)',
};
const RUN_STATUS_BADGE = {
    PENDING: 'badge bg-slate-500/20 text-slate-400',
    RUNNING: 'badge badge-yellow animate-pulse',
    SUCCESS: 'badge badge-green',
    FAILED: 'badge badge-red',
};
function formatTime(iso) {
    if (!iso)
        return '—';
    return new Date(iso).toLocaleString();
}
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
// ── Policy Config Card ────────────────────────────────────────────────────────
function PolicyCard({ policy }) {
    const qc = useQueryClient();
    const [cooldown, setCooldown] = useState(policy.cooldownSec);
    const [isEditingCooldown, setIsEditingCooldown] = useState(false);
    const updatePolicy = useMutation({
        mutationFn: (updates) => api.patch(`/self-healing/policies/${policy.id}`, updates),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['self-healing-policies'] });
        },
    });
    const handleToggle = () => {
        updatePolicy.mutate({ isEnabled: !policy.isEnabled });
    };
    const handleSaveCooldown = () => {
        updatePolicy.mutate({ cooldownSec: cooldown });
        setIsEditingCooldown(false);
    };
    return (_jsxs("div", { className: "card-neu flex flex-col md:flex-row md:items-center justify-between gap-4", children: [_jsxs("div", { className: "space-y-1.5 flex-1", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("span", { className: "font-semibold text-slate-800 dark:text-slate-100", children: policy.alertName }), _jsx("span", { className: `badge ${policy.isEnabled ? 'badge-green' : 'bg-slate-400/20 dark:bg-slate-500/20 text-slate-500'}`, children: policy.isEnabled ? 'ENABLED' : 'DISABLED' })] }), _jsx("p", { className: "text-xs text-brand-600 dark:text-brand-400 font-medium", children: ACTION_LABELS[policy.actionType] }), _jsxs("div", { className: "text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-4", children: [_jsxs("span", { children: ["Last Triggered: ", _jsx("span", { className: "text-slate-700 dark:text-slate-300", children: formatTime(policy.lastTriggeredAt) })] }), _jsxs("div", { className: "flex items-center gap-1", children: [_jsx("span", { children: "Cooldown:" }), isEditingCooldown ? (_jsxs("div", { className: "flex items-center gap-1.5", children: [_jsx("input", { type: "number", value: cooldown, onChange: (e) => setCooldown(parseInt(e.target.value) || 10), className: "input w-16 py-0.5 px-1 text-[11px]", min: 10, max: 3600 }), _jsx("button", { onClick: handleSaveCooldown, className: "text-emerald-500 dark:text-emerald-400 hover:text-emerald-600 dark:hover:text-emerald-300", children: "\u2713" }), _jsx("button", { onClick: () => {
                                                    setCooldown(policy.cooldownSec);
                                                    setIsEditingCooldown(false);
                                                }, className: "text-red-500 dark:text-red-400 hover:text-red-600 dark:hover:text-red-300", children: "\u2715" })] })) : (_jsxs("span", { onClick: () => setIsEditingCooldown(true), className: "text-slate-600 dark:text-slate-300 underline decoration-dotted cursor-pointer hover:text-slate-900 dark:hover:text-white", children: [policy.cooldownSec, "s"] }))] })] })] }), _jsx("div", { className: "flex items-center justify-end", children: _jsx("button", { onClick: handleToggle, disabled: updatePolicy.isPending, className: `px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${policy.isEnabled
                        ? 'bg-red-500/20 text-red-500 dark:text-red-400 hover:bg-red-500/30'
                        : 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/30'}`, children: policy.isEnabled ? 'Disable' : 'Enable' }) })] }));
}
// ── Main Page Component ───────────────────────────────────────────────────────
export default function SelfHealing() {
    const [expandedRun, setExpandedRun] = useState(null);
    const { data: policies = [], isLoading: policiesLoading } = useQuery({
        queryKey: ['self-healing-policies'],
        queryFn: async () => (await api.get('/self-healing/policies')).data,
        refetchInterval: 10000,
    });
    const { data: runs = [], isLoading: runsLoading } = useQuery({
        queryKey: ['self-healing-runs'],
        queryFn: async () => (await api.get('/self-healing/runs')).data,
        refetchInterval: 5000,
    });
    return (_jsxs("div", { className: "p-6 space-y-6", children: [_jsxs("div", { children: [_jsxs("h1", { className: "text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2", children: [_jsx("span", { children: "\uD83D\uDEE1\uFE0F" }), " Auto-Healing Operations"] }), _jsx("p", { className: "text-slate-500 dark:text-slate-400 text-sm mt-0.5", children: "Configure remediation policies that execute automatically to heal the infrastructure when Prometheus alerts fire." })] }), _jsxs("div", { className: "grid grid-cols-1 xl:grid-cols-3 gap-6", children: [_jsx("div", { className: "xl:col-span-2 space-y-4", children: _jsxs("div", { className: "card", children: [_jsxs("h2", { className: "text-sm font-semibold text-slate-600 dark:text-slate-300 mb-4 flex items-center gap-2", children: [_jsx("span", { children: "\u2699\uFE0F" }), " Remediation Policies"] }), policiesLoading ? (_jsx("p", { className: "text-slate-500 text-sm text-center py-6", children: "Loading policies..." })) : policies.length === 0 ? (_jsx("p", { className: "text-slate-500 text-sm text-center py-6", children: "No policies seeded. Restart application to seed defaults." })) : (_jsx("div", { className: "space-y-3", children: policies.map((policy) => (_jsx(PolicyCard, { policy: policy }, policy.id))) }))] }) }), _jsx("div", { className: "xl:col-span-1 space-y-4", children: _jsxs("div", { className: "card h-full flex flex-col min-h-[500px]", children: [_jsxs("h2", { className: "text-sm font-semibold text-slate-600 dark:text-slate-300 mb-4 flex items-center gap-2", children: [_jsx("span", { children: "\uD83D\uDCCA" }), " Mitigation Execution History"] }), runsLoading ? (_jsx("p", { className: "text-slate-500 text-sm text-center py-6", children: "Loading runs history..." })) : runs.length === 0 ? (_jsx("p", { className: "text-slate-500 text-xs text-center py-10", children: "No self-healing operations executed yet. Firing alerts will trigger auto-mitigation events." })) : (_jsx("div", { className: "space-y-3 flex-1 overflow-y-auto max-h-[600px] scrollbar pr-1", children: runs.map((run) => {
                                        const isExpanded = expandedRun === run.id;
                                        return (_jsxs("div", { className: "card-neu hover:shadow-neu-light-glow dark:hover:shadow-neu-dark-glow transition-all overflow-hidden", children: [_jsxs("button", { onClick: () => setExpandedRun(isExpanded ? null : run.id), className: "w-full text-left p-3.5 flex flex-col gap-1.5 focus:outline-none", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsx("span", { className: RUN_STATUS_BADGE[run.status], children: run.status }), _jsx("span", { className: "text-[10px] text-slate-500", children: timeAgo(run.createdAt) })] }), _jsx("p", { className: "text-xs font-semibold text-slate-700 dark:text-slate-200 truncate", children: run.policy.alertName }), _jsx("p", { className: "text-[10px] text-brand-600 dark:text-brand-400 font-medium", children: ACTION_LABELS[run.policy.actionType] }), run.incident && (_jsxs("p", { className: "text-[9px] text-slate-500 dark:text-slate-400 mt-1 truncate", children: ["Linked Incident: ", run.incident.title] }))] }), isExpanded && (_jsxs("div", { className: "border-t border-slate-200 dark:border-white/5 bg-slate-100 dark:bg-surface-900/60 p-3 space-y-2", children: [_jsx("p", { className: "text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide", children: "Execution Logs" }), _jsx("pre", { className: "panel-inset font-mono text-[9px] leading-relaxed rounded-lg p-2.5 text-slate-700 dark:text-slate-300 overflow-x-auto whitespace-pre-wrap max-h-48 overflow-y-auto scrollbar", children: run.logs }), run.completedAt && (_jsxs("div", { className: "text-[9px] text-slate-500 flex justify-between", children: [_jsx("span", { children: "Completed" }), _jsx("span", { children: formatTime(run.completedAt) })] }))] }))] }, run.id));
                                    }) }))] }) })] })] }));
}
