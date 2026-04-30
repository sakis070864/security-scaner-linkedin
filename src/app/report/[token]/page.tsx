'use client';

import { useState, useEffect, use } from 'react';
import { ShieldAlert, CheckCircle2, XCircle, AlertTriangle, Info, Lock, Loader2 } from 'lucide-react';

type CheckResult = { name: string; status: 'pass' | 'fail' | 'warn' | 'info'; detail: string; risk: string };
type DeepScanResult = {
  url: string; grade: string; score: number;
  totalChecks: number; passed: number; failed: number; warnings: number;
  headers: CheckResult[]; exposedFiles: CheckResult[]; adminPanels: CheckResult[];
  cookies: CheckResult[]; cors: CheckResult[]; infoDisclosure: CheckResult[];
  httpMethods: CheckResult[]; htmlAnalysis: CheckResult[];
  technologies: Array<{ name: string; category: string }>;
  trackers: { found: number; list: Array<{ name: string; type: string }> };
  gpc: { supported: boolean; details: string };
  timestamp: string;
};

function StatusIcon({ status }: { status: string }) {
  if (status === 'pass') return <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />;
  if (status === 'fail') return <XCircle className="w-4 h-4 text-red-500 shrink-0" />;
  if (status === 'warn') return <AlertTriangle className="w-4 h-4 text-yellow-500 shrink-0" />;
  return <Info className="w-4 h-4 text-blue-400 shrink-0" />;
}

function CheckSection({ title, icon, checks, defaultOpen = false }: { title: string; icon: string; checks: CheckResult[]; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  const fails = checks.filter(c => c.status === 'fail').length;
  const warns = checks.filter(c => c.status === 'warn').length;
  const passes = checks.filter(c => c.status === 'pass').length;

  return (
    <div className="bg-white/5 rounded-2xl border border-white/10 overflow-hidden">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between p-5 text-left hover:bg-white/[0.02] transition-colors">
        <div className="flex items-center gap-3">
          <span className="text-xl">{icon}</span>
          <span className="font-bold">{title}</span>
          <span className="text-xs text-slate-500">({checks.length} checks)</span>
        </div>
        <div className="flex items-center gap-2 text-xs">
          {fails > 0 && <span className="px-2 py-0.5 bg-red-500/10 text-red-500 rounded-full">{fails} FAIL</span>}
          {warns > 0 && <span className="px-2 py-0.5 bg-yellow-500/10 text-yellow-500 rounded-full">{warns} WARN</span>}
          <span className="px-2 py-0.5 bg-green-500/10 text-green-500 rounded-full">{passes} PASS</span>
          <span className="text-slate-400">{open ? '▲' : '▼'}</span>
        </div>
      </button>
      {open && (
        <div className="border-t border-white/5 divide-y divide-white/5">
          {checks.map((c, i) => (
            <div key={i} className={`flex items-start gap-3 px-5 py-3 ${c.status === 'fail' ? 'bg-red-500/5' : c.status === 'warn' ? 'bg-yellow-500/5' : ''}`}>
              <StatusIcon status={c.status} />
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium truncate">{c.name}</div>
                <div className="text-xs text-slate-500 mt-0.5">{c.detail}</div>
              </div>
              {c.risk !== 'None' && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded shrink-0 ${c.risk === 'Critical' ? 'bg-red-500/20 text-red-400' : c.risk === 'High' ? 'bg-orange-500/20 text-orange-400' : c.risk === 'Medium' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-blue-500/20 text-blue-400'}`}>{c.risk}</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ReportPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const [result, setResult] = useState<DeepScanResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [scanPhase, setScanPhase] = useState('');

  useEffect(() => {
    const phases = ['Resolving DNS...', 'Checking 15 security headers...', 'Probing 67 sensitive files...', 'Scanning 20 admin panels...', 'Testing HTTP methods...', 'Analyzing cookies & CORS...', 'Fingerprinting technologies...', 'Scanning trackers...', 'Analyzing HTML content...', 'Calculating risk score...'];
    let i = 0;
    const interval = setInterval(() => { setScanPhase(phases[i % phases.length]); i++; }, 2500);

    fetch(`/api/report/${token}`)
      .then(r => r.json())
      .then(data => {
        if (data.error) setError(data.error);
        else setResult(data.result);
      })
      .catch(() => setError('Failed to load report'))
      .finally(() => { setLoading(false); clearInterval(interval); });

    return () => clearInterval(interval);
  }, [token]);

  const gc = (g: string) => g === 'A' ? 'text-green-500' : g === 'B' ? 'text-blue-500' : g === 'C' ? 'text-yellow-500' : g === 'D' ? 'text-orange-500' : 'text-red-500';

  if (loading) return (
    <div className="min-h-screen bg-[#030712] flex items-center justify-center text-white">
      <div className="text-center">
        <Loader2 className="w-10 h-10 text-red-500 mx-auto mb-4 animate-spin" />
        <p className="text-lg font-bold mb-2">Running Deep Scan...</p>
        <p className="text-sm text-slate-400">{scanPhase}</p>
        <p className="text-xs text-slate-600 mt-4">150+ checks — this takes 15-30 seconds</p>
      </div>
    </div>
  );

  if (error) return (
    <div className="min-h-screen bg-[#030712] flex items-center justify-center text-white">
      <div className="text-center max-w-md p-8 bg-white/5 rounded-2xl border border-white/10">
        <AlertTriangle className="w-10 h-10 text-red-500 mx-auto mb-4" />
        <h2 className="text-xl font-bold mb-2">Report Unavailable</h2>
        <p className="text-slate-400 text-sm">{error}</p>
      </div>
    </div>
  );

  if (!result) return null;

  return (
    <div className="min-h-screen bg-[#030712] text-white">
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-[#030712]/80 border-b border-white/5">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 flex items-center gap-3">
          <ShieldAlert className="w-6 h-6 text-red-500" />
          <span className="font-bold text-lg">Athan<span className="text-red-500">DeepScan</span> — Full Report</span>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-10 space-y-4">
        {/* Grade + Stats */}
        <div className="bg-white/5 rounded-2xl p-8 border border-white/10 text-center">
          <div className={`text-7xl font-black ${gc(result.grade)}`}>{result.grade}</div>
          <div className="text-slate-500 mt-2">Score: {result.score}/100 — {result.totalChecks} checks performed</div>
          <div className="text-sm text-slate-600 mt-1">{result.url} — {new Date(result.timestamp).toLocaleDateString()}</div>
          <div className="flex justify-center gap-6 mt-4 text-sm">
            <span className="text-green-500">✓ {result.passed} Passed</span>
            <span className="text-red-500">✗ {result.failed} Failed</span>
            <span className="text-yellow-500">⚠ {result.warnings} Warnings</span>
          </div>
        </div>

        {/* GPC */}
        <div className={`rounded-2xl p-5 border ${result.gpc.supported ? 'bg-green-500/5 border-green-500/20' : 'bg-red-500/5 border-red-500/20'} flex items-center gap-4`}>
          {result.gpc.supported ? <CheckCircle2 className="w-6 h-6 text-green-500" /> : <XCircle className="w-6 h-6 text-red-500" />}
          <div>
            <div className="font-bold text-sm">Global Privacy Control (GPC)</div>
            <div className="text-xs text-slate-400">{result.gpc.details}</div>
          </div>
        </div>

        {/* All Check Sections */}
        <CheckSection title="Security Headers" icon="🛡️" checks={result.headers} defaultOpen={true} />
        <CheckSection title="Exposed Files & Paths" icon="📁" checks={result.exposedFiles} defaultOpen={false} />
        <CheckSection title="Admin Panels" icon="🔓" checks={result.adminPanels} defaultOpen={false} />
        <CheckSection title="Cookie Security" icon="🍪" checks={result.cookies} defaultOpen={true} />
        <CheckSection title="CORS Policy" icon="🌐" checks={result.cors} defaultOpen={true} />
        <CheckSection title="Information Disclosure" icon="💬" checks={result.infoDisclosure} defaultOpen={true} />
        <CheckSection title="HTTP Methods" icon="📡" checks={result.httpMethods} defaultOpen={false} />
        <CheckSection title="HTML Content Analysis" icon="📄" checks={result.htmlAnalysis} defaultOpen={false} />

        {/* Technologies */}
        {result.technologies.length > 0 && (
          <div className="bg-white/5 rounded-2xl p-5 border border-white/10">
            <div className="flex items-center gap-3 mb-4"><span className="text-xl">🔍</span><span className="font-bold">Detected Technologies</span></div>
            <div className="flex flex-wrap gap-2">
              {result.technologies.map((t, i) => (
                <span key={i} className="px-3 py-1.5 bg-purple-500/10 text-purple-300 rounded-lg text-sm border border-purple-500/20">
                  {t.name} <span className="text-xs opacity-60">({t.category})</span>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Trackers */}
        {result.trackers.found > 0 && (
          <div className="bg-white/5 rounded-2xl p-5 border border-white/10">
            <div className="flex items-center gap-3 mb-4"><span className="text-xl">👁️</span><span className="font-bold">Pre-Consent Trackers ({result.trackers.found})</span></div>
            <div className="space-y-2">
              {result.trackers.list.map((t, i) => (
                <div key={i} className="flex justify-between py-2 border-b border-white/5">
                  <span className="text-sm">{t.name}</span>
                  <span className="text-xs px-2 py-0.5 rounded bg-white/10">{t.type}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      <footer className="text-center py-6 text-xs text-slate-500 border-t border-white/5">
        CREATED BY ATHANASIOS (SAKIS) ATHANASOPOULOS — Athan Security
      </footer>
    </div>
  );
}
