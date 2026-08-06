import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';

type ComplianceStatus = 'PASSED' | 'WARNING' | 'FAILED' | 'CRITICAL';

interface VulnerabilityItem {
  cveId: string;
  package: string;
  installedVersion: string;
  fixedVersion: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  description: string;
}

interface CisCheckItem {
  checkId: string;
  title: string;
  category: string;
  status: 'PASSED' | 'FAILED';
  remediation: string;
}

interface SecurityScanRecord {
  id: string;
  target: string;
  cveCountCritical: number;
  cveCountHigh: number;
  cveCountMedium: number;
  cveCountLow: number;
  cisScore: number;
  status: ComplianceStatus;
  vulnerabilities: string; // JSON string
  cisChecks: string;       // JSON string
  createdAt: string;
}

interface SecurityAuditReport {
  id: string;
  overallScore: number;
  totalVulnerabilities: number;
  criticalVulnerabilities: number;
  complianceStatus: ComplianceStatus;
  summary: string;
  model: string;
  createdAt: string;
}

const STATUS_BADGE: Record<ComplianceStatus, string> = {
  PASSED:   'badge badge-green',
  WARNING:  'badge badge-yellow',
  FAILED:   'badge badge-red',
  CRITICAL: 'badge bg-rose-600/30 text-rose-300 font-bold',
};

const CVE_SEVERITY_BADGE: Record<'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW', string> = {
  CRITICAL: 'bg-rose-600/30 text-rose-300 border border-rose-500/40 px-2 py-0.5 rounded text-xs font-bold',
  HIGH:     'bg-orange-500/20 text-orange-400 border border-orange-500/30 px-2 py-0.5 rounded text-xs font-semibold',
  MEDIUM:   'bg-amber-500/20 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded text-xs font-medium',
  LOW:      'bg-blue-500/20 text-blue-400 border border-blue-500/30 px-2 py-0.5 rounded text-xs font-medium',
};

export default function Security() {
  const queryClient = useQueryClient();
  const [scanning, setScanning] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<SecurityScanRecord | null>(null);

  const { data: scans = [], isLoading: loadingScans } = useQuery<SecurityScanRecord[]>({
    queryKey: ['security-scans'],
    queryFn: async () => (await api.get('/security/scans')).data,
    refetchInterval: 10000,
  });

  const { data: reports = [], isLoading: loadingReports } = useQuery<SecurityAuditReport[]>({
    queryKey: ['security-reports'],
    queryFn: async () => (await api.get('/security/reports')).data,
    refetchInterval: 10000,
  });

  const scanMutation = useMutation({
    mutationFn: async () => (await api.post('/security/scan')).data,
    onMutate: () => setScanning(true),
    onSettled: () => {
      setScanning(false);
      queryClient.invalidateQueries({ queryKey: ['security-scans'] });
      queryClient.invalidateQueries({ queryKey: ['security-reports'] });
    },
  });

  const latestReport = reports[0];
  const overallScore = latestReport?.overallScore ?? 100;
  const totalCves = latestReport?.totalVulnerabilities ?? 0;
  const criticalCves = latestReport?.criticalVulnerabilities ?? 0;
  const overallStatus = latestReport?.complianceStatus ?? 'PASSED';

  const avgCisPassRate = scans.length
    ? Math.round(scans.reduce((acc, s) => acc + s.cisScore, 0) / scans.length)
    : 100;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight flex items-center gap-2 text-slate-900 dark:text-white">
            <span>🛡️ Security &amp; Compliance Auditor</span>
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            Automated container vulnerability scanning (CVEs), CIS benchmark audits, and AI remediation roadmaps.
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
              Scanning Workloads…
            </>
          ) : (
            <>
              <span>⚡ Run Security Scan</span>
            </>
          )}
        </button>
      </div>

      {/* Metrics Summary Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card">
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Overall Security Score
          </p>
          <div className="flex items-baseline gap-2 mt-2">
            <span className={`text-3xl font-extrabold ${
              overallScore > 85 ? 'text-emerald-600 dark:text-emerald-400' : overallScore > 65 ? 'text-amber-600 dark:text-amber-400' : 'text-rose-600 dark:text-rose-400'
            }`}>
              {overallScore}
            </span>
            <span className="text-xs font-bold text-slate-500">/ 100</span>
          </div>
          <p className="text-xs text-slate-500 mt-1">Weighted CIS + CVE security rating</p>
        </div>

        <div className="card">
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Detected Vulnerabilities
          </p>
          <p className="text-3xl font-extrabold mt-2 text-slate-900 dark:text-white">
            {totalCves} <span className="text-xs font-normal text-rose-500">({criticalCves} Critical)</span>
          </p>
          <p className="text-xs text-slate-500 mt-1">Unpatched container CVE findings</p>
        </div>

        <div className="card">
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            CIS Benchmark Pass Rate
          </p>
          <p className="text-3xl font-extrabold mt-2 text-brand-600 dark:text-brand-400">
            {avgCisPassRate}%
          </p>
          <p className="text-xs text-slate-500 mt-1">Cluster hardening standards met</p>
        </div>

        <div className="card">
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Compliance Posture
          </p>
          <div className="mt-2">
            <span className={STATUS_BADGE[overallStatus]}>
              {overallStatus}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">Evaluated against CIS &amp; NIST standards</p>
        </div>
      </div>

      {/* Target Workloads Security & CIS Table */}
      <div className="card">
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-200/80 dark:border-slate-800">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">
            Workload Container Vulnerabilities &amp; CIS Audit
          </h2>
          <span className="text-xs text-slate-500 font-mono">
            Auto-refreshes every 10s
          </span>
        </div>

        {loadingScans ? (
          <div className="py-12 text-center text-slate-500">
            <span className="inline-block w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin mb-2" />
            <p>Fetching workload security audit records…</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200/80 dark:border-slate-800 text-xs font-bold uppercase tracking-wider text-slate-500">
                  <th className="pb-3 px-2">Workload Target</th>
                  <th className="pb-3 px-2">CVE Breakdown</th>
                  <th className="pb-3 px-2">CIS Score</th>
                  <th className="pb-3 px-2">Status</th>
                  <th className="pb-3 px-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/60 dark:divide-slate-800/60">
                {scans.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-100/50 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="py-4 px-2">
                      <p className="font-bold text-slate-900 dark:text-white">{item.target}</p>
                    </td>

                    <td className="py-4 px-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {item.cveCountCritical > 0 && (
                          <span className="bg-rose-600/30 text-rose-300 font-bold px-2 py-0.5 rounded text-xs">
                            {item.cveCountCritical} Crit
                          </span>
                        )}
                        {item.cveCountHigh > 0 && (
                          <span className="bg-orange-500/20 text-orange-400 font-semibold px-2 py-0.5 rounded text-xs">
                            {item.cveCountHigh} High
                          </span>
                        )}
                        {item.cveCountMedium > 0 && (
                          <span className="bg-amber-500/20 text-amber-400 font-medium px-2 py-0.5 rounded text-xs">
                            {item.cveCountMedium} Med
                          </span>
                        )}
                        {item.cveCountCritical === 0 && item.cveCountHigh === 0 && item.cveCountMedium === 0 && (
                          <span className="bg-emerald-500/20 text-emerald-400 font-medium px-2 py-0.5 rounded text-xs">
                            0 Vulnerabilities
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="py-4 px-2">
                      <div className="flex items-center gap-2">
                        <div className="w-20 bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${
                              item.cisScore > 80
                                ? 'bg-emerald-500'
                                : item.cisScore > 50
                                ? 'bg-amber-500'
                                : 'bg-rose-500'
                            }`}
                            style={{ width: `${item.cisScore}%` }}
                          />
                        </div>
                        <span className="text-xs font-mono font-semibold text-slate-700 dark:text-slate-300">
                          {item.cisScore}%
                        </span>
                      </div>
                    </td>

                    <td className="py-4 px-2">
                      <span className={STATUS_BADGE[item.status]}>
                        {item.status}
                      </span>
                    </td>

                    <td className="py-4 px-2 text-right">
                      <button
                        onClick={() => setSelectedRecord(item)}
                        className="text-xs font-semibold text-brand-600 dark:text-brand-400 hover:underline"
                      >
                        Inspect Details →
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* AI Security Patch & Hardening Roadmap Panel */}
      <div className="card space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-200/80 dark:border-slate-800">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span>🤖 AI Security Patch Roadmap &amp; Hardening Guidance</span>
            </h2>
            <p className="text-xs text-slate-500">
              Generated by Aegis DevSecOps AI Engine ({latestReport?.model ?? 'mock engine'})
            </p>
          </div>
          {latestReport && (
            <span className="text-xs font-mono text-slate-500">
              Reported: {new Date(latestReport.createdAt).toLocaleTimeString()}
            </span>
          )}
        </div>

        {loadingReports ? (
          <div className="py-8 text-center text-slate-500">
            <span className="inline-block w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin mb-2" />
            <p>Synthesizing container vulnerability finding insights…</p>
          </div>
        ) : (
          <div className="prose prose-sm dark:prose-invert max-w-none text-slate-700 dark:text-slate-300 leading-relaxed font-sans">
            <div className="bg-slate-100/60 dark:bg-surface-850 p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 font-mono text-xs whitespace-pre-wrap">
              {latestReport?.summary}
            </div>
          </div>
        )}
      </div>

      {/* Workload Vulnerability & CIS Details Modal */}
      {selectedRecord && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-surface-850 rounded-2xl max-w-3xl w-full max-h-[85vh] overflow-hidden flex flex-col shadow-2xl border border-slate-200 dark:border-slate-800">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  Security Inspection: {selectedRecord.target}
                </h3>
                <p className="text-xs text-slate-500">
                  CIS Score: {selectedRecord.cisScore}% · Status: {selectedRecord.status}
                </p>
              </div>
              <button
                onClick={() => setSelectedRecord(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white font-bold text-lg"
              >
                ✕
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto space-y-6 text-sm">
              {/* CVE Vulnerabilities */}
              <div>
                <h4 className="font-bold text-slate-900 dark:text-white text-sm mb-3">
                  🐛 CVE Container Vulnerabilities
                </h4>
                {(() => {
                  try {
                    const vulns: VulnerabilityItem[] = JSON.parse(selectedRecord.vulnerabilities);
                    if (vulns.length === 0) {
                      return <p className="text-xs text-emerald-500">No CVE vulnerabilities detected in base image!</p>;
                    }
                    return (
                      <div className="space-y-2">
                        {vulns.map((v, i) => (
                          <div key={i} className="p-3 rounded-lg bg-slate-100 dark:bg-surface-800 border border-slate-200 dark:border-slate-700">
                            <div className="flex items-center justify-between">
                              <span className="font-mono font-bold text-slate-900 dark:text-white">{v.cveId}</span>
                              <span className={CVE_SEVERITY_BADGE[v.severity]}>{v.severity}</span>
                            </div>
                            <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">{v.description}</p>
                            <div className="mt-2 text-xs font-mono text-slate-500 flex gap-4">
                              <span>Package: <strong className="text-slate-700 dark:text-slate-200">{v.package}</strong></span>
                              <span>Installed: {v.installedVersion}</span>
                              <span>Fixed in: <strong className="text-emerald-500">{v.fixedVersion}</strong></span>
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  } catch {
                    return <p className="text-xs text-slate-400">Failed to parse vulnerability details.</p>;
                  }
                })()}
              </div>

              {/* CIS Checks */}
              <div>
                <h4 className="font-bold text-slate-900 dark:text-white text-sm mb-3">
                  📋 CIS Benchmark Hardening Checks
                </h4>
                {(() => {
                  try {
                    const checks: CisCheckItem[] = JSON.parse(selectedRecord.cisChecks);
                    return (
                      <div className="space-y-2">
                        {checks.map((c, i) => (
                          <div key={i} className="p-3 rounded-lg bg-slate-100 dark:bg-surface-800 border border-slate-200 dark:border-slate-700 flex items-start justify-between">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-xs font-bold text-brand-600 dark:text-brand-400">{c.checkId}</span>
                                <span className="text-xs font-semibold text-slate-900 dark:text-white">{c.title}</span>
                              </div>
                              <p className="text-xs text-slate-500 mt-1">Remediation: {c.remediation}</p>
                            </div>
                            <span className={c.status === 'PASSED' ? 'badge badge-green' : 'badge badge-red'}>
                              {c.status}
                            </span>
                          </div>
                        ))}
                      </div>
                    );
                  } catch {
                    return <p className="text-xs text-slate-400">Failed to parse CIS check details.</p>;
                  }
                })()}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex justify-end">
              <button
                onClick={() => setSelectedRecord(null)}
                className="btn-primary text-xs"
              >
                Close Inspection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
