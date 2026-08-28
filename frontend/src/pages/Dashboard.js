import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../lib/auth';
import api from '../lib/api';
import { Link } from 'react-router-dom';
const FLAG_LABELS = {
    'chaos:latency': { label: '🐢 High Latency', color: 'text-amber-400' },
    'chaos:error_rate': { label: '💥 Service Errors', color: 'text-red-400' },
    'chaos:db_slowdown': { label: '🗄️ DB Slowdown', color: 'text-purple-400' },
    'chaos:memory_pressure': { label: '🧠 Memory Pressure', color: 'text-blue-400' },
};
const SEVERITY_COLOR = {
    LOW: 'badge-blue',
    MEDIUM: 'badge-yellow',
    HIGH: 'badge-red',
    CRITICAL: 'bg-red-600/30 text-red-300',
};
function elapsed(startedAt) {
    const secs = Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000);
    return secs < 60 ? `${secs}s` : `${Math.floor(secs / 60)}m ${secs % 60}s`;
}
function progress(startedAt, durationMs) {
    return Math.min(100, Math.round(((Date.now() - new Date(startedAt).getTime()) / durationMs) * 100));
}
function timeAgo(iso) {
    const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
    if (mins < 1)
        return 'just now';
    if (mins < 60)
        return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    return hrs < 24 ? `${hrs}h ago` : `${Math.floor(hrs / 24)}d ago`;
}
export default function Dashboard() {
    const { user } = useAuth();
    const { data: health, isLoading: healthLoading } = useQuery({
        queryKey: ['health'],
        queryFn: async () => (await api.get('/health/ready')).data,
        refetchInterval: 10000,
    });
    const { data: stats } = useQuery({
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
    const { data: chaosStatus } = useQuery({
        queryKey: ['chaos-status'],
        queryFn: async () => (await api.get('/chaos/status')).data,
        refetchInterval: 3000,
    });
    // Recent open incidents (all sources — chaos + alerts)
    const { data: recentIncidents = [] } = useQuery({
        queryKey: ['dashboard-incidents'],
        queryFn: async () => (await api.get('/incidents', { params: { status: 'OPEN' } })).data,
        refetchInterval: 5000,
        select: (data) => data.slice(0, 5),
    });
    const statCards = [
        { label: 'Open Incidents', value: stats ? String(stats.openIncidents) : '—', badge: 'Live', color: stats?.openIncidents ? 'badge-red' : 'badge-green' },
        { label: 'Chaos Experiments', value: stats ? String(stats.totalExperiments) : '—', badge: 'Live', color: 'badge-yellow' },
        { label: 'AI Remediations', value: '—', badge: 'Week 7', color: 'badge-blue' },
        { label: 'Cost Savings (USD)', value: '—', badge: 'Week 8', color: 'badge-blue' },
    ];
    const activeExp = chaosStatus?.active ?? null;
    const activeFlags = chaosStatus?.activeFlags ?? {};
    const flagKeys = Object.keys(activeFlags);
    return (_jsxs("div", { className: "p-6 space-y-6", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { children: [_jsx("h1", { className: "text-xl font-bold text-slate-100", children: "Operations Dashboard" }), _jsxs("p", { className: "text-slate-400 text-sm mt-0.5", children: ["Welcome back, ", user?.email] })] }), _jsxs("span", { className: `badge ${health?.status === 'ready' ? 'badge-green' : 'badge-red'}`, children: [_jsx("span", { className: `w-1.5 h-1.5 rounded-full ${health?.status === 'ready' ? 'bg-emerald-400' : 'bg-red-400'} animate-pulse` }), healthLoading ? 'Checking…' : health?.status === 'ready' ? 'All Systems Operational' : 'Degraded'] })] }), _jsx("div", { className: "grid grid-cols-2 gap-4 lg:grid-cols-4", children: statCards.map(({ label, value, badge, color }) => (_jsxs("div", { className: "card", children: [_jsxs("div", { className: "flex items-start justify-between mb-3", children: [_jsx("p", { className: "text-slate-400 text-xs", children: label }), _jsx("span", { className: `badge ${color}`, children: badge })] }), _jsx("p", { className: "text-2xl font-bold text-slate-100", children: value })] }, label))) }), _jsxs("div", { className: `card border ${activeExp ? 'border-red-500/30 bg-red-500/5' : 'border-white/8'}`, children: [_jsxs("div", { className: "flex items-center justify-between mb-3", children: [_jsx("h2", { className: "text-sm font-semibold text-slate-300", children: "Live Chaos Status" }), activeExp ? (_jsxs("span", { className: "badge badge-red", children: [_jsx("span", { className: "w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" }), "RUNNING"] })) : (_jsxs("span", { className: "badge badge-green", children: [_jsx("span", { className: "w-1.5 h-1.5 rounded-full bg-emerald-400" }), "All Clear"] }))] }), activeExp ? (_jsxs("div", { className: "space-y-3", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { children: [_jsx("p", { className: "text-sm font-medium text-slate-100", children: activeExp.name }), _jsxs("p", { className: "text-xs text-slate-400 mt-0.5", children: [activeExp.type.replace(/_/g, ' '), " \u00B7 ", elapsed(activeExp.startedAt), " elapsed"] })] }), _jsxs("p", { className: "text-xs text-slate-400", children: [Math.round(activeExp.durationMs / 1000), "s total"] })] }), _jsx("div", { className: "w-full bg-surface-700 rounded-full h-1.5", children: _jsx("div", { className: "bg-red-500 h-1.5 rounded-full transition-all duration-1000", style: { width: `${progress(activeExp.startedAt, activeExp.durationMs)}%` } }) }), flagKeys.length > 0 && (_jsx("div", { className: "flex flex-wrap gap-2 pt-1", children: flagKeys.map((key) => {
                                    const meta = FLAG_LABELS[key];
                                    return (_jsxs("span", { className: `text-xs font-medium ${meta?.color ?? 'text-slate-400'}`, children: [meta?.label ?? key, " (", activeFlags[key], "ms)"] }, key));
                                }) }))] })) : (_jsx("p", { className: "text-slate-500 text-sm", children: "No experiment running. Head to Chaos to launch one." }))] }), _jsxs("div", { className: "card", children: [_jsxs("div", { className: "flex items-center justify-between mb-4", children: [_jsx("h2", { className: "text-sm font-semibold text-slate-300", children: "Recent Open Incidents" }), _jsx(Link, { to: "/incidents", className: "text-xs text-brand-400 hover:text-brand-300 transition-colors", children: "View all \u2192" })] }), recentIncidents.length === 0 ? (_jsx("p", { className: "text-slate-500 text-sm text-center py-4", children: "\u2705 No open incidents \u2014 system is healthy." })) : (_jsx("div", { className: "space-y-2", children: recentIncidents.map((inc) => (_jsxs("div", { className: "flex items-center gap-3 bg-surface-700 rounded-lg px-3 py-2.5", children: [_jsx("span", { className: `badge ${SEVERITY_COLOR[inc.severity]}`, children: inc.severity }), _jsx("span", { className: "text-xs text-slate-500 flex-shrink-0", children: inc.source === 'ALERT' ? '🔔 Alert' : '⚡ Chaos' }), _jsx("p", { className: "text-sm text-slate-200 flex-1 truncate", children: inc.title }), _jsx("p", { className: "text-xs text-slate-500 flex-shrink-0", children: timeAgo(inc.createdAt) })] }, inc.id))) }))] }), _jsxs("div", { className: "card", children: [_jsx("h2", { className: "text-sm font-semibold text-slate-300 mb-4", children: "System Health" }), _jsx("div", { className: "grid grid-cols-2 gap-3 sm:grid-cols-3", children: [
                            { name: 'API Server', status: health?.status === 'ready' ? 'ok' : 'unknown' },
                            { name: 'Database', status: health?.checks?.database ?? 'unknown' },
                            { name: 'Redis', status: health?.checks?.redis ?? 'unknown' },
                        ].map(({ name, status }) => (_jsxs("div", { className: "flex items-center gap-3 bg-surface-700 rounded-lg px-3 py-2.5", children: [_jsx("span", { className: `w-2 h-2 rounded-full flex-shrink-0 ${status === 'ok' ? 'bg-emerald-400' : status === 'error' ? 'bg-red-400' : 'bg-slate-500'}` }), _jsxs("div", { children: [_jsx("p", { className: "text-sm text-slate-200", children: name }), _jsx("p", { className: `text-xs capitalize ${status === 'ok' ? 'text-emerald-400' : status === 'error' ? 'text-red-400' : 'text-slate-500'}`, children: status })] })] }, name))) })] }), _jsxs("div", { className: "card", children: [_jsx("h2", { className: "text-sm font-semibold text-slate-300 mb-4", children: "15-Level Roadmap" }), _jsx("div", { className: "flex flex-wrap gap-2", children: Array.from({ length: 15 }, (_, i) => {
                            const level = i + 1;
                            const COMPLETED_LEVELS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];
                            const done = COMPLETED_LEVELS.includes(level);
                            return (_jsx("div", { title: `Level ${level}`, className: `w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold transition-colors ${done ? 'bg-brand-600 text-white shadow-neu-light-flat-sm dark:shadow-neu-dark-flat-sm' : 'bg-surface-700 text-slate-600'}`, children: level }, level));
                        }) }), _jsx("p", { className: "text-emerald-400 font-extrabold text-xs mt-3 flex items-center gap-1.5", children: _jsx("span", { children: "\uD83C\uDF89 ALL 15 LEVELS COMPLETED! (15 / 15 levels 100% operational)" }) }), _jsx(Link, { to: "/demo", className: "mt-3 inline-flex items-center gap-2 text-xs font-bold px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white transition-colors shadow-neu-light-flat-sm dark:shadow-neu-dark-flat-sm", children: "\uD83C\uDFAF Launch Recruiter Demo Mode" })] })] }));
}
