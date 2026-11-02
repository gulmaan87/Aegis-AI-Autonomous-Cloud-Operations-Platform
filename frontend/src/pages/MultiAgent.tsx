import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';

interface AgentStatus {
  agentRole: string;
  displayName: string;
  emoji: string;
  domain: string;
  status: string;
  healthScore: number;
  insightsCount: number;
  lastActiveAt: string | null;
}

interface AgentMessage {
  agentRole: string;
  displayName: string;
  emoji: string;
  message: string;
  actionProposed?: string;
  vote?: 'APPROVE' | 'REJECT' | 'MODIFY';
  timestamp: string;
}

interface Session {
  id: string;
  topic: string;
  consensusReached: boolean;
  finalDecision?: string;
  messages: AgentMessage[];
  createdAt: string;
}

const STATUS_BADGE: Record<string, string> = {
  IDLE: 'badge-slate',
  ANALYZING: 'badge-yellow',
  PROPOSING_ACTION: 'badge-blue',
  EXECUTING: 'badge-red',
  CONSENSUS_REACHED: 'badge-green',
};

const VOTE_STYLE: Record<string, string> = {
  APPROVE: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  REJECT: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
  MODIFY: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
};

const AGENT_COLORS: Record<string, string> = {
  SRE_AGENT: 'from-blue-500/20 to-blue-600/10 border-blue-500/30',
  FINOPS_AGENT: 'from-emerald-500/20 to-emerald-600/10 border-emerald-500/30',
  SECOPS_AGENT: 'from-amber-500/20 to-amber-600/10 border-amber-500/30',
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
  const [activeSession, setActiveSession] = useState<Session | null>(null);

  const { data: agents = [], isLoading: agentsLoading } = useQuery<AgentStatus[]>({
    queryKey: ['multi-agent-agents'],
    queryFn: () => api.get('/multi-agent/agents').then((r) => r.data),
    refetchInterval: 5000,
  });

  const { data: sessions = [] } = useQuery<Session[]>({
    queryKey: ['multi-agent-sessions'],
    queryFn: () => api.get('/multi-agent/sessions').then((r) => r.data),
    refetchInterval: 10000,
  });

  const deliberate = useMutation({
    mutationFn: (t: string) => api.post('/multi-agent/deliberate', { topic: t }),
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

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight flex items-center gap-2 text-slate-900 dark:text-white">
            🤖 Multi-Agent AI Collaboration Mesh
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            Coordinated autonomous AI agents deliberate, propose domain-specific actions, vote on consensus, and execute coordinated cloud ops plans.
          </p>
        </div>
      </div>

      {/* Agent Status Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {agentsLoading
          ? Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="card animate-pulse h-36" />
            ))
          : agents.map((agent) => (
              <div
                key={agent.agentRole}
                className={`card bg-gradient-to-br border ${AGENT_COLORS[agent.agentRole] ?? 'from-slate-500/10 to-slate-600/5 border-slate-500/20'} space-y-3`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-2xl">{agent.emoji}</span>
                  <span className={`badge ${STATUS_BADGE[agent.status] ?? 'badge-slate'} text-[10px]`}>
                    {agent.status.replace('_', ' ')}
                  </span>
                </div>
                <div>
                  <p className="font-bold text-sm text-slate-900 dark:text-white">{agent.displayName}</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">{agent.domain}</p>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">Health</span>
                    <span className="font-mono font-bold text-emerald-400">{agent.healthScore.toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-1.5">
                    <div
                      className="bg-emerald-500 h-1.5 rounded-full transition-all"
                      style={{ width: `${agent.healthScore}%` }}
                    />
                  </div>
                  <p className="text-[11px] text-slate-500 font-mono">{agent.insightsCount} insights generated</p>
                </div>
              </div>
            ))}
      </div>

      {/* Deliberation Trigger Panel */}
      <div className="card space-y-4">
        <h2 className="text-base font-bold text-slate-900 dark:text-white">⚡ Run Agent Mesh Deliberation</h2>
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            placeholder="Enter deliberation topic or select a suggestion below…"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            className="input flex-1"
          />
          <button
            onClick={handleDeliberate}
            disabled={deliberate.isPending}
            className="btn-primary whitespace-nowrap flex items-center gap-2"
          >
            {deliberate.isPending ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Agents deliberating…
              </>
            ) : (
              '⚡ Start Deliberation'
            )}
          </button>
        </div>

        {/* Suggested Topics */}
        <div className="flex flex-wrap gap-2">
          {SUGGESTED_TOPICS.map((t) => (
            <button
              key={t}
              onClick={() => setTopic(t)}
              className="text-xs px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-surface-850 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-brand-500/50 hover:text-brand-500 transition-colors font-mono"
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Active Session — Agent Dialogue Feed */}
      {(activeSession || deliberate.isPending) && (
        <div className="card space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200/80 dark:border-slate-800">
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              🗣️ Agent Deliberation Feed
            </h2>
            {activeSession && (
              <span className={`badge ${activeSession.consensusReached ? 'badge-green' : 'badge-yellow'}`}>
                {activeSession.consensusReached ? '✅ CONSENSUS REACHED' : '⏳ DELIBERATING'}
              </span>
            )}
          </div>

          {deliberate.isPending && !activeSession && (
            <div className="flex flex-col items-center gap-3 py-8 text-slate-500">
              <div className="w-8 h-8 border-4 border-brand-500/30 border-t-brand-500 rounded-full animate-spin" />
              <p className="text-sm font-mono animate-pulse">Spawning 4 autonomous agents… building deliberation mesh…</p>
            </div>
          )}

          {activeSession && (
            <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
              {activeSession.messages.map((msg, i) => (
                <div
                  key={i}
                  className="flex gap-3 animate-in fade-in slide-in-from-left-2 duration-300"
                  style={{ animationDelay: `${i * 80}ms` }}
                >
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg flex-shrink-0 bg-slate-100 dark:bg-surface-850 border border-slate-200 dark:border-slate-800">
                    {msg.emoji}
                  </div>
                  <div className="flex-1 space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-slate-900 dark:text-white">{msg.displayName}</span>
                      {msg.vote && (
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${VOTE_STYLE[msg.vote]}`}>
                          {msg.vote}
                        </span>
                      )}
                      <span className="text-[10px] font-mono text-slate-500">
                        {new Date(msg.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                      {msg.message}
                    </p>
                    {msg.actionProposed && (
                      <div className="mt-1 p-2 rounded-lg bg-brand-500/10 border border-brand-500/20 text-[11px] font-mono text-brand-400">
                        📋 Action: {msg.actionProposed}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Consensus Decision Card */}
      {activeSession?.finalDecision && activeSession.consensusReached && (
        <div className="card border-2 border-emerald-500/30 space-y-3">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-200/80 dark:border-slate-800">
            <span className="text-lg">🤝</span>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">Agreed Coordinated Action Plan</h2>
            <span className="badge badge-green ml-auto">CONSENSUS 4/4</span>
          </div>
          <div className="prose prose-sm dark:prose-invert prose-slate max-w-none">
            <pre className="whitespace-pre-wrap font-sans text-xs text-slate-700 dark:text-slate-200 leading-relaxed">
              {activeSession.finalDecision}
            </pre>
          </div>
        </div>
      )}

      {/* Session History */}
      {sessions.length > 0 && (
        <div className="card space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200/80 dark:border-slate-800">
            <h2 className="text-base font-bold text-slate-900 dark:text-white">📋 Session History</h2>
            <span className="text-xs font-mono text-slate-500">{sessions.length} sessions</span>
          </div>
          <div className="space-y-2">
            {sessions.map((s) => (
              <button
                key={s.id}
                onClick={() => setActiveSession(s)}
                className="w-full text-left p-3 rounded-xl bg-slate-100/60 dark:bg-surface-850 border border-slate-200/80 dark:border-slate-800 hover:border-brand-500/40 transition-colors flex items-center justify-between group"
              >
                <div>
                  <p className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-brand-500">
                    {s.topic}
                  </p>
                  <p className="text-[11px] font-mono text-slate-500 mt-0.5">
                    {new Date(s.createdAt).toLocaleString()} · {s.messages.length} messages
                  </p>
                </div>
                <span className={`badge ${s.consensusReached ? 'badge-green' : 'badge-yellow'} ml-4 flex-shrink-0`}>
                  {s.consensusReached ? 'CONSENSUS' : 'PARTIAL'}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
