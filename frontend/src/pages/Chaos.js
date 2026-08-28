import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
const EXPERIMENT_TYPES = [
    { value: 'HIGH_LATENCY', label: '🐢 High Latency', description: 'Adds 800ms delay to all API responses', color: 'border-amber-500/40 bg-amber-500/5' },
    { value: 'SERVICE_ERROR', label: '💥 Service Errors', description: 'Returns 500 errors at 40% probability', color: 'border-red-500/40 bg-red-500/5' },
    { value: 'HIGH_CPU', label: '🔥 High CPU', description: 'Spins CPU to simulate compute pressure', color: 'border-orange-500/40 bg-orange-500/5' },
    { value: 'DB_SLOWDOWN', label: '🗄️ DB Slowdown', description: 'Slows database query responses', color: 'border-purple-500/40 bg-purple-500/5' },
    { value: 'MEMORY_PRESSURE', label: '🧠 Memory Pressure', description: 'Allocates memory to simulate pressure', color: 'border-blue-500/40 bg-blue-500/5' },
];
const STATUS_BADGE = {
    PENDING: 'badge badge-yellow',
    RUNNING: 'badge badge-red',
    COMPLETED: 'badge badge-green',
    FAILED: 'badge badge-red',
    STOPPED: 'badge badge-blue',
};
function duration(ms) {
    return ms >= 60000 ? `${ms / 60000}m` : `${ms / 1000}s`;
}
export default function Chaos() {
    const qc = useQueryClient();
    const [selectedType, setSelectedType] = useState('HIGH_LATENCY');
    const [name, setName] = useState('');
    const [durationMs, setDurationMs] = useState(30000);
    const [error, setError] = useState('');
    const { data: experiments = [] } = useQuery({
        queryKey: ['chaos-experiments'],
        queryFn: async () => (await api.get('/chaos/experiments')).data,
        refetchInterval: 3000,
    });
    const running = experiments.find((e) => e.status === 'RUNNING');
    const create = useMutation({
        mutationFn: (body) => api.post('/chaos/experiments', body),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['chaos-experiments'] });
            qc.invalidateQueries({ queryKey: ['incidents'] });
            setName('');
            setError('');
        },
        onError: (err) => {
            setError(err?.response?.data?.error ?? 'Failed to start experiment');
        },
    });
    const stop = useMutation({
        mutationFn: (id) => api.post(`/chaos/experiments/${id}/stop`),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['chaos-experiments'] }),
    });
    const handleLaunch = () => {
        if (!name.trim()) {
            setError('Give your experiment a name');
            return;
        }
        create.mutate({ name: name.trim(), type: selectedType, durationMs });
    };
    return (_jsxs("div", { className: "p-6 space-y-6", children: [_jsxs("div", { children: [_jsx("h1", { className: "text-xl font-bold text-slate-100", children: "Chaos Engineering" }), _jsx("p", { className: "text-slate-400 text-sm mt-0.5", children: "Inject failures to test system resilience" })] }), _jsxs("div", { className: "card space-y-5", children: [_jsx("h2", { className: "text-sm font-semibold text-slate-300", children: "Launch Experiment" }), _jsx("div", { className: "grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3", children: EXPERIMENT_TYPES.map(({ value, label, description, color }) => (_jsxs("button", { onClick: () => setSelectedType(value), className: `text-left rounded-lg border p-3 transition-colors ${selectedType === value
                                ? color + ' border-opacity-100'
                                : 'border-white/8 bg-surface-700 hover:bg-surface-600'}`, children: [_jsx("p", { className: "text-sm font-medium text-slate-100", children: label }), _jsx("p", { className: "text-xs text-slate-400 mt-0.5", children: description })] }, value))) }), _jsxs("div", { className: "flex gap-3 flex-wrap", children: [_jsx("input", { className: "input flex-1 min-w-48", placeholder: "Experiment name\u2026", value: name, onChange: (e) => setName(e.target.value) }), _jsx("select", { className: "input w-36", value: durationMs, onChange: (e) => setDurationMs(Number(e.target.value)), children: [15000, 30000, 60000, 120000, 300000].map((ms) => (_jsx("option", { value: ms, children: duration(ms) }, ms))) }), _jsx("button", { className: "btn-primary whitespace-nowrap", onClick: handleLaunch, disabled: create.isPending || !!running, children: create.isPending ? 'Launching…' : running ? 'Experiment running…' : '⚡ Launch' })] }), error && _jsx("p", { className: "text-red-400 text-sm bg-red-500/10 px-3 py-2 rounded-lg", children: error }), running && (_jsxs("div", { className: "flex items-center justify-between bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3", children: [_jsxs("div", { children: [_jsxs("p", { className: "text-sm font-medium text-red-300", children: ["\uD83D\uDD34 Active: ", _jsx("span", { className: "text-white", children: running.name })] }), _jsxs("p", { className: "text-xs text-slate-400 mt-0.5", children: [running.type.replace(/_/g, ' '), " \u00B7 ", duration(running.durationMs)] })] }), _jsx("button", { className: "text-xs bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded-lg transition-colors", onClick: () => stop.mutate(running.id), disabled: stop.isPending, children: "Stop" })] }))] }), _jsxs("div", { className: "card", children: [_jsx("h2", { className: "text-sm font-semibold text-slate-300 mb-4", children: "Experiment History" }), experiments.length === 0 ? (_jsx("p", { className: "text-slate-500 text-sm text-center py-8", children: "No experiments yet. Launch one above." })) : (_jsx("div", { className: "space-y-2", children: experiments.map((exp) => (_jsxs("div", { className: "flex items-center justify-between bg-surface-700 rounded-lg px-4 py-3", children: [_jsxs("div", { className: "flex items-center gap-3 min-w-0", children: [_jsxs("span", { className: STATUS_BADGE[exp.status], children: [_jsx("span", { className: `w-1.5 h-1.5 rounded-full ${exp.status === 'RUNNING' ? 'animate-pulse bg-red-400' : 'bg-current'}` }), exp.status] }), _jsxs("div", { className: "min-w-0", children: [_jsx("p", { className: "text-sm text-slate-200 truncate", children: exp.name }), _jsxs("p", { className: "text-xs text-slate-500", children: [exp.type.replace(/_/g, ' '), " \u00B7 ", duration(exp.durationMs)] })] })] }), exp.incident && (_jsx("span", { className: "badge badge-red text-xs flex-shrink-0", children: "Incident created" }))] }, exp.id))) }))] })] }));
}
