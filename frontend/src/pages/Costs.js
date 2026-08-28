import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
const STATUS_BADGE = {
    OPTIMAL: 'badge badge-green',
    UNDERUTILIZED: 'badge badge-yellow',
    OVERPROVISIONED: 'badge badge-blue',
    WASTEFUL: 'badge badge-red',
};
const PRIORITY_BADGE = {
    P1: 'badge badge-red',
    P2: 'badge badge-yellow',
    P3: 'badge badge-blue',
};
export default function Costs() {
    const queryClient = useQueryClient();
    const [analyzing, setAnalyzing] = useState(false);
    const { data: resources = [], isLoading: loadingResources } = useQuery({
        queryKey: ['costs-resources'],
        queryFn: async () => (await api.get('/costs/resources')).data,
        refetchInterval: 10000,
    });
    const { data: reports = [], isLoading: loadingReports } = useQuery({
        queryKey: ['costs-reports'],
        queryFn: async () => (await api.get('/costs/reports')).data,
        refetchInterval: 10000,
    });
    const analyzeMutation = useMutation({
        mutationFn: async () => (await api.post('/costs/analyze')).data,
        onMutate: () => setAnalyzing(true),
        onSettled: () => {
            setAnalyzing(false);
            queryClient.invalidateQueries({ queryKey: ['costs-resources'] });
            queryClient.invalidateQueries({ queryKey: ['costs-reports'] });
        },
    });
    const latestReport = reports[0];
    const recommendations = latestReport
        ? (() => {
            try {
                return JSON.parse(latestReport.recommendations);
            }
            catch {
                return [];
            }
        })()
        : [];
    const totalMonthlyCost = latestReport?.totalMonthlyCostUsd ?? 0;
    const projectedSavings = latestReport?.projectedSavingsUsd ?? 0;
    const savingsPct = latestReport?.savingsPct ?? 0;
    const totalMonthlyWaste = resources.reduce((acc, r) => acc + (r.wasteUsd * 24 * 30), 0);
    return (_jsxs("div", { className: "p-6 space-y-6", children: [_jsxs("div", { className: "flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4", children: [_jsxs("div", { children: [_jsx("h1", { className: "text-2xl font-extrabold tracking-tight flex items-center gap-2 text-slate-900 dark:text-white", children: _jsx("span", { children: "\uD83D\uDCB0 Cost & Resource Optimization AI" }) }), _jsx("p", { className: "text-slate-500 dark:text-slate-400 text-sm mt-1", children: "Real-time cloud resource FinOps analytics, waste identification, and automated cost reduction recommendations." })] }), _jsx("button", { onClick: () => analyzeMutation.mutate(), disabled: analyzing, className: "btn-primary self-start sm:self-auto flex items-center gap-2 text-sm", children: analyzing ? (_jsxs(_Fragment, { children: [_jsx("span", { className: "w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin inline-block" }), "Analyzing FinOps Data\u2026"] })) : (_jsx(_Fragment, { children: _jsx("span", { children: "\u26A1 Run Cost Analysis" }) })) })] }), _jsxs("div", { className: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4", children: [_jsxs("div", { className: "card", children: [_jsx("p", { className: "text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider", children: "Total Monthly Cost" }), _jsxs("p", { className: "text-3xl font-extrabold mt-2 text-slate-900 dark:text-white", children: ["$", totalMonthlyCost.toLocaleString(), " ", _jsx("span", { className: "text-xs font-normal text-slate-500", children: "/mo" })] }), _jsx("p", { className: "text-xs text-slate-500 mt-1", children: "Based on 5 active workload specs" })] }), _jsxs("div", { className: "card", children: [_jsx("p", { className: "text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider", children: "Projected Savings" }), _jsxs("p", { className: "text-3xl font-extrabold mt-2 text-emerald-600 dark:text-emerald-400", children: ["$", projectedSavings.toLocaleString(), " ", _jsxs("span", { className: "text-sm font-semibold", children: ["(", savingsPct, "%)"] })] }), _jsx("p", { className: "text-xs text-slate-500 mt-1", children: "Recoverable idle resource budget" })] }), _jsxs("div", { className: "card", children: [_jsx("p", { className: "text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider", children: "Detected Monthly Waste" }), _jsxs("p", { className: "text-3xl font-extrabold mt-2 text-amber-600 dark:text-amber-400", children: ["$", Math.round(totalMonthlyWaste).toLocaleString(), " ", _jsx("span", { className: "text-xs font-normal text-slate-500", children: "/mo" })] }), _jsx("p", { className: "text-xs text-slate-500 mt-1", children: "Unutilized allocated capacity" })] }), _jsxs("div", { className: "card", children: [_jsx("p", { className: "text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider", children: "Analyzed Workloads" }), _jsx("p", { className: "text-3xl font-extrabold mt-2 text-brand-600 dark:text-brand-400", children: resources.length }), _jsx("p", { className: "text-xs text-slate-500 mt-1", children: "Services continuously monitored" })] })] }), _jsxs("div", { className: "card space-y-4", children: [_jsxs("div", { className: "flex items-center justify-between pb-3 border-b border-slate-200/80 dark:border-slate-800", children: [_jsxs("div", { children: [_jsx("h2", { className: "text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2", children: _jsx("span", { children: "\uD83E\uDD16 AI Cost Reduction Recommendations" }) }), _jsxs("p", { className: "text-xs text-slate-500", children: ["Engineered by Aegis FinOps AI (", latestReport?.model ?? 'mock engine', ")"] })] }), latestReport && (_jsxs("span", { className: "text-xs font-mono text-slate-500", children: ["Updated: ", new Date(latestReport.createdAt).toLocaleTimeString()] }))] }), loadingReports ? (_jsxs("div", { className: "py-8 text-center text-slate-500", children: [_jsx("span", { className: "inline-block w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin mb-2" }), _jsx("p", { children: "Evaluating cluster resource waste and generating recommendations\u2026" })] })) : recommendations.length === 0 ? (_jsx("div", { className: "py-8 text-center text-slate-500 text-sm", children: "All workloads are currently operating at optimal efficiency! Click \"Run Cost Analysis\" to re-evaluate." })) : (_jsx("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-4", children: recommendations.map((item, idx) => (_jsxs("div", { className: "p-4 rounded-xl bg-slate-100/60 dark:bg-surface-850 border border-slate-200/80 dark:border-slate-800 space-y-3 flex flex-col justify-between", children: [_jsxs("div", { children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsx("span", { className: "font-bold text-slate-900 dark:text-white text-sm", children: item.service }), _jsxs("span", { className: PRIORITY_BADGE[item.priority], children: ["Priority ", item.priority] })] }), _jsx("p", { className: "text-xs text-slate-600 dark:text-slate-300 mt-2 leading-relaxed", children: item.action })] }), _jsxs("div", { className: "flex items-center justify-between pt-2 border-t border-slate-200/60 dark:border-slate-800", children: [_jsx("span", { className: "text-xs font-semibold text-slate-500", children: "Est. Savings:" }), _jsxs("span", { className: "text-sm font-extrabold text-emerald-600 dark:text-emerald-400 font-mono", children: ["+$", item.estimatedSavingUsd, "/mo"] })] })] }, idx))) }))] }), _jsxs("div", { className: "card", children: [_jsxs("div", { className: "flex items-center justify-between pb-4 mb-4 border-b border-slate-200/80 dark:border-slate-800", children: [_jsx("h2", { className: "text-lg font-bold text-slate-900 dark:text-white", children: "Per-Service Resource Utilization & Waste Breakdown" }), _jsx("span", { className: "text-xs text-slate-500 font-mono", children: "Auto-refreshes every 10s" })] }), loadingResources ? (_jsxs("div", { className: "py-12 text-center text-slate-500", children: [_jsx("span", { className: "inline-block w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin mb-2" }), _jsx("p", { children: "Fetching workload cost records\u2026" })] })) : (_jsx("div", { className: "overflow-x-auto", children: _jsxs("table", { className: "w-full text-left text-sm", children: [_jsx("thead", { children: _jsxs("tr", { className: "border-b border-slate-200/80 dark:border-slate-800 text-xs font-bold uppercase tracking-wider text-slate-500", children: [_jsx("th", { className: "pb-3 px-2", children: "Workload Service" }), _jsx("th", { className: "pb-3 px-2", children: "Allocated Specs" }), _jsx("th", { className: "pb-3 px-2", children: "CPU Utilization" }), _jsx("th", { className: "pb-3 px-2", children: "Memory Utilization" }), _jsx("th", { className: "pb-3 px-2", children: "Monthly Cost" }), _jsx("th", { className: "pb-3 px-2", children: "Monthly Waste" }), _jsx("th", { className: "pb-3 px-2", children: "Efficiency Status" })] }) }), _jsx("tbody", { className: "divide-y divide-slate-200/60 dark:divide-slate-800/60", children: resources.map((item) => {
                                        const monthlyCost = +(item.hourlyCostUsd * 24 * 30).toFixed(2);
                                        const monthlyWaste = +(item.wasteUsd * 24 * 30).toFixed(2);
                                        return (_jsxs("tr", { className: "hover:bg-slate-100/50 dark:hover:bg-slate-800/30 transition-colors", children: [_jsx("td", { className: "py-4 px-2", children: _jsx("p", { className: "font-bold text-slate-900 dark:text-white", children: item.service }) }), _jsxs("td", { className: "py-4 px-2 font-mono text-xs text-slate-600 dark:text-slate-300", children: [item.cpuCores, " Cores \u00B7 ", item.memoryGb, " GB RAM"] }), _jsx("td", { className: "py-4 px-2", children: _jsxs("div", { className: "flex items-center gap-2", children: [_jsx("div", { className: "w-20 bg-slate-200 dark:bg-slate-700 rounded-full h-2", children: _jsx("div", { className: `h-2 rounded-full ${item.cpuUsagePct > 80
                                                                        ? 'bg-rose-500'
                                                                        : item.cpuUsagePct < 25
                                                                            ? 'bg-amber-500'
                                                                            : 'bg-emerald-500'}`, style: { width: `${Math.min(100, item.cpuUsagePct)}%` } }) }), _jsxs("span", { className: "text-xs font-mono font-semibold text-slate-700 dark:text-slate-300", children: [item.cpuUsagePct, "%"] })] }) }), _jsx("td", { className: "py-4 px-2", children: _jsxs("div", { className: "flex items-center gap-2", children: [_jsx("div", { className: "w-20 bg-slate-200 dark:bg-slate-700 rounded-full h-2", children: _jsx("div", { className: `h-2 rounded-full ${item.memoryUsagePct > 80
                                                                        ? 'bg-rose-500'
                                                                        : item.memoryUsagePct < 30
                                                                            ? 'bg-amber-500'
                                                                            : 'bg-emerald-500'}`, style: { width: `${Math.min(100, item.memoryUsagePct)}%` } }) }), _jsxs("span", { className: "text-xs font-mono font-semibold text-slate-700 dark:text-slate-300", children: [item.memoryUsagePct, "%"] })] }) }), _jsxs("td", { className: "py-4 px-2 font-mono font-bold text-slate-900 dark:text-slate-100", children: ["$", monthlyCost] }), _jsxs("td", { className: "py-4 px-2 font-mono font-bold text-amber-600 dark:text-amber-400", children: ["$", monthlyWaste] }), _jsx("td", { className: "py-4 px-2", children: _jsx("span", { className: STATUS_BADGE[item.optimizationStatus], children: item.optimizationStatus }) })] }, item.id));
                                    }) })] }) }))] })] }));
}
