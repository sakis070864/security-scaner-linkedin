'use client';

import { useState, useEffect } from 'react';
import { ArrowRight, ShieldAlert, ShieldCheck, CheckCircle2, XCircle, AlertTriangle, Info, Sun, Moon, Laptop, Lock, Mail, Globe } from 'lucide-react';

type CheckResult = { name: string; status: 'pass' | 'fail' | 'warn' | 'info'; detail: string; risk: string };

type DeepScanResult = {
  url: string; grade: string; score: number;
  totalChecks: number; passed: number; failed: number; warnings: number;
  headers: CheckResult[];
  exposedFiles: CheckResult[];
  adminPanels: CheckResult[];
  cookies: CheckResult[];
  cors: CheckResult[];
  infoDisclosure: CheckResult[];
  httpMethods: CheckResult[];
  technologies: Array<{ name: string; category: string }>;
  trackers: { found: number; list: Array<{ name: string; type: string }> };
  gpc: { supported: boolean; details: string };
  htmlAnalysis: CheckResult[];
  timestamp: string;
};

type Theme = 'dark' | 'light' | 'system';

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
    <div className="bg-white dark:bg-white/5 rounded-2xl border border-slate-200 dark:border-white/10 overflow-hidden">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between p-5 text-left hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors">
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
        <div className="border-t border-slate-100 dark:border-white/5 divide-y divide-slate-100 dark:divide-white/5">
          {checks.map((c, i) => (
            <div key={i} className={`flex items-start gap-3 px-5 py-3 ${c.status === 'fail' ? 'bg-red-50/50 dark:bg-red-500/5' : c.status === 'warn' ? 'bg-yellow-50/30 dark:bg-yellow-500/5' : ''}`}>
              <StatusIcon status={c.status} />
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium truncate">{c.name}</div>
                <div className="text-xs text-slate-500 mt-0.5">{c.detail}</div>
              </div>
              {c.risk !== 'None' && <span className={`text-[10px] px-1.5 py-0.5 rounded shrink-0 ${c.risk === 'Critical' ? 'bg-red-500/20 text-red-400' : c.risk === 'High' ? 'bg-orange-500/20 text-orange-400' : c.risk === 'Medium' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-blue-500/20 text-blue-400'}`}>{c.risk}</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Home() {
  const [url, setUrl] = useState('');
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<DeepScanResult | null>(null);
  const [emailType, setEmailType] = useState<'corporate' | 'free' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [theme, setTheme] = useState<Theme>('dark');
  const [mounted, setMounted] = useState(false);
  const [scanPhase, setScanPhase] = useState('');

  useEffect(() => { setMounted(true); const s = localStorage.getItem('scanner-theme') as Theme | null; if (s) setTheme(s); }, []);
  useEffect(() => {
    if (!mounted) return;
    const root = document.documentElement; root.classList.remove('light', 'dark');
    root.classList.add(theme === 'system' ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light') : theme);
    localStorage.setItem('scanner-theme', theme);
  }, [theme, mounted]);

  const handleScan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url || !email) return;
    setIsLoading(true); setError(null); setResult(null);
    const phases = ['Resolving DNS...', 'Checking 15 security headers...', 'Probing 67 sensitive files...', 'Scanning 20 admin panels...', 'Testing 5 HTTP methods...', 'Analyzing cookies & CORS...', 'Fingerprinting 30 technologies...', 'Scanning 20 trackers...', 'Analyzing HTML content...', 'Checking GPC compliance...', 'Calculating risk score...'];
    let i = 0;
    const interval = setInterval(() => { setScanPhase(phases[i % phases.length]); i++; }, 2500);
    try {
      const res = await fetch('/api/scan', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url, email }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setResult(data.result); setEmailType(data.emailType);
    } catch (err: any) { setError(err.message); }
    finally { clearInterval(interval); setIsLoading(false); setScanPhase(''); }
  };

  const gc = (g: string) => g === 'A' ? 'text-green-500' : g === 'B' ? 'text-blue-500' : g === 'C' ? 'text-yellow-500' : g === 'D' ? 'text-orange-500' : 'text-red-500';

  if (!mounted) return null;
  const isBlurred = result && (emailType === 'free' || emailType === 'corporate');

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-100 dark:from-[#030712] dark:via-[#0a0f1a] dark:to-[#030712] text-slate-900 dark:text-white transition-colors">
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-white/70 dark:bg-[#030712]/80 border-b border-slate-200 dark:border-white/5">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3"><ShieldAlert className="w-6 h-6 text-red-500" /><span className="font-bold text-lg">Athan<span className="text-red-500">DeepScan</span></span></div>
          <div className="flex items-center gap-1">
            {([['light', <Sun key="s" className="w-4 h-4" />], ['system', <Laptop key="l" className="w-4 h-4" />], ['dark', <Moon key="m" className="w-4 h-4" />]] as [Theme, React.ReactNode][]).map(([t, icon]) => (
              <button key={t} onClick={() => setTheme(t)} className={`p-2 rounded-lg transition-colors ${theme === t ? 'bg-slate-200 dark:bg-white/10' : 'hover:bg-slate-100 dark:hover:bg-white/5'}`}>{icon}</button>
            ))}
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-12">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 px-4 py-1.5 rounded-full text-xs font-semibold mb-6 border border-red-200 dark:border-red-500/20">
            <ShieldAlert className="w-3.5 h-3.5" /> 150+ Deep Security Checks
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight mb-4">Find Hidden <span className="text-red-500">Vulnerabilities</span></h1>
          <p className="text-base text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">We probe 67 sensitive files, 20 admin panels, 15 security headers, 5 HTTP methods, cookies, CORS, trackers, and more.</p>
        </div>

        <form onSubmit={handleScan} className="max-w-2xl mx-auto mb-12">
          <div className="bg-white dark:bg-white/5 rounded-2xl p-6 border border-slate-200 dark:border-white/10 shadow-lg space-y-4">
            <div className="flex items-center gap-3 bg-slate-50 dark:bg-white/5 rounded-xl px-4 py-3 border border-slate-200 dark:border-white/10">
              <Globe className="w-5 h-5 text-slate-400 shrink-0" />
              <input type="text" value={url} onChange={e => setUrl(e.target.value)} placeholder="yourwebsite.com" className="flex-1 bg-transparent outline-none text-base placeholder:text-slate-400" />
            </div>
            <div className="flex items-center gap-3 bg-slate-50 dark:bg-white/5 rounded-xl px-4 py-3 border border-slate-200 dark:border-white/10">
              <Mail className="w-5 h-5 text-slate-400 shrink-0" />
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@company.com" className="flex-1 bg-transparent outline-none text-base placeholder:text-slate-400" />
            </div>
            <button type="submit" disabled={isLoading || !url || !email} className="w-full flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white font-semibold py-3.5 rounded-xl transition-all disabled:opacity-50">
              {isLoading ? <><span className="animate-spin">⟳</span> {scanPhase}</> : <><ShieldAlert className="w-5 h-5" /> Run Deep Scan <ArrowRight className="w-4 h-4" /></>}
            </button>
          </div>
        </form>

        {error && <div className="max-w-2xl mx-auto mb-8 p-4 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded-xl text-red-700 dark:text-red-400 text-center">{error}</div>}

        {result && (
          <div className="space-y-4">
            {/* Grade + Stats */}
            <div className="bg-white dark:bg-white/5 rounded-2xl p-8 border border-slate-200 dark:border-white/10 text-center">
              <div className={`text-7xl font-black ${gc(result.grade)}`}>{result.grade}</div>
              <div className="text-slate-500 mt-2">Score: {result.score}/100 — {result.totalChecks} checks performed</div>
              <div className="flex justify-center gap-6 mt-4 text-sm">
                <span className="text-green-500">✓ {result.passed} Passed</span>
                <span className="text-red-500">✗ {result.failed} Failed</span>
                <span className="text-yellow-500">⚠ {result.warnings} Warnings</span>
              </div>
            </div>

            {/* Gate Messages */}
            {emailType === 'free' && (
              <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 rounded-2xl p-6 text-center">
                <Lock className="w-10 h-10 text-amber-500 mx-auto mb-3" />
                <h3 className="text-lg font-bold mb-2">Unauthorized Email</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">Your email domain doesn't match the website you scanned. Use your <strong>company email</strong> (e.g. <em>you@{(() => { try { let u = url.trim(); if (!u.startsWith('http')) u = 'https://' + u; return new URL(u).hostname.replace(/^www\./, ''); } catch { return 'scanned-site.com'; } })()}</em>) to receive the full report.</p>
                <p className="text-sm text-slate-500">Need a report without a company email? Contact <strong className="text-red-500">sakis@sakis-athan.com</strong> — full report within 2 hours.</p>
              </div>
            )}
            {emailType === 'corporate' && (
              <div className="bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/30 rounded-2xl p-6 text-center">
                <Mail className="w-10 h-10 text-blue-500 mx-auto mb-3" />
                <h3 className="text-lg font-bold mb-2">Check Your Email</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">We sent a link to <strong>{email}</strong>. Click it to view the full report.</p>
              </div>
            )}

            {/* Always visible: Headers */}
            <CheckSection title="Security Headers" icon="🛡️" checks={result.headers} defaultOpen={true} />

            {/* Blurred sections */}
            <div className={isBlurred ? 'relative' : ''}>
              {isBlurred && (
                <div className="absolute inset-0 z-10 backdrop-blur-md bg-white/20 dark:bg-black/20 rounded-2xl flex items-center justify-center">
                  <div className="text-center p-8"><Lock className="w-12 h-12 text-red-500 mx-auto mb-4" /><p className="font-bold text-lg">Full Report Locked</p></div>
                </div>
              )}
              <div className="space-y-4">
                <CheckSection title="Exposed Files & Paths" icon="📁" checks={result.exposedFiles} />
                <CheckSection title="Admin Panels" icon="🔓" checks={result.adminPanels} />
                <CheckSection title="Cookie Security" icon="🍪" checks={result.cookies} />
                <CheckSection title="CORS Policy" icon="🌐" checks={result.cors} />
                <CheckSection title="Information Disclosure" icon="💬" checks={result.infoDisclosure} />
                <CheckSection title="HTTP Methods" icon="📡" checks={result.httpMethods} />
                <CheckSection title="HTML Content Analysis" icon="📄" checks={result.htmlAnalysis} />
                {result.technologies.length > 0 && (
                  <div className="bg-white dark:bg-white/5 rounded-2xl p-5 border border-slate-200 dark:border-white/10">
                    <div className="flex items-center gap-3 mb-4"><span className="text-xl">🔍</span><span className="font-bold">Detected Technologies</span></div>
                    <div className="flex flex-wrap gap-2">{result.technologies.map((t, i) => <span key={i} className="px-3 py-1.5 bg-purple-50 dark:bg-purple-500/10 text-purple-700 dark:text-purple-300 rounded-lg text-sm border border-purple-200 dark:border-purple-500/20">{t.name} <span className="text-xs opacity-60">({t.category})</span></span>)}</div>
                  </div>
                )}
                {result.trackers.found > 0 && (
                  <div className="bg-white dark:bg-white/5 rounded-2xl p-5 border border-slate-200 dark:border-white/10">
                    <div className="flex items-center gap-3 mb-4"><span className="text-xl">👁️</span><span className="font-bold">Pre-Consent Trackers ({result.trackers.found})</span></div>
                    <div className="space-y-2">{result.trackers.list.map((t, i) => <div key={i} className="flex justify-between py-2 border-b border-slate-100 dark:border-white/5"><span className="text-sm">{t.name}</span><span className="text-xs px-2 py-0.5 rounded bg-slate-100 dark:bg-white/10">{t.type}</span></div>)}</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
      <footer className="text-center py-6 text-xs text-slate-400 border-t border-slate-200 dark:border-white/5">CREATED BY ATHANASIOS (SAKIS) ATHANASOPOULOS</footer>
    </div>
  );
}
