import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  DEMO_STEPS,
  DemoStep,
  DemoStepResult,
  StepStatus,
  runDemoStep,
  delay,
  buildCapabilitiesReport,
} from '../lib/demoEngine';

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

const STATUS_STYLE: Record<StepStatus, string> = {
  pending: 'bg-slate-200 dark:bg-slate-800 text-slate-400',
  running: 'bg-amber-500/20 text-amber-300 border-amber-500/40 animate-pulse',
  done: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
  error: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
};

const STATUS_ICON: Record<StepStatus, string> = {
  pending: '○',
  running: '◉',
  done: '✓',
  error: '✗',
};

// ── Component ─────────────────────────────────────────────────────────────────

export default function RecruiterDemo() {
  const navigate = useNavigate();
  const logRef = useRef<HTMLDivElement>(null);

  const [stepStatuses, setStepStatuses] = useState<Record<string, StepStatus>>({});
  const [logs, setLogs] = useState<DemoStepResult[]>([]);
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

  const setStatus = (id: string, status: StepStatus) =>
    setStepStatuses((prev) => ({ ...prev, [id]: status }));

  const addLog = (result: DemoStepResult) =>
    setLogs((prev) => [...prev, result]);

  const resetDemo = () => {
    setStepStatuses({});
    setLogs([]);
    setDone(false);
    abortRef.current = false;
  };

  // ── Run single step ─────────────────────────────────────────────────────────
  const runSingleStep = async (step: DemoStep) => {
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
      if (abortRef.current) break;

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

  return (
    <div className="p-6 space-y-6">

      {/* ── Hero Banner ──────────────────────────────────────────────────────── */}
      <div className="card border-2 border-brand-500/40 bg-gradient-to-br from-brand-600/10 to-brand-500/5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-2xl">🎯</span>
              <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                Recruiter Demo Mode
              </h1>
              <span className="badge badge-blue text-[10px] font-bold">LIVE</span>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Aegis AI — Autonomous Cloud Operations Platform · One-click full feature walkthrough
            </p>
          </div>

          {/* Speed Control */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="text-xs text-slate-500 font-medium whitespace-nowrap">Demo Speed:</span>
            <div className="flex rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700">
              {SPEED_OPTIONS.map((opt, i) => (
                <button
                  key={i}
                  onClick={() => setSpeedIdx(i)}
                  className={`text-xs px-3 py-1.5 font-semibold transition-colors ${
                    speedIdx === i
                      ? 'bg-brand-600 text-white'
                      : 'bg-white dark:bg-surface-850 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-surface-800'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Tech Stack Badges */}
        <div className="flex flex-wrap gap-1.5">
          {TECH_STACK.map((tech) => (
            <span key={tech} className="text-[11px] px-2.5 py-1 bg-slate-100 dark:bg-surface-850 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 rounded-md font-mono font-medium">
              {tech}
            </span>
          ))}
        </div>

        {/* Progress Bar */}
        {(running || done) && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span className="font-mono">{completedCount} / {DEMO_STEPS.length} steps complete</span>
              <span>{Math.round((completedCount / DEMO_STEPS.length) * 100)}%</span>
            </div>
            <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-2">
              <div
                className="bg-brand-500 h-2 rounded-full transition-all duration-500"
                style={{ width: `${(completedCount / DEMO_STEPS.length) * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* CTA Buttons */}
        <div className="flex flex-wrap gap-3">
          {!running ? (
            <button
              onClick={launchFullDemo}
              className="btn-primary flex items-center gap-2 text-sm px-6"
            >
              <span className="text-base">▶</span>
              {done ? 'Restart Full Demo' : 'Launch Full Demo'}
            </button>
          ) : (
            <button
              onClick={stopDemo}
              className="flex items-center gap-2 text-sm px-6 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold transition-colors"
            >
              ⏹ Stop Demo
            </button>
          )}

          {(running || done) && (
            <button
              onClick={resetDemo}
              disabled={running}
              className="text-sm px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-brand-500/50 transition-colors disabled:opacity-40"
            >
              ↺ Reset
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* ── Demo Scenario Playlist ─────────────────────────────────────────── */}
        <div className="card space-y-3">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200/80 dark:border-slate-800">
            <h2 className="text-base font-bold text-slate-900 dark:text-white">📋 Demo Scenario Playlist</h2>
            <span className="text-xs font-mono text-slate-500">{DEMO_STEPS.length} scenarios · Levels 1–13</span>
          </div>

          <div className="space-y-2 max-h-[520px] overflow-y-auto pr-1">
            {DEMO_STEPS.map((step) => {
              const status: StepStatus = stepStatuses[step.id] ?? 'pending';
              return (
                <div
                  key={step.id}
                  className={`p-3 rounded-xl border transition-all ${
                    status === 'running'
                      ? 'border-amber-500/40 bg-amber-500/5'
                      : status === 'done'
                      ? 'border-emerald-500/30 bg-emerald-500/5'
                      : status === 'error'
                      ? 'border-rose-500/30 bg-rose-500/5'
                      : 'border-slate-200/80 dark:border-slate-800 bg-slate-50/60 dark:bg-surface-850/60'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {/* Status indicator */}
                    <span className={`mt-0.5 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 border ${STATUS_STYLE[status]}`}>
                      {STATUS_ICON[status]}
                    </span>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm">{step.icon}</span>
                        <span className="text-xs font-bold text-slate-900 dark:text-white">
                          {step.title}
                        </span>
                        <span className="badge badge-blue text-[9px] px-1.5">L{step.level}</span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                        {step.description}
                      </p>
                    </div>

                    {/* Individual run button */}
                    <button
                      onClick={() => runSingleStep(step)}
                      disabled={running || status === 'running'}
                      className="flex-shrink-0 text-[10px] font-bold px-2 py-1 rounded-lg bg-brand-500/10 border border-brand-500/30 text-brand-400 hover:bg-brand-500/20 transition-colors disabled:opacity-30"
                      title="Run this step only"
                    >
                      ▶
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Live Demo Terminal ─────────────────────────────────────────────── */}
        <div className="card space-y-3 flex flex-col">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200/80 dark:border-slate-800">
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              🖥️ Live Demo Terminal
            </h2>
            <div className="flex items-center gap-2">
              {running && (
                <span className="flex items-center gap-1 text-xs text-amber-400 font-mono">
                  <span className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-ping" />
                  RUNNING
                </span>
              )}
              {done && <span className="badge badge-green text-[10px]">COMPLETE</span>}
            </div>
          </div>

          <div
            ref={logRef}
            className="flex-1 min-h-[400px] max-h-[520px] overflow-y-auto bg-slate-950 dark:bg-black rounded-xl p-4 font-mono text-xs space-y-2"
          >
            {logs.length === 0 ? (
              <div className="text-slate-600 text-center pt-16 space-y-2">
                <p className="text-2xl">▶</p>
                <p>Click "Launch Full Demo" to start the platform walkthrough</p>
                <p className="text-slate-700">or use ▶ buttons on individual steps</p>
              </div>
            ) : (
              logs.map((log, i) => (
                <div
                  key={i}
                  className={`flex gap-2 items-start animate-in fade-in duration-200 ${
                    log.status === 'error' ? 'text-rose-400' :
                    log.stepId === 'start' || log.stepId === 'complete' ? 'text-brand-400' :
                    log.status === 'running' ? 'text-amber-300' : 'text-emerald-300'
                  }`}
                >
                  <span className="text-slate-600 flex-shrink-0">{log.timestamp}</span>
                  <span className="text-slate-600 flex-shrink-0">›</span>
                  <span className="leading-relaxed break-words">{log.message}</span>
                </div>
              ))
            )}

            {running && (
              <div className="flex items-center gap-2 text-amber-400">
                <span className="animate-pulse">_</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Completion Summary Report ─────────────────────────────────────────── */}
      {done && (
        <div className="card border-2 border-emerald-500/40 bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 space-y-5">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                🏆 Demo Complete — Platform Capabilities Report
              </h2>
              <p className="text-sm text-slate-500 mt-0.5">
                Share this with your hiring team to showcase the full Aegis AI platform.
              </p>
            </div>
            <button
              onClick={copyReport}
              className="btn-primary flex items-center gap-2 text-sm"
            >
              {copied ? '✅ Copied!' : '📋 Copy JSON Report'}
            </button>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: 'Features Demonstrated', value: `${completedCount}/13`, icon: '✅' },
              { label: 'Roadmap Progress', value: '13/15 Levels', icon: '📊' },
              { label: 'Tech Stack Items', value: `${TECH_STACK.length}`, icon: '⚙️' },
              { label: 'Platform Status', value: 'OPERATIONAL', icon: '🟢' },
            ].map((stat, i) => (
              <div key={i} className="text-center p-4 rounded-xl bg-white/40 dark:bg-surface-850/60 border border-slate-200/80 dark:border-slate-700 space-y-1">
                <p className="text-2xl">{stat.icon}</p>
                <p className="font-extrabold text-lg text-slate-900 dark:text-white font-mono">{stat.value}</p>
                <p className="text-[11px] text-slate-500">{stat.label}</p>
              </div>
            ))}
          </div>

          {/* Feature List */}
          <div className="space-y-2">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Features Built & Demonstrated:</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              {DEMO_STEPS.map((step) => (
                <div key={step.id} className="flex items-center gap-2 text-xs">
                  <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold flex-shrink-0 ${
                    stepStatuses[step.id] === 'done' ? 'bg-emerald-500 text-white' :
                    stepStatuses[step.id] === 'error' ? 'bg-rose-500 text-white' : 'bg-slate-300 text-slate-600'
                  }`}>
                    {stepStatuses[step.id] === 'done' ? '✓' : stepStatuses[step.id] === 'error' ? '✗' : '○'}
                  </span>
                  <span className="text-slate-700 dark:text-slate-300">
                    <span className="font-bold">L{step.level}</span> {step.icon} {step.title}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
