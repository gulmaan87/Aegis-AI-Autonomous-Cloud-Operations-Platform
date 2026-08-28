import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { DEMO_STEPS, runDemoStep, delay, buildCapabilitiesReport, } from '../lib/demoEngine';
// ── Constants ──────────────────────────────────────────────────────────────────
const SPEED_OPTIONS = [
    { label: '⚡ Fast', ms: 1200 },
    { label: '▶ Normal', ms: 2500 },
    { label: '🐢 Slow', ms: 4000 },
];
const TECH_STACK = [
    'TypeScript', 'React 18', 'Node.js', 'Express',
    'Prisma', 'MongoDB', 'Redis', 'Docker',
    'Azure OpenAI', 'Prometheus', 'Grafana', 'Web Speech API',
];
const STATUS_STYLE = {
    pending: 'bg-slate-200 dark:bg-slate-800 text-slate-400',
    running: 'bg-amber-500/20 text-amber-300 border-amber-500/40 animate-pulse',
    done: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    error: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
};
const STATUS_ICON = {
    pending: '○',
    running: '◉',
    done: '✓',
    error: '✗',
};
// ── Component ─────────────────────────────────────────────────────────────────
export default function RecruiterDemo() {
    const navigate = useNavigate();
    const logRef = useRef(null);
    const [stepStatuses, setStepStatuses] = useState({});
    const [logs, setLogs] = useState([]);
    const [running, setRunning] = useState(false);
    const [done, setDone] = useState(false);
    const [speedIdx, setSpeedIdx] = useState(1); // Normal by default
    const [copied, setCopied] = useState(false);
    const abortRef = useRef(false);
    // Auto-scroll terminal log
    useEffect(() => {
        if (logRef.current) {
            logRef.current.scrollTop = logRef.current.scrollHeight;
        }
    }, [logs]);
    const setStatus = (id, status) => setStepStatuses((prev) => ({ ...prev, [id]: status }));
    const addLog = (result) => setLogs((prev) => [...prev, result]);
    const resetDemo = () => {
        setStepStatuses({});
        setLogs([]);
        setDone(false);
        abortRef.current = false;
    };
    // ── Run single step ─────────────────────────────────────────────────────────
    const runSingleStep = async (step) => {
        setStatus(step.id, 'running');
        const result = await runDemoStep(step, navigate);
        setStatus(step.id, result.status);
        addLog(result);
    };
    // ── Run full demo ───────────────────────────────────────────────────────────
    const launchFullDemo = async () => {
        resetDemo();
        setRunning(true);
        abortRef.current = false;
        addLog({
            stepId: 'start',
            status: 'done',
            message: `🚀 Aegis AI Platform Demo starting — running ${DEMO_STEPS.length} scenarios across Levels 1–13…`,
            timestamp: new Date().toLocaleTimeString(),
        });
        for (const step of DEMO_STEPS) {
            if (abortRef.current)
                break;
            setStatus(step.id, 'running');
            addLog({
                stepId: step.id,
                status: 'running',
                message: `[Level ${step.level}] ${step.icon} ${step.title}`,
                timestamp: new Date().toLocaleTimeString(),
            });
            const result = await runDemoStep(step, navigate);
            setStatus(step.id, result.status);
            addLog(result);
            await delay(SPEED_OPTIONS[speedIdx].ms);
        }
        if (!abortRef.current) {
            addLog({
                stepId: 'complete',
                status: 'done',
                message: `✅ Demo complete! ${DEMO_STEPS.length} platform features demonstrated across Levels 1–13. Aegis AI Platform fully operational.`,
                timestamp: new Date().toLocaleTimeString(),
            });
            setDone(true);
        }
        setRunning(false);
    };
    const stopDemo = () => {
        abortRef.current = true;
        setRunning(false);
        addLog({
            stepId: 'stop',
            status: 'error',
            message: '⏹ Demo stopped by user.',
            timestamp: new Date().toLocaleTimeString(),
        });
    };
    const copyReport = async () => {
        const report = buildCapabilitiesReport();
        await navigator.clipboard.writeText(JSON.stringify(report, null, 2));
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };
    const completedCount = Object.values(stepStatuses).filter((s) => s === 'done').length;
    return (_jsxs("div", { className: "p-6 space-y-6", children: [_jsxs("div", { className: "card border-2 border-brand-500/40 bg-gradient-to-br from-brand-600/10 to-brand-500/5 space-y-4", children: [_jsxs("div", { className: "flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4", children: [_jsxs("div", { className: "space-y-1", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("span", { className: "text-2xl", children: "\uD83C\uDFAF" }), _jsx("h1", { className: "text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white", children: "Recruiter Demo Mode" }), _jsx("span", { className: "badge badge-blue text-[10px] font-bold", children: "LIVE" })] }), _jsx("p", { className: "text-sm text-slate-500 dark:text-slate-400", children: "Aegis AI \u2014 Autonomous Cloud Operations Platform \u00B7 One-click full feature walkthrough" })] }), _jsxs("div", { className: "flex items-center gap-2 flex-shrink-0", children: [_jsx("span", { className: "text-xs text-slate-500 font-medium whitespace-nowrap", children: "Demo Speed:" }), _jsx("div", { className: "flex rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700", children: SPEED_OPTIONS.map((opt, i) => (_jsx("button", { onClick: () => setSpeedIdx(i), className: `text-xs px-3 py-1.5 font-semibold transition-colors ${speedIdx === i
                                                ? 'bg-brand-600 text-white'
                                                : 'bg-white dark:bg-surface-850 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-surface-800'}`, children: opt.label }, i))) })] })] }), _jsx("div", { className: "flex flex-wrap gap-1.5", children: TECH_STACK.map((tech) => (_jsx("span", { className: "text-[11px] px-2.5 py-1 bg-slate-100 dark:bg-surface-850 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 rounded-md font-mono font-medium", children: tech }, tech))) }), (running || done) && (_jsxs("div", { className: "space-y-1.5", children: [_jsxs("div", { className: "flex items-center justify-between text-xs text-slate-500", children: [_jsxs("span", { className: "font-mono", children: [completedCount, " / ", DEMO_STEPS.length, " steps complete"] }), _jsxs("span", { children: [Math.round((completedCount / DEMO_STEPS.length) * 100), "%"] })] }), _jsx("div", { className: "w-full bg-slate-200 dark:bg-slate-800 rounded-full h-2", children: _jsx("div", { className: "bg-brand-500 h-2 rounded-full transition-all duration-500", style: { width: `${(completedCount / DEMO_STEPS.length) * 100}%` } }) })] })), _jsxs("div", { className: "flex flex-wrap gap-3", children: [!running ? (_jsxs("button", { onClick: launchFullDemo, className: "btn-primary flex items-center gap-2 text-sm px-6", children: [_jsx("span", { className: "text-base", children: "\u25B6" }), done ? 'Restart Full Demo' : 'Launch Full Demo'] })) : (_jsx("button", { onClick: stopDemo, className: "flex items-center gap-2 text-sm px-6 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold transition-colors", children: "\u23F9 Stop Demo" })), (running || done) && (_jsx("button", { onClick: resetDemo, disabled: running, className: "text-sm px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-brand-500/50 transition-colors disabled:opacity-40", children: "\u21BA Reset" }))] })] }), _jsxs("div", { className: "grid grid-cols-1 lg:grid-cols-2 gap-6", children: [_jsxs("div", { className: "card space-y-3", children: [_jsxs("div", { className: "flex items-center justify-between pb-3 border-b border-slate-200/80 dark:border-slate-800", children: [_jsx("h2", { className: "text-base font-bold text-slate-900 dark:text-white", children: "\uD83D\uDCCB Demo Scenario Playlist" }), _jsxs("span", { className: "text-xs font-mono text-slate-500", children: [DEMO_STEPS.length, " scenarios \u00B7 Levels 1\u201313"] })] }), _jsx("div", { className: "space-y-2 max-h-[520px] overflow-y-auto pr-1", children: DEMO_STEPS.map((step) => {
                                    const status = stepStatuses[step.id] ?? 'pending';
                                    return (_jsx("div", { className: `p-3 rounded-xl border transition-all ${status === 'running'
                                            ? 'border-amber-500/40 bg-amber-500/5'
                                            : status === 'done'
                                                ? 'border-emerald-500/30 bg-emerald-500/5'
                                                : status === 'error'
                                                    ? 'border-rose-500/30 bg-rose-500/5'
                                                    : 'border-slate-200/80 dark:border-slate-800 bg-slate-50/60 dark:bg-surface-850/60'}`, children: _jsxs("div", { className: "flex items-start gap-3", children: [_jsx("span", { className: `mt-0.5 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 border ${STATUS_STYLE[status]}`, children: STATUS_ICON[status] }), _jsxs("div", { className: "flex-1 min-w-0", children: [_jsxs("div", { className: "flex items-center gap-2 flex-wrap", children: [_jsx("span", { className: "text-sm", children: step.icon }), _jsx("span", { className: "text-xs font-bold text-slate-900 dark:text-white", children: step.title }), _jsxs("span", { className: "badge badge-blue text-[9px] px-1.5", children: ["L", step.level] })] }), _jsx("p", { className: "text-[11px] text-slate-500 mt-0.5 leading-relaxed", children: step.description })] }), _jsx("button", { onClick: () => runSingleStep(step), disabled: running || status === 'running', className: "flex-shrink-0 text-[10px] font-bold px-2 py-1 rounded-lg bg-brand-500/10 border border-brand-500/30 text-brand-400 hover:bg-brand-500/20 transition-colors disabled:opacity-30", title: "Run this step only", children: "\u25B6" })] }) }, step.id));
                                }) })] }), _jsxs("div", { className: "card space-y-3 flex flex-col", children: [_jsxs("div", { className: "flex items-center justify-between pb-3 border-b border-slate-200/80 dark:border-slate-800", children: [_jsx("h2", { className: "text-base font-bold text-slate-900 dark:text-white", children: "\uD83D\uDDA5\uFE0F Live Demo Terminal" }), _jsxs("div", { className: "flex items-center gap-2", children: [running && (_jsxs("span", { className: "flex items-center gap-1 text-xs text-amber-400 font-mono", children: [_jsx("span", { className: "w-1.5 h-1.5 bg-amber-400 rounded-full animate-ping" }), "RUNNING"] })), done && _jsx("span", { className: "badge badge-green text-[10px]", children: "COMPLETE" })] })] }), _jsxs("div", { ref: logRef, className: "flex-1 min-h-[400px] max-h-[520px] overflow-y-auto bg-slate-950 dark:bg-black rounded-xl p-4 font-mono text-xs space-y-2", children: [logs.length === 0 ? (_jsxs("div", { className: "text-slate-600 text-center pt-16 space-y-2", children: [_jsx("p", { className: "text-2xl", children: "\u25B6" }), _jsx("p", { children: "Click \"Launch Full Demo\" to start the platform walkthrough" }), _jsx("p", { className: "text-slate-700", children: "or use \u25B6 buttons on individual steps" })] })) : (logs.map((log, i) => (_jsxs("div", { className: `flex gap-2 items-start animate-in fade-in duration-200 ${log.status === 'error' ? 'text-rose-400' :
                                            log.stepId === 'start' || log.stepId === 'complete' ? 'text-brand-400' :
                                                log.status === 'running' ? 'text-amber-300' : 'text-emerald-300'}`, children: [_jsx("span", { className: "text-slate-600 flex-shrink-0", children: log.timestamp }), _jsx("span", { className: "text-slate-600 flex-shrink-0", children: "\u203A" }), _jsx("span", { className: "leading-relaxed break-words", children: log.message })] }, i)))), running && (_jsx("div", { className: "flex items-center gap-2 text-amber-400", children: _jsx("span", { className: "animate-pulse", children: "_" }) }))] })] })] }), done && (_jsxs("div", { className: "card border-2 border-emerald-500/40 bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 space-y-5", children: [_jsxs("div", { className: "flex items-center justify-between flex-wrap gap-3", children: [_jsxs("div", { children: [_jsx("h2", { className: "text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2", children: "\uD83C\uDFC6 Demo Complete \u2014 Platform Capabilities Report" }), _jsx("p", { className: "text-sm text-slate-500 mt-0.5", children: "Share this with your hiring team to showcase the full Aegis AI platform." })] }), _jsx("button", { onClick: copyReport, className: "btn-primary flex items-center gap-2 text-sm", children: copied ? '✅ Copied!' : '📋 Copy JSON Report' })] }), _jsx("div", { className: "grid grid-cols-2 sm:grid-cols-4 gap-4", children: [
                            { label: 'Features Demonstrated', value: `${completedCount}/13`, icon: '✅' },
                            { label: 'Roadmap Progress', value: '13/15 Levels', icon: '📊' },
                            { label: 'Tech Stack Items', value: `${TECH_STACK.length}`, icon: '⚙️' },
                            { label: 'Platform Status', value: 'OPERATIONAL', icon: '🟢' },
                        ].map((stat, i) => (_jsxs("div", { className: "text-center p-4 rounded-xl bg-white/40 dark:bg-surface-850/60 border border-slate-200/80 dark:border-slate-700 space-y-1", children: [_jsx("p", { className: "text-2xl", children: stat.icon }), _jsx("p", { className: "font-extrabold text-lg text-slate-900 dark:text-white font-mono", children: stat.value }), _jsx("p", { className: "text-[11px] text-slate-500", children: stat.label })] }, i))) }), _jsxs("div", { className: "space-y-2", children: [_jsx("p", { className: "text-xs font-bold text-slate-500 uppercase tracking-wider", children: "Features Built & Demonstrated:" }), _jsx("div", { className: "grid grid-cols-1 sm:grid-cols-2 gap-1.5", children: DEMO_STEPS.map((step) => (_jsxs("div", { className: "flex items-center gap-2 text-xs", children: [_jsx("span", { className: `w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold flex-shrink-0 ${stepStatuses[step.id] === 'done' ? 'bg-emerald-500 text-white' :
                                                stepStatuses[step.id] === 'error' ? 'bg-rose-500 text-white' : 'bg-slate-300 text-slate-600'}`, children: stepStatuses[step.id] === 'done' ? '✓' : stepStatuses[step.id] === 'error' ? '✗' : '○' }), _jsxs("span", { className: "text-slate-700 dark:text-slate-300", children: [_jsxs("span", { className: "font-bold", children: ["L", step.level] }), " ", step.icon, " ", step.title] })] }, step.id))) })] })] }))] }));
}
