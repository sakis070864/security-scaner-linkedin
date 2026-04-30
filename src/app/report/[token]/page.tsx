'use client';

import { useState, useEffect, use } from 'react';
import { ShieldAlert, CheckCircle2, XCircle, Server, Cookie, FolderOpen, Eye, Fingerprint, Download, AlertTriangle } from 'lucide-react';

type DeepScanResult = {
  url: string; grade: string; score: number;
  headers: Array<{ name: string; present: boolean; value: string }>;
  gpc: { supported: boolean; wellKnownFound: boolean; details: string };
  trackers: { found: number; list: Array<{ name: string; domain: string; type: string }> };
  exposedFiles: Array<{ path: string; accessible: boolean; risk: string; desc: string; status: number }>;
  adminPanels: Array<{ path: string; name: string; accessible: boolean; status: number }>;
  cookies: Array<{ name: string; secure: boolean; httpOnly: boolean; sameSite: string; issues: string[] }>;
  infoDisclosure: Array<{ header: string; value: string; risk: string; desc: string }>;
  cors: { misconfigured: boolean; details: string; origin: string | null };
  technologies: Array<{ name: string; category: string; evidence: string }>;
  timestamp: string;
};

export default function ReportPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const [result, setResult] = useState<DeepScanResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(`/api/report/${token}`)
      .then(r => r.json())
      .then(data => {
        if (data.error) setError(data.error);
        else setResult(data.result);
      })
      .catch(() => setError('Failed to load report'))
      .finally(() => setLoading(false));
  }, [token]);

  const gradeColor = (g: string) => {
    if (g === 'A') return 'text-green-500';
    if (g === 'B') return 'text-blue-500';
    if (g === 'C') return 'text-yellow-500';
    if (g === 'D') return 'text-orange-500';
    return 'text-red-500';
  };

  const riskBadge = (risk: string) => {
    if (risk === 'Critical') return 'bg-red-500/20 text-red-400';
    if (risk === 'High') return 'bg-orange-500/20 text-orange-400';
    if (risk === 'Medium') return 'bg-yellow-500/20 text-yellow-400';
    return 'bg-blue-500/20 text-blue-400';
  };

  if (loading) return (
    <div className="min-h-screen bg-[#030712] flex items-center justify-center text-white">
      <div className="text-center"><ShieldAlert className="w-10 h-10 text-red-500 mx-auto mb-4 animate-pulse" /><p>Loading Report...</p></div>
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
      <header className="border-b border-white/5 py-4 px-6">
        <div className="max-w-5xl mx-auto flex items-center gap-3">
          <ShieldAlert className="w-6 h-6 text-red-500" />
          <span className="font-bold text-lg">Athan<span className="text-red-500">DeepScan</span> — Full Report</span>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-10 space-y-6">
        {/* Grade */}
        <div className="bg-white/5 rounded-2xl p-8 border border-white/10 text-center">
          <div className={`text-7xl font-black ${gradeColor(result.grade)}`}>{result.grade}</div>
          <p className="text-slate-400 mt-2">Security Score: {result.score}/100</p>
          <p className="text-sm text-slate-500">{result.url} — {new Date(result.timestamp).toLocaleDateString()}</p>
        </div>

        {/* Headers */}
        <div className="bg-white/5 rounded-2xl p-6 border border-white/10">
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2"><Server className="w-5 h-5 text-blue-500" /> Security Headers</h3>
          {result.headers.map((h, i) => (
            <div key={i} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
              <code className="text-sm">{h.name}</code>
              {h.present ? <CheckCircle2 className="w-5 h-5 text-green-500" /> : <XCircle className="w-5 h-5 text-red-500" />}
            </div>
          ))}
        </div>

        {/* Exposed Files */}
        {result.exposedFiles.filter(f => f.accessible).length > 0 && (
          <div className="bg-white/5 rounded-2xl p-6 border border-red-500/20">
            <h3 className="text-lg font-bold mb-4 text-red-500 flex items-center gap-2"><FolderOpen className="w-5 h-5" /> Exposed Files</h3>
            {result.exposedFiles.filter(f => f.accessible).map((f, i) => (
              <div key={i} className="flex items-start gap-3 p-3 bg-red-500/5 rounded-lg mb-2">
                <span className={`text-xs px-2 py-0.5 rounded ${riskBadge(f.risk)}`}>{f.risk}</span>
                <div><code className="text-sm font-bold">{f.path}</code><p className="text-xs text-slate-500 mt-1">{f.desc}</p></div>
              </div>
            ))}
          </div>
        )}

        {/* Admin Panels */}
        {result.adminPanels.filter(p => p.accessible).length > 0 && (
          <div className="bg-white/5 rounded-2xl p-6 border border-orange-500/20">
            <h3 className="text-lg font-bold mb-4 text-orange-500 flex items-center gap-2"><Eye className="w-5 h-5" /> Admin Panels</h3>
            {result.adminPanels.filter(p => p.accessible).map((p, i) => (
              <div key={i} className="p-3 bg-orange-500/5 rounded-lg mb-2 flex justify-between">
                <code className="text-sm">{p.path} ({p.name})</code>
                <span className="text-xs text-orange-400 font-bold">ACCESSIBLE</span>
              </div>
            ))}
          </div>
        )}

        {/* Cookies */}
        {result.cookies.length > 0 && (
          <div className="bg-white/5 rounded-2xl p-6 border border-white/10">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2"><Cookie className="w-5 h-5 text-yellow-500" /> Cookie Security</h3>
            {result.cookies.map((c, i) => (
              <div key={i} className="p-3 bg-white/5 rounded-lg mb-2">
                <code className="text-sm font-bold">{c.name}</code>
                <div className="flex gap-2 mt-2">
                  <span className={`text-xs px-2 py-0.5 rounded ${c.secure ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>{c.secure ? '✓ Secure' : '✗ No Secure'}</span>
                  <span className={`text-xs px-2 py-0.5 rounded ${c.httpOnly ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>{c.httpOnly ? '✓ HttpOnly' : '✗ No HttpOnly'}</span>
                  <span className="text-xs px-2 py-0.5 rounded bg-white/10">SameSite: {c.sameSite}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Info Disclosure */}
        {result.infoDisclosure.length > 0 && (
          <div className="bg-white/5 rounded-2xl p-6 border border-white/10">
            <h3 className="text-lg font-bold mb-4"><Server className="w-5 h-5 inline text-yellow-500 mr-2" />Information Disclosure</h3>
            {result.infoDisclosure.map((d, i) => (
              <div key={i} className="p-3 bg-yellow-500/5 rounded-lg mb-2">
                <code className="text-sm">{d.header}: {d.value}</code>
                <p className="text-xs text-slate-500 mt-1">{d.desc}</p>
              </div>
            ))}
          </div>
        )}

        {/* Technologies */}
        {result.technologies.length > 0 && (
          <div className="bg-white/5 rounded-2xl p-6 border border-white/10">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2"><Fingerprint className="w-5 h-5 text-purple-500" /> Technologies</h3>
            <div className="flex flex-wrap gap-2">
              {result.technologies.map((t, i) => (
                <span key={i} className="px-3 py-1.5 bg-purple-500/10 text-purple-300 rounded-lg text-sm border border-purple-500/20">
                  {t.name} <span className="opacity-60 text-xs">({t.category})</span>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Trackers */}
        {result.trackers.found > 0 && (
          <div className="bg-white/5 rounded-2xl p-6 border border-white/10">
            <h3 className="text-lg font-bold mb-4">Pre-Consent Trackers ({result.trackers.found})</h3>
            {result.trackers.list.map((t, i) => (
              <div key={i} className="flex justify-between py-2 border-b border-white/5">
                <span className="text-sm">{t.name}</span>
                <span className="text-xs px-2 py-0.5 rounded bg-white/10">{t.type}</span>
              </div>
            ))}
          </div>
        )}
      </main>

      <footer className="text-center py-6 text-xs text-slate-500 border-t border-white/5">
        CREATED BY ATHANASIOS (SAKIS) ATHANASOPOULOS — Athan Security
      </footer>
    </div>
  );
}
