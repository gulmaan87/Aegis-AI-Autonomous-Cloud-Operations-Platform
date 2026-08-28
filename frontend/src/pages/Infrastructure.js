import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';
// ── Node layout (SVG viewport 900×520) ───────────────────────────────────────
const NODE_W = 130;
const NODE_H = 46;
const NODE_POSITIONS = [
    { id: 'frontend', x: 385, y: 30 },
    { id: 'backend', x: 385, y: 180 },
    { id: 'mongodb', x: 680, y: 180 },
    { id: 'redis', x: 680, y: 300 },
    { id: 'prometheus', x: 90, y: 300 },
    { id: 'alertmanager', x: 90, y: 420 },
    { id: 'grafana', x: 385, y: 420 },
];
// Connections: [from, to]
const EDGES = [
    ['frontend', 'backend'],
    ['backend', 'mongodb'],
    ['backend', 'redis'],
    ['backend', 'prometheus'],
    ['prometheus', 'alertmanager'],
    ['prometheus', 'grafana'],
];
// ── Colors ───────────────────────────────────────────────────────────────────
const STATUS_RING = {
    healthy: '#34d399', // emerald-400
    degraded: '#fbbf24', // amber-400
    down: '#f87171', // red-400
};
const STATUS_FILL = {
    healthy: 'rgba(52,211,153,0.06)',
    degraded: 'rgba(251,191,36,0.10)',
    down: 'rgba(248,113,113,0.12)',
};
const GROUP_ICON = {
    app: '⚙',
    data: '🗄',
    monitoring: '📊',
};
// ── Helpers ───────────────────────────────────────────────────────────────────
function cx(pos) { return pos.x + NODE_W / 2; }
function cy(pos) { return pos.y + NODE_H / 2; }
function getPos(id) {
    return NODE_POSITIONS.find((n) => n.id === id);
}
// ── Animated traffic dot along an SVG path ────────────────────────────────────
function TrafficDot({ x1, y1, x2, y2, delay = 0, color }) {
    const pathId = `path-${x1}-${y1}-${x2}-${y2}-${delay}`;
    return (_jsxs("g", { children: [_jsx("path", { id: pathId, d: `M${x1},${y1} L${x2},${y2}`, fill: "none", stroke: "none" }), _jsx("circle", { r: "3.5", fill: color, opacity: "0.85", children: _jsx("animateMotion", { dur: "2.2s", repeatCount: "indefinite", begin: `${delay}s`, children: _jsx("mpath", { href: `#${pathId}` }) }) })] }));
}
// ── Main Component ────────────────────────────────────────────────────────────
export default function Infrastructure() {
    const [tooltip, setTooltip] = useState(null);
    const [shake, setShake] = useState(new Set());
    const svgRef = useRef(null);
    const { data, isLoading } = useQuery({
        queryKey: ['health-services'],
        queryFn: async () => (await api.get('/health/services')).data,
        refetchInterval: 5000,
    });
    const { data: chaosStatus } = useQuery({
        queryKey: ['chaos-status'],
        queryFn: async () => (await api.get('/chaos/status')).data,
        refetchInterval: 3000,
    });
    // Trigger shake animation on chaos-affected nodes
    useEffect(() => {
        if (!chaosStatus?.active) {
            setShake(new Set());
            return;
        }
        const type = chaosStatus.active.type;
        const affected = new Set(['backend']);
        if (type === 'DB_SLOWDOWN')
            affected.add('mongodb');
        if (type === 'MEMORY_PRESSURE')
            affected.add('backend');
        setShake(affected);
    }, [chaosStatus]);
    const serviceMap = new Map((data?.services ?? []).map((s) => [s.id, s]));
    const chaosActive = data?.chaosActive ?? false;
    const openIncidents = data?.openIncidents ?? 0;
    return (_jsxs("div", { className: "p-6 space-y-6", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { children: [_jsx("h1", { className: "text-xl font-bold text-slate-100", children: "Infrastructure Map" }), _jsx("p", { className: "text-slate-400 text-sm mt-0.5", children: "Live topology of all Aegis stack services" })] }), _jsxs("div", { className: "flex items-center gap-3", children: [chaosActive && (_jsxs("span", { className: "badge badge-red", children: [_jsx("span", { className: "w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" }), "Chaos Active"] })), openIncidents > 0 && (_jsxs("span", { className: "badge badge-yellow", children: ["\u26A0 ", openIncidents, " open incident", openIncidents > 1 ? 's' : ''] })), _jsxs("span", { className: "badge badge-green", children: [_jsx("span", { className: "w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" }), "Live"] })] })] }), _jsxs("div", { className: "card p-0 overflow-hidden relative", children: [isLoading && (_jsx("div", { className: "absolute inset-0 flex items-center justify-center bg-surface-800/80 z-10 rounded-xl", children: _jsx("div", { className: "w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" }) })), _jsxs("svg", { ref: svgRef, viewBox: "0 0 900 520", className: "w-full", style: { maxHeight: '520px', background: 'transparent' }, onMouseLeave: () => setTooltip(null), children: [_jsx("defs", { children: _jsx("pattern", { id: "grid", width: "30", height: "30", patternUnits: "userSpaceOnUse", children: _jsx("circle", { cx: "15", cy: "15", r: "0.8", fill: "rgba(255,255,255,0.04)" }) }) }), _jsx("rect", { width: "900", height: "520", fill: "url(#grid)" }), EDGES.map(([fromId, toId]) => {
                                const from = getPos(fromId);
                                const to = getPos(toId);
                                if (!from || !to)
                                    return null;
                                const x1 = cx(from), y1 = cy(from);
                                const x2 = cx(to), y2 = cy(to);
                                const fromSvc = serviceMap.get(fromId);
                                const toSvc = serviceMap.get(toId);
                                const isDown = fromSvc?.status === 'down' || toSvc?.status === 'down';
                                const isDeg = fromSvc?.status === 'degraded' || toSvc?.status === 'degraded';
                                const edgeColor = isDown ? '#f87171' : isDeg ? '#fbbf24' : '#4b5563';
                                const dotColor = isDown ? '#f87171' : isDeg ? '#fbbf24' : '#818cf8';
                                return (_jsxs("g", { children: [_jsx("line", { x1: x1, y1: y1, x2: x2, y2: y2, stroke: edgeColor, strokeWidth: "1.5", strokeDasharray: isDown ? '6 4' : '0', opacity: "0.5" }), !isDown && (_jsx(TrafficDot, { x1: x1, y1: y1, x2: x2, y2: y2, delay: (EDGES.indexOf([fromId, toId])) * 0.35, color: dotColor }))] }, `${fromId}-${toId}`));
                            }), NODE_POSITIONS.map((pos) => {
                                const svc = serviceMap.get(pos.id);
                                const status = svc?.status ?? 'healthy';
                                const isShaking = shake.has(pos.id);
                                const ringColor = STATUS_RING[status];
                                const fillColor = STATUS_FILL[status];
                                const icon = GROUP_ICON[svc?.group ?? 'app'];
                                return (_jsxs("g", { style: { cursor: 'pointer' }, onMouseEnter: (e) => {
                                        if (!svc)
                                            return;
                                        const rect = svgRef.current?.getBoundingClientRect();
                                        if (!rect)
                                            return;
                                        setTooltip({ service: svc, x: e.clientX - rect.left, y: e.clientY - rect.top });
                                    }, onMouseLeave: () => setTooltip(null), children: [status === 'degraded' && (_jsxs("rect", { x: pos.x - 4, y: pos.y - 4, width: NODE_W + 8, height: NODE_H + 8, rx: "14", ry: "14", fill: "none", stroke: "#fbbf24", strokeWidth: "1", opacity: "0.4", children: [_jsx("animate", { attributeName: "opacity", values: "0.4;0;0.4", dur: "2s", repeatCount: "indefinite" }), _jsx("animate", { attributeName: "stroke-width", values: "1;3;1", dur: "2s", repeatCount: "indefinite" })] })), _jsx("rect", { x: pos.x, y: pos.y, width: NODE_W, height: NODE_H, rx: "10", ry: "10", fill: fillColor, stroke: ringColor, strokeWidth: "1.5", style: isShaking ? { animation: 'shake 0.4s infinite' } : undefined }), _jsx("circle", { cx: pos.x + NODE_W - 12, cy: pos.y + 12, r: "4", fill: ringColor, children: status === 'degraded' && (_jsx("animate", { attributeName: "opacity", values: "1;0.3;1", dur: "1.2s", repeatCount: "indefinite" })) }), _jsx("text", { x: pos.x + 14, y: pos.y + NODE_H / 2 + 5, fontSize: "14", textAnchor: "middle", children: icon }), _jsx("text", { x: pos.x + 26, y: pos.y + NODE_H / 2 - 3, fontSize: "11", fontWeight: "600", fill: "#e2e8f0", fontFamily: "Inter, sans-serif", children: svc?.label ?? pos.id }), _jsxs("text", { x: pos.x + 26, y: pos.y + NODE_H / 2 + 11, fontSize: "9", fill: "#64748b", fontFamily: "Inter, sans-serif", children: [":", svc?.port] })] }, pos.id));
                            }), chaosActive && (_jsxs("text", { x: "450", y: "140", fontSize: "28", textAnchor: "middle", opacity: "0.6", children: [_jsx("animate", { attributeName: "opacity", values: "0.6;0.1;0.6", dur: "0.8s", repeatCount: "indefinite" }), "\u26A1"] }))] }), _jsx("style", { children: `
          @keyframes shake {
            0%,100% { transform: translateX(0); }
            25%      { transform: translateX(-3px); }
            75%      { transform: translateX(3px); }
          }
        ` }), tooltip && (_jsxs("div", { className: "absolute z-20 pointer-events-none bg-surface-700 border border-white/10 rounded-xl px-4 py-3 shadow-xl text-sm", style: { left: tooltip.x + 12, top: tooltip.y - 10, minWidth: 200 }, children: [_jsxs("div", { className: "flex items-center gap-2 mb-2", children: [_jsx("span", { className: "text-base", children: GROUP_ICON[tooltip.service.group] }), _jsx("p", { className: "font-semibold text-slate-100", children: tooltip.service.label })] }), _jsxs("div", { className: "space-y-1 text-xs text-slate-400", children: [_jsxs("div", { className: "flex justify-between", children: [_jsx("span", { children: "Status" }), _jsx("span", { className: tooltip.service.status === 'healthy' ? 'text-emerald-400' :
                                                    tooltip.service.status === 'degraded' ? 'text-amber-400' : 'text-red-400', children: tooltip.service.status })] }), _jsxs("div", { className: "flex justify-between", children: [_jsx("span", { children: "Port" }), _jsxs("span", { className: "text-slate-300", children: [":", tooltip.service.port] })] }), _jsxs("div", { className: "flex justify-between", children: [_jsx("span", { children: "Group" }), _jsx("span", { className: "text-slate-300 capitalize", children: tooltip.service.group })] }), tooltip.service.url && (_jsx("div", { className: "pt-1 border-t border-white/8 mt-1", children: _jsxs("span", { className: "text-brand-400 text-xs", children: ["\uD83D\uDD17 ", tooltip.service.url] }) }))] })] }))] }), _jsxs("div", { className: "grid grid-cols-1 gap-4 lg:grid-cols-2", children: [_jsxs("div", { className: "card", children: [_jsx("h2", { className: "text-sm font-semibold text-slate-300 mb-3", children: "Legend" }), _jsxs("div", { className: "space-y-2", children: [[
                                        { color: '#34d399', label: 'Healthy', desc: 'Service responding normally' },
                                        { color: '#fbbf24', label: 'Degraded', desc: 'Slow or chaos experiment active' },
                                        { color: '#f87171', label: 'Down', desc: 'Unreachable or health check failed' },
                                    ].map(({ color, label, desc }) => (_jsxs("div", { className: "flex items-center gap-3", children: [_jsx("div", { className: "w-3 h-3 rounded-full flex-shrink-0", style: { background: color } }), _jsxs("div", { children: [_jsx("p", { className: "text-sm text-slate-200", children: label }), _jsx("p", { className: "text-xs text-slate-500", children: desc })] })] }, label))), _jsxs("div", { className: "flex items-center gap-3 pt-1", children: [_jsx("div", { className: "w-3 flex items-center justify-center flex-shrink-0", children: _jsx("span", { className: "text-xs", children: "\u26A1" }) }), _jsxs("div", { children: [_jsx("p", { className: "text-sm text-slate-200", children: "Chaos Overlay" }), _jsx("p", { className: "text-xs text-slate-500", children: "Node shakes when receiving failure injection" })] })] })] })] }), _jsxs("div", { className: "card", children: [_jsx("h2", { className: "text-sm font-semibold text-slate-300 mb-3", children: "Services" }), _jsx("div", { className: "space-y-2", children: (data?.services ?? []).map((svc) => (_jsxs("div", { className: "flex items-center gap-3 bg-surface-700 rounded-lg px-3 py-2", children: [_jsx("div", { className: "w-2 h-2 rounded-full flex-shrink-0", style: { background: STATUS_RING[svc.status] } }), _jsx("p", { className: "text-sm text-slate-200 flex-1", children: svc.label }), _jsxs("span", { className: "text-xs text-slate-500", children: [":", svc.port] }), svc.url && (_jsx("a", { href: svc.url, target: "_blank", rel: "noopener noreferrer", className: "text-xs text-brand-400 hover:text-brand-300 transition-colors", children: "Open \u2197" }))] }, svc.id))) })] })] })] }));
}
