import { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';

// ── Types ─────────────────────────────────────────────────────────────────────
type ServiceStatus = 'healthy' | 'degraded' | 'down';

interface Service {
  id: string;
  label: string;
  port: number;
  status: ServiceStatus;
  group: 'app' | 'data' | 'monitoring';
  url: string | null;
}

interface ServicesResponse {
  services: Service[];
  chaosActive: boolean;
  openIncidents: number;
}

interface ChaosStatus {
  active: { type: string } | null;
  activeFlags: Record<string, string>;
}

// ── Node layout (SVG viewport 900×520) ───────────────────────────────────────
const NODE_W = 130;
const NODE_H = 46;

interface NodeDef {
  id: string;
  x: number;
  y: number;
}

const NODE_POSITIONS: NodeDef[] = [
  { id: 'frontend',     x: 385,  y: 30  },
  { id: 'backend',      x: 385,  y: 180 },
  { id: 'postgres',     x: 680,  y: 180 },
  { id: 'redis',        x: 680,  y: 300 },
  { id: 'prometheus',   x: 90,   y: 300 },
  { id: 'alertmanager', x: 90,   y: 420 },
  { id: 'grafana',      x: 385,  y: 420 },
];

// Connections: [from, to]
const EDGES: [string, string][] = [
  ['frontend',     'backend'     ],
  ['backend',      'postgres'    ],
  ['backend',      'redis'       ],
  ['backend',      'prometheus'  ],
  ['prometheus',   'alertmanager'],
  ['prometheus',   'grafana'     ],
];

// ── Colors ───────────────────────────────────────────────────────────────────
const STATUS_RING: Record<ServiceStatus, string> = {
  healthy:  '#34d399',  // emerald-400
  degraded: '#fbbf24',  // amber-400
  down:     '#f87171',  // red-400
};

const STATUS_FILL: Record<ServiceStatus, string> = {
  healthy:  'rgba(52,211,153,0.06)',
  degraded: 'rgba(251,191,36,0.10)',
  down:     'rgba(248,113,113,0.12)',
};

const GROUP_ICON: Record<Service['group'], string> = {
  app:        '⚙',
  data:       '🗄',
  monitoring: '📊',
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function cx(pos: NodeDef) { return pos.x + NODE_W / 2; }
function cy(pos: NodeDef) { return pos.y + NODE_H / 2; }

function getPos(id: string) {
  return NODE_POSITIONS.find((n) => n.id === id)!;
}

// ── Animated traffic dot along an SVG path ────────────────────────────────────
function TrafficDot({ x1, y1, x2, y2, delay = 0, color }: {
  x1: number; y1: number; x2: number; y2: number; delay?: number; color: string;
}) {
  const pathId = `path-${x1}-${y1}-${x2}-${y2}-${delay}`;
  return (
    <g>
      <path id={pathId} d={`M${x1},${y1} L${x2},${y2}`} fill="none" stroke="none" />
      <circle r="3.5" fill={color} opacity="0.85">
        <animateMotion dur="2.2s" repeatCount="indefinite" begin={`${delay}s`}>
          <mpath href={`#${pathId}`} />
        </animateMotion>
      </circle>
    </g>
  );
}

// ── Tooltip ───────────────────────────────────────────────────────────────────
interface TooltipData {
  service: Service;
  x: number;
  y: number;
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function Infrastructure() {
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);
  const [shake, setShake] = useState<Set<string>>(new Set());
  const svgRef = useRef<SVGSVGElement>(null);

  const { data, isLoading } = useQuery<ServicesResponse>({
    queryKey: ['health-services'],
    queryFn: async () => (await api.get('/health/services')).data,
    refetchInterval: 5000,
  });

  const { data: chaosStatus } = useQuery<ChaosStatus>({
    queryKey: ['chaos-status'],
    queryFn: async () => (await api.get('/chaos/status')).data,
    refetchInterval: 3000,
  });

  // Trigger shake animation on chaos-affected nodes
  useEffect(() => {
    if (!chaosStatus?.active) { setShake(new Set()); return; }
    const type = chaosStatus.active.type;
    const affected = new Set<string>(['backend']);
    if (type === 'DB_SLOWDOWN')     affected.add('postgres');
    if (type === 'MEMORY_PRESSURE') affected.add('backend');
    setShake(affected);
  }, [chaosStatus]);

  const serviceMap = new Map<string, Service>(
    (data?.services ?? []).map((s) => [s.id, s])
  );

  const chaosActive = data?.chaosActive ?? false;
  const openIncidents = data?.openIncidents ?? 0;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-100">Infrastructure Map</h1>
          <p className="text-slate-400 text-sm mt-0.5">Live topology of all Aegis stack services</p>
        </div>
        <div className="flex items-center gap-3">
          {chaosActive && (
            <span className="badge badge-red">
              <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
              Chaos Active
            </span>
          )}
          {openIncidents > 0 && (
            <span className="badge badge-yellow">
              ⚠ {openIncidents} open incident{openIncidents > 1 ? 's' : ''}
            </span>
          )}
          <span className="badge badge-green">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Live
          </span>
        </div>
      </div>

      {/* Map Card */}
      <div className="card p-0 overflow-hidden relative">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-surface-800/80 z-10 rounded-xl">
            <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        <svg
          ref={svgRef}
          viewBox="0 0 900 520"
          className="w-full"
          style={{ maxHeight: '520px', background: 'transparent' }}
          onMouseLeave={() => setTooltip(null)}
        >
          {/* ── Grid dots background ── */}
          <defs>
            <pattern id="grid" width="30" height="30" patternUnits="userSpaceOnUse">
              <circle cx="15" cy="15" r="0.8" fill="rgba(255,255,255,0.04)" />
            </pattern>
          </defs>
          <rect width="900" height="520" fill="url(#grid)" />

          {/* ── Edges ── */}
          {EDGES.map(([fromId, toId]) => {
            const from = getPos(fromId);
            const to   = getPos(toId);
            if (!from || !to) return null;
            const x1 = cx(from), y1 = cy(from);
            const x2 = cx(to),   y2 = cy(to);
            const fromSvc = serviceMap.get(fromId);
            const toSvc   = serviceMap.get(toId);
            const isDown  = fromSvc?.status === 'down' || toSvc?.status === 'down';
            const isDeg   = fromSvc?.status === 'degraded' || toSvc?.status === 'degraded';
            const edgeColor = isDown ? '#f87171' : isDeg ? '#fbbf24' : '#4b5563';
            const dotColor  = isDown ? '#f87171' : isDeg ? '#fbbf24' : '#818cf8';

            return (
              <g key={`${fromId}-${toId}`}>
                {/* Static line */}
                <line
                  x1={x1} y1={y1} x2={x2} y2={y2}
                  stroke={edgeColor}
                  strokeWidth="1.5"
                  strokeDasharray={isDown ? '6 4' : '0'}
                  opacity="0.5"
                />
                {/* Animated traffic dot */}
                {!isDown && (
                  <TrafficDot
                    x1={x1} y1={y1} x2={x2} y2={y2}
                    delay={(EDGES.indexOf([fromId, toId] as [string, string])) * 0.35}
                    color={dotColor}
                  />
                )}
              </g>
            );
          })}

          {/* ── Nodes ── */}
          {NODE_POSITIONS.map((pos) => {
            const svc = serviceMap.get(pos.id);
            const status: ServiceStatus = svc?.status ?? 'healthy';
            const isShaking = shake.has(pos.id);
            const ringColor = STATUS_RING[status];
            const fillColor = STATUS_FILL[status];
            const icon = GROUP_ICON[svc?.group ?? 'app'];

            return (
              <g
                key={pos.id}
                style={{ cursor: 'pointer' }}
                onMouseEnter={(e) => {
                  if (!svc) return;
                  const rect = svgRef.current?.getBoundingClientRect();
                  if (!rect) return;
                  setTooltip({ service: svc, x: e.clientX - rect.left, y: e.clientY - rect.top });
                }}
                onMouseLeave={() => setTooltip(null)}
              >
                {/* Pulse ring on degraded */}
                {status === 'degraded' && (
                  <rect
                    x={pos.x - 4} y={pos.y - 4}
                    width={NODE_W + 8} height={NODE_H + 8}
                    rx="14" ry="14"
                    fill="none"
                    stroke="#fbbf24"
                    strokeWidth="1"
                    opacity="0.4"
                  >
                    <animate attributeName="opacity" values="0.4;0;0.4" dur="2s" repeatCount="indefinite" />
                    <animate attributeName="stroke-width" values="1;3;1" dur="2s" repeatCount="indefinite" />
                  </rect>
                )}

                {/* Node box */}
                <rect
                  x={pos.x} y={pos.y}
                  width={NODE_W} height={NODE_H}
                  rx="10" ry="10"
                  fill={fillColor}
                  stroke={ringColor}
                  strokeWidth="1.5"
                  style={isShaking ? { animation: 'shake 0.4s infinite' } : undefined}
                />

                {/* Status dot */}
                <circle
                  cx={pos.x + NODE_W - 12}
                  cy={pos.y + 12}
                  r="4"
                  fill={ringColor}
                >
                  {status === 'degraded' && (
                    <animate attributeName="opacity" values="1;0.3;1" dur="1.2s" repeatCount="indefinite" />
                  )}
                </circle>

                {/* Icon */}
                <text
                  x={pos.x + 14} y={pos.y + NODE_H / 2 + 5}
                  fontSize="14" textAnchor="middle"
                >
                  {icon}
                </text>

                {/* Label */}
                <text
                  x={pos.x + 26} y={pos.y + NODE_H / 2 - 3}
                  fontSize="11" fontWeight="600"
                  fill="#e2e8f0" fontFamily="Inter, sans-serif"
                >
                  {svc?.label ?? pos.id}
                </text>

                {/* Port */}
                <text
                  x={pos.x + 26} y={pos.y + NODE_H / 2 + 11}
                  fontSize="9"
                  fill="#64748b" fontFamily="Inter, sans-serif"
                >
                  :{svc?.port}
                </text>
              </g>
            );
          })}

          {/* ── Chaos lightning bolt overlay ── */}
          {chaosActive && (
            <text x="450" y="140" fontSize="28" textAnchor="middle" opacity="0.6">
              <animate attributeName="opacity" values="0.6;0.1;0.6" dur="0.8s" repeatCount="indefinite" />
              ⚡
            </text>
          )}
        </svg>

        {/* CSS shake animation */}
        <style>{`
          @keyframes shake {
            0%,100% { transform: translateX(0); }
            25%      { transform: translateX(-3px); }
            75%      { transform: translateX(3px); }
          }
        `}</style>

        {/* Tooltip */}
        {tooltip && (
          <div
            className="absolute z-20 pointer-events-none bg-surface-700 border border-white/10 rounded-xl px-4 py-3 shadow-xl text-sm"
            style={{ left: tooltip.x + 12, top: tooltip.y - 10, minWidth: 200 }}
          >
            <div className="flex items-center gap-2 mb-2">
              <span className="text-base">{GROUP_ICON[tooltip.service.group]}</span>
              <p className="font-semibold text-slate-100">{tooltip.service.label}</p>
            </div>
            <div className="space-y-1 text-xs text-slate-400">
              <div className="flex justify-between">
                <span>Status</span>
                <span className={
                  tooltip.service.status === 'healthy'  ? 'text-emerald-400' :
                  tooltip.service.status === 'degraded' ? 'text-amber-400' : 'text-red-400'
                }>
                  {tooltip.service.status}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Port</span>
                <span className="text-slate-300">:{tooltip.service.port}</span>
              </div>
              <div className="flex justify-between">
                <span>Group</span>
                <span className="text-slate-300 capitalize">{tooltip.service.group}</span>
              </div>
              {tooltip.service.url && (
                <div className="pt-1 border-t border-white/8 mt-1">
                  <span className="text-brand-400 text-xs">🔗 {tooltip.service.url}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Legend + Service grid */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Legend */}
        <div className="card">
          <h2 className="text-sm font-semibold text-slate-300 mb-3">Legend</h2>
          <div className="space-y-2">
            {([
              { color: '#34d399', label: 'Healthy', desc: 'Service responding normally' },
              { color: '#fbbf24', label: 'Degraded', desc: 'Slow or chaos experiment active' },
              { color: '#f87171', label: 'Down',    desc: 'Unreachable or health check failed' },
            ] as const).map(({ color, label, desc }) => (
              <div key={label} className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: color }} />
                <div>
                  <p className="text-sm text-slate-200">{label}</p>
                  <p className="text-xs text-slate-500">{desc}</p>
                </div>
              </div>
            ))}
            <div className="flex items-center gap-3 pt-1">
              <div className="w-3 flex items-center justify-center flex-shrink-0">
                <span className="text-xs">⚡</span>
              </div>
              <div>
                <p className="text-sm text-slate-200">Chaos Overlay</p>
                <p className="text-xs text-slate-500">Node shakes when receiving failure injection</p>
              </div>
            </div>
          </div>
        </div>

        {/* Service grid */}
        <div className="card">
          <h2 className="text-sm font-semibold text-slate-300 mb-3">Services</h2>
          <div className="space-y-2">
            {(data?.services ?? []).map((svc) => (
              <div key={svc.id} className="flex items-center gap-3 bg-surface-700 rounded-lg px-3 py-2">
                <div
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ background: STATUS_RING[svc.status] }}
                />
                <p className="text-sm text-slate-200 flex-1">{svc.label}</p>
                <span className="text-xs text-slate-500">:{svc.port}</span>
                {svc.url && (
                  <a
                    href={svc.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-brand-400 hover:text-brand-300 transition-colors"
                  >
                    Open ↗
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
