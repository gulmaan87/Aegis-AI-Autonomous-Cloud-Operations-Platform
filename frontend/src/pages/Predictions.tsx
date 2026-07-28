import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';

type AnomalyStatus = 'NORMAL' | 'WARNING' | 'ANOMALY_DETECTED' | 'BREACH_IMMINENT';
type Severity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

interface AnomalyPrediction {
  id: string;
  metricName: string;
  service: string;
  currentValue: number;
  predictedValue: number;
  burnRatePerMin: number;
  timeToBreachMin: number | null;
  confidence: number;
  status: AnomalyStatus;
  severity: Severity;
  recommendation: string;
  updatedAt: string;
}

const STATUS_BADGE: Record<AnomalyStatus, string> = {
  NORMAL:           'badge badge-green',
  WARNING:          'badge badge-yellow',
  ANOMALY_DETECTED: 'badge badge-blue',
  BREACH_IMMINENT:  'badge badge-red',
};

const SEVERITY_COLOR: Record<Severity, string> = {
  LOW:      'text-blue-500 dark:text-blue-400',
  MEDIUM:   'text-amber-500 dark:text-amber-400',
  HIGH:     'text-orange-500 dark:text-orange-400',
  CRITICAL: 'text-rose-600 dark:text-rose-400 font-bold',
};

export default function Predictions() {
  const queryClient = useQueryClient();
  const [scanning, setScanning] = useState(false);

  const { data: predictions = [], isLoading } = useQuery<AnomalyPrediction[]>({
    queryKey: ['predictions'],
    queryFn: async () => (await api.get('/predictions')).data,
    refetchInterval: 5000,
  });

  const scanMutation = useMutation({
    mutationFn: async () => (await api.post('/predictions/scan')).data,
    onMutate: () => setScanning(true),
    onSettled: () => {
      setScanning(false);
      queryClient.invalidateQueries({ queryKey: ['predictions'] });
    },
  });

  const imminentBreaches = predictions.filter((p) => p.status === 'BREACH_IMMINENT').length;
  const anomaliesCount = predictions.filter((p) => p.status !== 'NORMAL').length;
  const maxBurnRate = predictions.reduce((max, p) => Math.max(max, p.burnRatePerMin), 0);
  const avgConfidence = predictions.length
    ? Math.round(predictions.reduce((acc, p) => acc + p.confidence, 0) / predictions.length)
    : 0;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight flex items-center gap-2 text-slate-900 dark:text-white">
            <span>🔮 Predictive Anomaly Detection</span>
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            Real-time time-series trend forecasting, burn rate analysis, and early SLA breach warnings.
          </p>
        </div>
        <button
          onClick={() => scanMutation.mutate()}
          disabled={scanning}
          className="btn-primary self-start sm:self-auto flex items-center gap-2 text-sm"
        >
          {scanning ? (
            <>
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin inline-block" />
              Scanning Metrics…
            </>
          ) : (
            <>
              <span>⚡ Run Predictive Scan</span>
            </>
          )}
        </button>
      </div>

      {/* Metrics Summary Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card">
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Detected Anomalies
          </p>
          <p className="text-3xl font-extrabold mt-2 text-slate-900 dark:text-white">
            {anomaliesCount}
          </p>
          <p className="text-xs text-slate-500 mt-1">Out of {predictions.length} monitored parameters</p>
        </div>

        <div className="card">
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Imminent SLA Breaches
          </p>
          <p className={`text-3xl font-extrabold mt-2 ${imminentBreaches > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
            {imminentBreaches}
          </p>
          <p className="text-xs text-slate-500 mt-1">Predicted threshold breach &lt; 15 min</p>
        </div>

        <div className="card">
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Peak Burn Rate
          </p>
          <p className="text-3xl font-extrabold mt-2 text-slate-900 dark:text-white">
            +{maxBurnRate.toFixed(1)} <span className="text-sm font-normal text-slate-500">/min</span>
          </p>
          <p className="text-xs text-slate-500 mt-1">Highest metric escalation speed</p>
        </div>

        <div className="card">
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Forecast Confidence
          </p>
          <p className="text-3xl font-extrabold mt-2 text-brand-600 dark:text-brand-400">
            {avgConfidence}%
          </p>
          <p className="text-xs text-slate-500 mt-1">Time-series model statistical accuracy</p>
        </div>
      </div>

      {/* Anomaly & Forecast Table */}
      <div className="card">
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-200/80 dark:border-slate-800">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">
            Active Metric Forecasts &amp; SLA Breach Predictions
          </h2>
          <span className="text-xs text-slate-500 font-mono">
            Auto-refreshes every 5s
          </span>
        </div>

        {isLoading ? (
          <div className="py-12 text-center text-slate-500">
            <span className="inline-block w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin mb-2" />
            <p>Evaluating metric trends and calculating burn rates…</p>
          </div>
        ) : predictions.length === 0 ? (
          <div className="py-12 text-center text-slate-500">
            No metrics monitored yet. Click "Run Predictive Scan" to generate forecasts.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200/80 dark:border-slate-800 text-xs font-bold uppercase tracking-wider text-slate-500">
                  <th className="pb-3 px-2">Service / Metric</th>
                  <th className="pb-3 px-2">Status</th>
                  <th className="pb-3 px-2">Current</th>
                  <th className="pb-3 px-2">15m Forecast</th>
                  <th className="pb-3 px-2">Burn Rate</th>
                  <th className="pb-3 px-2">Time to Breach</th>
                  <th className="pb-3 px-2">Confidence</th>
                  <th className="pb-3 px-2">AI Recommendation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/60 dark:divide-slate-800/60">
                {predictions.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-100/50 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="py-4 px-2">
                      <p className="font-bold text-slate-900 dark:text-white">{item.service}</p>
                      <p className="text-xs font-mono text-brand-600 dark:text-brand-400">{item.metricName}</p>
                    </td>

                    <td className="py-4 px-2">
                      <span className={STATUS_BADGE[item.status]}>
                        {item.status.replace(/_/g, ' ')}
                      </span>
                    </td>

                    <td className="py-4 px-2 font-mono font-semibold text-slate-900 dark:text-slate-100">
                      {item.currentValue}
                      {item.metricName.includes('RATE') || item.metricName.includes('USAGE') || item.metricName.includes('PRESSURE') ? '%' : 'ms'}
                    </td>

                    <td className="py-4 px-2 font-mono font-semibold text-slate-900 dark:text-slate-100">
                      {item.predictedValue}
                      {item.metricName.includes('RATE') || item.metricName.includes('USAGE') || item.metricName.includes('PRESSURE') ? '%' : 'ms'}
                    </td>

                    <td className="py-4 px-2 font-mono text-slate-700 dark:text-slate-300">
                      +{item.burnRatePerMin} /min
                    </td>

                    <td className="py-4 px-2">
                      {item.timeToBreachMin === 0 ? (
                        <span className="text-xs font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/50 px-2 py-1 rounded">
                          BREACHED NOW
                        </span>
                      ) : item.timeToBreachMin !== null ? (
                        <span className="text-xs font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50 px-2 py-1 rounded">
                          ⏱️ ~{item.timeToBreachMin} mins
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400">Safe (Nominal)</span>
                      )}
                    </td>

                    <td className="py-4 px-2">
                      <div className="flex items-center gap-2">
                        <div className="w-16 bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                          <div
                            className="bg-brand-500 h-2 rounded-full"
                            style={{ width: `${item.confidence}%` }}
                          />
                        </div>
                        <span className="text-xs font-mono text-slate-500">{item.confidence}%</span>
                      </div>
                    </td>

                    <td className="py-4 px-2 max-w-xs text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                      <p className={SEVERITY_COLOR[item.severity]}>
                        {item.recommendation}
                      </p>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
