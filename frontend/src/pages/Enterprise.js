import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
const ROLE_BADGE = {
    ADMIN: 'badge-red font-bold',
    OPERATOR: 'badge-yellow font-bold',
    USER: 'badge-slate',
};
export default function Enterprise() {
    const qc = useQueryClient();
    const [activeTab, setActiveTab] = useState('audit');
    const [auditFilter, setAuditFilter] = useState('');
    const [saveSuccess, setSaveSuccess] = useState(false);
    // Queries
    const { data: auditLogs = [], isLoading: auditLoading } = useQuery({
        queryKey: ['enterprise-audit-logs'],
        queryFn: () => api.get('/enterprise/audit-logs').then((r) => r.data),
        refetchInterval: 10000,
    });
    const { data: users = [], isLoading: usersLoading } = useQuery({
        queryKey: ['enterprise-users'],
        queryFn: () => api.get('/enterprise/users').then((r) => r.data),
        refetchInterval: 15000,
    });
    const { data: config } = useQuery({
        queryKey: ['enterprise-config'],
        queryFn: () => api.get('/enterprise/config').then((r) => r.data),
    });
    const { data: diagnostics } = useQuery({
        queryKey: ['enterprise-diagnostics'],
        queryFn: () => api.get('/enterprise/diagnostics').then((r) => r.data),
        refetchInterval: 5000,
    });
    // Settings state
    const [formData, setFormData] = useState({});
    const updateRole = useMutation({
        mutationFn: ({ userId, role }) => api.post('/enterprise/users/role', { userId, role }),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['enterprise-users'] }),
    });
    const saveConfig = useMutation({
        mutationFn: (body) => api.put('/enterprise/config', body),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['enterprise-config'] });
            setSaveSuccess(true);
            setTimeout(() => setSaveSuccess(false), 3000);
        },
    });
    const handleSaveConfig = (e) => {
        e.preventDefault();
        const payload = {
            clusterName: formData.clusterName ?? config?.clusterName,
            environment: formData.environment ?? config?.environment,
            retentionDays: formData.retentionDays ?? config?.retentionDays,
            slackWebhookUrl: formData.slackWebhookUrl ?? config?.slackWebhookUrl,
            pagerDutyIntegrationKey: formData.pagerDutyIntegrationKey ?? config?.pagerDutyIntegrationKey,
            autoRemediationEnabled: formData.autoRemediationEnabled ?? config?.autoRemediationEnabled,
            maxChaosDurationSec: formData.maxChaosDurationSec ?? config?.maxChaosDurationSec,
        };
        saveConfig.mutate(payload);
    };
    const exportAuditLogs = () => {
        const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(auditLogs, null, 2));
        const downloadAnchor = document.createElement('a');
        downloadAnchor.setAttribute('href', dataStr);
        downloadAnchor.setAttribute('download', `aegis_audit_trail_${new Date().toISOString().slice(0, 10)}.json`);
        document.body.appendChild(downloadAnchor);
        downloadAnchor.click();
        downloadAnchor.remove();
    };
    const filteredAuditLogs = auditLogs.filter((l) => l.action.toLowerCase().includes(auditFilter.toLowerCase()) ||
        l.userEmail.toLowerCase().includes(auditFilter.toLowerCase()) ||
        l.resourceTarget.toLowerCase().includes(auditFilter.toLowerCase()));
    return (_jsxs("div", { className: "p-6 space-y-6", children: [_jsxs("div", { className: "flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4", children: [_jsxs("div", { children: [_jsx("h1", { className: "text-2xl font-extrabold tracking-tight flex items-center gap-2 text-slate-900 dark:text-white", children: "\uD83C\uDFE2 Enterprise Platform Center" }), _jsx("p", { className: "text-slate-500 dark:text-slate-400 text-sm mt-1", children: "Multi-tenant RBAC permissions, audit log trail, cluster environment settings, and system health diagnostics." })] }), _jsx("div", { className: "flex items-center gap-2", children: _jsxs("span", { className: "badge badge-green text-xs flex items-center gap-1.5", children: [_jsx("span", { className: "w-2 h-2 rounded-full bg-emerald-400 animate-pulse" }), config?.clusterName ?? 'Aegis-Prod-Cluster', " \u00B7 ", config?.environment ?? 'PRODUCTION'] }) })] }), _jsx("div", { className: "flex border-b border-slate-200 dark:border-slate-800 gap-2 font-semibold text-sm", children: [
                    { id: 'audit', label: '🛡️ Audit Trail Log' },
                    { id: 'rbac', label: '👥 User RBAC & Teams' },
                    { id: 'settings', label: '⚙️ Platform Settings' },
                    { id: 'diagnostics', label: '🩺 System Diagnostics' },
                ].map((t) => (_jsx("button", { onClick: () => setActiveTab(t.id), className: `px-4 py-2.5 border-b-2 transition-colors ${activeTab === t.id
                        ? 'border-brand-500 text-brand-500 font-bold'
                        : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-white'}`, children: t.label }, t.id))) }), activeTab === 'audit' && (_jsxs("div", { className: "card space-y-4", children: [_jsxs("div", { className: "flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200/80 dark:border-slate-800", children: [_jsx("h2", { className: "text-base font-bold text-slate-900 dark:text-white", children: "\uD83D\uDEE1\uFE0F Audit Trail Events" }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsx("input", { type: "text", placeholder: "Filter by action or user\u2026", value: auditFilter, onChange: (e) => setAuditFilter(e.target.value), className: "input text-xs w-48" }), _jsx("button", { onClick: exportAuditLogs, className: "btn-primary text-xs flex items-center gap-1.5 whitespace-nowrap", children: "\uD83D\uDCE5 Export JSON Report" })] })] }), auditLoading ? (_jsx("div", { className: "space-y-2", children: [1, 2, 3].map((i) => _jsx("div", { className: "h-12 bg-slate-100 dark:bg-surface-850 animate-pulse rounded-xl" }, i)) })) : filteredAuditLogs.length === 0 ? (_jsx("div", { className: "py-12 text-center text-slate-500 text-xs font-mono", children: "No audit log entries recorded matching filter." })) : (_jsx("div", { className: "overflow-x-auto", children: _jsxs("table", { className: "w-full text-left text-xs font-mono", children: [_jsx("thead", { children: _jsxs("tr", { className: "border-b border-slate-200/80 dark:border-slate-800 text-slate-500 uppercase font-bold text-[10px]", children: [_jsx("th", { className: "py-2.5 px-3", children: "Timestamp" }), _jsx("th", { className: "py-2.5 px-3", children: "User" }), _jsx("th", { className: "py-2.5 px-3", children: "Action" }), _jsx("th", { className: "py-2.5 px-3", children: "Resource Target" }), _jsx("th", { className: "py-2.5 px-3", children: "IP Address" })] }) }), _jsx("tbody", { className: "divide-y divide-slate-200/60 dark:divide-slate-800/60", children: filteredAuditLogs.map((log) => (_jsxs("tr", { className: "hover:bg-slate-100/50 dark:hover:bg-surface-850/50", children: [_jsx("td", { className: "py-2.5 px-3 text-slate-500 font-mono", children: new Date(log.createdAt).toLocaleString() }), _jsx("td", { className: "py-2.5 px-3 font-bold text-slate-900 dark:text-white", children: log.userEmail }), _jsx("td", { className: "py-2.5 px-3", children: _jsx("span", { className: "badge badge-blue text-[10px]", children: log.action }) }), _jsx("td", { className: "py-2.5 px-3 text-brand-400 font-bold", children: log.resourceTarget }), _jsx("td", { className: "py-2.5 px-3 text-slate-500", children: log.ipAddress ?? '127.0.0.1' })] }, log.id))) })] }) }))] })), activeTab === 'rbac' && (_jsxs("div", { className: "card space-y-4", children: [_jsxs("div", { className: "flex items-center justify-between pb-3 border-b border-slate-200/80 dark:border-slate-800", children: [_jsxs("div", { children: [_jsx("h2", { className: "text-base font-bold text-slate-900 dark:text-white", children: "\uD83D\uDC65 User Management & Role-Based Access Control (RBAC)" }), _jsx("p", { className: "text-xs text-slate-500 mt-0.5", children: "Manage team member roles and operational permission boundaries." })] }), _jsxs("span", { className: "text-xs font-mono text-slate-500", children: [users.length, " registered users"] })] }), usersLoading ? (_jsx("div", { className: "space-y-2", children: [1, 2].map((i) => _jsx("div", { className: "h-16 bg-slate-100 dark:bg-surface-850 animate-pulse rounded-xl" }, i)) })) : (_jsx("div", { className: "space-y-3", children: users.map((u) => (_jsxs("div", { className: "p-4 rounded-xl bg-slate-100/60 dark:bg-surface-850 border border-slate-200/80 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3", children: [_jsxs("div", { className: "space-y-1", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("p", { className: "text-sm font-bold text-slate-900 dark:text-white", children: u.email }), _jsx("span", { className: `badge ${ROLE_BADGE[u.role] ?? 'badge-slate'} text-[10px]`, children: u.role })] }), _jsxs("p", { className: "text-xs text-slate-500 font-mono", children: ["Joined: ", new Date(u.createdAt).toLocaleDateString()] })] }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsx("span", { className: "text-xs text-slate-500 font-medium mr-1", children: "Promote role:" }), ['USER', 'OPERATOR', 'ADMIN'].map((r) => (_jsx("button", { onClick: () => updateRole.mutate({ userId: u.id, role: r }), disabled: u.role === r || updateRole.isPending, className: `text-xs px-2.5 py-1 rounded-lg font-bold transition-all ${u.role === r
                                                ? 'bg-slate-300 dark:bg-slate-700 text-slate-500 opacity-50 cursor-default'
                                                : 'bg-brand-500/10 border border-brand-500/30 text-brand-400 hover:bg-brand-500/20'}`, children: r }, r)))] })] }, u.id))) }))] })), activeTab === 'settings' && (_jsxs("form", { onSubmit: handleSaveConfig, className: "card space-y-5", children: [_jsxs("div", { className: "flex items-center justify-between pb-3 border-b border-slate-200/80 dark:border-slate-800", children: [_jsx("h2", { className: "text-base font-bold text-slate-900 dark:text-white", children: "\u2699\uFE0F Multi-Cluster & Platform Settings" }), saveSuccess && (_jsx("span", { className: "text-xs text-emerald-400 font-bold animate-fade-in", children: "\u2705 Settings saved successfully!" }))] }), _jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-4", children: [_jsxs("div", { children: [_jsx("label", { className: "label", children: "Cluster Environment Name" }), _jsx("input", { type: "text", defaultValue: config?.clusterName ?? 'Aegis-Prod-Cluster-01', onChange: (e) => setFormData((p) => ({ ...p, clusterName: e.target.value })), className: "input" })] }), _jsxs("div", { children: [_jsx("label", { className: "label", children: "Environment Type" }), _jsxs("select", { defaultValue: config?.environment ?? 'PRODUCTION', onChange: (e) => setFormData((p) => ({ ...p, environment: e.target.value })), className: "input", children: [_jsx("option", { value: "PRODUCTION", children: "PRODUCTION" }), _jsx("option", { value: "STAGING", children: "STAGING" }), _jsx("option", { value: "DR", children: "DISASTER RECOVERY (DR)" })] })] }), _jsxs("div", { children: [_jsx("label", { className: "label", children: "Audit & Telemetry Retention (Days)" }), _jsx("input", { type: "number", defaultValue: config?.retentionDays ?? 90, onChange: (e) => setFormData((p) => ({ ...p, retentionDays: Number(e.target.value) })), className: "input" })] }), _jsxs("div", { children: [_jsx("label", { className: "label", children: "Max Chaos Duration Cap (Seconds)" }), _jsx("input", { type: "number", defaultValue: config?.maxChaosDurationSec ?? 300, onChange: (e) => setFormData((p) => ({ ...p, maxChaosDurationSec: Number(e.target.value) })), className: "input" })] }), _jsxs("div", { className: "md:col-span-2", children: [_jsx("label", { className: "label", children: "Slack Alert Webhook URL" }), _jsx("input", { type: "text", defaultValue: config?.slackWebhookUrl ?? '', onChange: (e) => setFormData((p) => ({ ...p, slackWebhookUrl: e.target.value })), className: "input font-mono text-xs" })] }), _jsxs("div", { className: "md:col-span-2", children: [_jsx("label", { className: "label", children: "PagerDuty Integration Key" }), _jsx("input", { type: "text", defaultValue: config?.pagerDutyIntegrationKey ?? '', onChange: (e) => setFormData((p) => ({ ...p, pagerDutyIntegrationKey: e.target.value })), className: "input font-mono text-xs" })] })] }), _jsx("div", { className: "flex items-center gap-3 pt-2", children: _jsx("button", { type: "submit", disabled: saveConfig.isPending, className: "btn-primary flex items-center gap-2", children: saveConfig.isPending ? 'Saving…' : '💾 Save Platform Settings' }) })] })), activeTab === 'diagnostics' && diagnostics && (_jsx("div", { className: "space-y-6", children: _jsxs("div", { className: "grid grid-cols-2 lg:grid-cols-4 gap-4", children: [_jsxs("div", { className: "card space-y-2", children: [_jsx("span", { className: "text-slate-500 text-xs font-semibold uppercase", children: "Platform Status" }), _jsxs("p", { className: "text-xl font-extrabold text-emerald-400 flex items-center gap-2", children: [_jsx("span", { className: "w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" }), diagnostics.status] }), _jsxs("p", { className: "text-[11px] font-mono text-slate-500", children: ["Uptime: ", diagnostics.uptimeSec, "s"] })] }), _jsxs("div", { className: "card space-y-2", children: [_jsx("span", { className: "text-slate-500 text-xs font-semibold uppercase", children: "Database Ping" }), _jsxs("p", { className: "text-xl font-extrabold text-brand-400 font-mono", children: [diagnostics.database.pingMs, " ms"] }), _jsxs("p", { className: "text-[11px] font-mono text-slate-500", children: [diagnostics.database.provider, " \u00B7 Connected"] })] }), _jsxs("div", { className: "card space-y-2", children: [_jsx("span", { className: "text-slate-500 text-xs font-semibold uppercase", children: "Redis Cache" }), _jsxs("p", { className: "text-xl font-extrabold text-amber-400 font-mono", children: [diagnostics.redis.keyCount, " keys"] }), _jsxs("p", { className: "text-[11px] font-mono text-slate-500", children: ["Status: ", diagnostics.redis.status] })] }), _jsxs("div", { className: "card space-y-2", children: [_jsx("span", { className: "text-slate-500 text-xs font-semibold uppercase", children: "Process RSS" }), _jsxs("p", { className: "text-xl font-extrabold text-violet-400 font-mono", children: [diagnostics.process.memoryRssMb, " MB"] }), _jsxs("p", { className: "text-[11px] font-mono text-slate-500", children: ["Heap: ", diagnostics.process.heapUsedMb, " / ", diagnostics.process.heapTotalMb, " MB"] })] })] }) }))] }));
}
