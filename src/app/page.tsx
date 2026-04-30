'use client';

import { useState, useEffect } from 'react';
import { ArrowRight, ShieldCheck, AlertTriangle, ShieldAlert, CheckCircle2, XCircle, Sun, Moon, Laptop, Download, Lock, Mail, Globe, Server, Cookie, Fingerprint, FolderOpen, Eye } from 'lucide-react';

type DeepScanResult = {
  url: string;
  grade: string;
  score: number;
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

type Theme = 'dark' | 'light' | 'system';

export default function Home() {
  const [url, setUrl] = useState('');
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<DeepScanResult | null>(null);
  const [emailType, setEmailType] = useState<'corporate' | 'free' | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [theme, setTheme] = useState<Theme>('dark');
  const [mounted, setMounted] = useState(false);
  const [scanPhase, setScanPhase] = useState('');

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem('scanner-theme') as Theme | null;
    if (saved) setTheme(saved);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const root = document.documentElement;
    root.classList.remove('light', 'dark');
    if (theme === 'system') {
      root.classList.add(window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    } else {
      root.classList.add(theme);
    }
    localStorage.setItem('scanner-theme', theme);
  }, [theme, mounted]);

  const handleScan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url || !email) return;
    setIsLoading(true);
    setError(null);
    setResult(null);

    const phases = [
      'Resolving DNS...', 'Checking security headers...', 'Probing exposed files...',
      'Scanning admin panels...', 'Analyzing cookies & CORS...', 'Fingerprinting technologies...',
      'Checking GPC compliance...', 'Detecting trackers...', 'Calculating risk score...'
    ];
    let i = 0;
    const interval = setInterval(() => {
      setScanPhase(phases[i % phases.length]);
      i++;
    }, 2000);

    try {
      const res = await fetch('/api/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Scan failed');
      setResult(data.result);
      setEmailType(data.emailType);
      setToken(data.token);
    } catch (err: any) {
      setError(err.message);
    } finally {
      clearInterval(interval);
      setIsLoading(false);
      setScanPhase('');
    }
  };

  const gradeColor = (g: string) => {
    if (g === 'A') return 'text-green-500';
    if (g === 'B') return 'text-blue-500';
    if (g === 'C') return 'text-yellow-500';
    if (g === 'D') return 'text-orange-500';
    return 'text-red-500';
  };

  const riskBadge = (risk: string) => {
    if (risk === 'Critical') return 'bg-red-500/20 text-red-400 border-red-500/30';
    if (risk === 'High') return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
    if (risk === 'Medium') return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
    return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
  };

  if (!mounted) return null;

  const isBlurred = result && (emailType === 'free' || emailType === 'corporate');

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-100 dark:from-[#030712] dark:via-[#0a0f1a] dark:to-[#030712] text-slate-900 dark:text-white transition-colors">
      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-white/70 dark:bg-[#030712]/80 border-b border-slate-200 dark:border-white/5">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ShieldAlert className="w-6 h-6 text-red-500" />
            <span className="font-bold text-lg">Athan<span className="text-red-500">DeepScan</span></span>
          </div>
          <div className="flex items-center gap-2">
            {[
              { t: 'light' as Theme, icon: <Sun className="w-4 h-4" /> },
              { t: 'system' as Theme, icon: <Laptop className="w-4 h-4" /> },
              { t: 'dark' as Theme, icon: <Moon className="w-4 h-4" /> },
            ].map(({ t, icon }) => (
              <button key={t} onClick={() => setTheme(t)}
                className={`p-2 rounded-lg transition-colors ${theme === t ? 'bg-slate-200 dark:bg-white/10' : 'hover:bg-slate-100 dark:hover:bg-white/5'}`}>
                {icon}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-12">
        {/* Hero */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 px-4 py-1.5 rounded-full text-xs font-semibold mb-6 border border-red-200 dark:border-red-500/20">
            <ShieldAlert className="w-3.5 h-3.5" /> Deep Penetration Security Scanner
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight mb-4">
            Find Hidden <span className="text-red-500">Vulnerabilities</span>
          </h1>
          <p className="text-base text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
            We probe for exposed files, open admin panels, cookie flaws, CORS misconfigurations, and 60+ security checks that basic scanners miss.
          </p>
        </div>

        {/* Scan Form */}
        <form onSubmit={handleScan} className="max-w-2xl mx-auto mb-12">
          <div className="bg-white dark:bg-white/5 rounded-2xl p-6 border border-slate-200 dark:border-white/10 shadow-lg space-y-4">
            <div className="flex items-center gap-3 bg-slate-50 dark:bg-white/5 rounded-xl px-4 py-3 border border-slate-200 dark:border-white/10">
              <Globe className="w-5 h-5 text-slate-400 shrink-0" />
              <input type="text" value={url} onChange={e => setUrl(e.target.value)}
                placeholder="yourwebsite.com" className="flex-1 bg-transparent outline-none text-base placeholder:text-slate-400" />
            </div>
            <div className="flex items-center gap-3 bg-slate-50 dark:bg-white/5 rounded-xl px-4 py-3 border border-slate-200 dark:border-white/10">
              <Mail className="w-5 h-5 text-slate-400 shrink-0" />
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="you@company.com" className="flex-1 bg-transparent outline-none text-base placeholder:text-slate-400" />
            </div>
            <button type="submit" disabled={isLoading || !url || !email}
              className="w-full flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white font-semibold py-3.5 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed">
              {isLoading ? scanPhase || 'Scanning...' : <><ShieldAlert className="w-5 h-5" /> Run Deep Scan <ArrowRight className="w-4 h-4" /></>}
            </button>
          </div>
        </form>

        {error && (
          <div className="max-w-2xl mx-auto mb-8 p-4 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded-xl text-red-700 dark:text-red-400 text-center">
            {error}
          </div>
        )}

        {/* Results */}
        {result && (
          <div className="space-y-6">
            {/* Grade Card */}
            <div className="bg-white dark:bg-white/5 rounded-2xl p-8 border border-slate-200 dark:border-white/10 text-center">
              <div className={`text-7xl font-black ${gradeColor(result.grade)}`}>{result.grade}</div>
              <div className="text-slate-500 mt-2">Security Score: {result.score}/100</div>
              <div className="text-sm text-slate-400 mt-1">{result.url}</div>
            </div>

            {/* BLUR GATE MESSAGE */}
            {emailType === 'free' && (
              <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 rounded-2xl p-6 text-center">
                <Lock className="w-10 h-10 text-amber-500 mx-auto mb-3" />
                <h3 className="text-lg font-bold mb-2">Corporate Email Required</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                  Full results require a corporate email address. The preview below shows a sample of findings.
                </p>
                <div className="bg-white dark:bg-white/5 rounded-xl p-4 border border-slate-200 dark:border-white/10">
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Don&apos;t have a corporate email? Contact <strong className="text-red-500">sakis@sakis-athan.com</strong> — we&apos;ll verify your identity and send the full report within 2 hours.
                  </p>
                </div>
              </div>
            )}

            {emailType === 'corporate' && (
              <div className="bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/30 rounded-2xl p-6 text-center">
                <Mail className="w-10 h-10 text-blue-500 mx-auto mb-3" />
                <h3 className="text-lg font-bold mb-2">Check Your Email</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  We&apos;ve sent a verification link to <strong>{email}</strong>. Click the link in your inbox to unlock the full report. Preview shown below.
                </p>
              </div>
            )}

            {/* Security Headers - always visible */}
            <div className="bg-white dark:bg-white/5 rounded-2xl p-6 border border-slate-200 dark:border-white/10">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2"><Server className="w-5 h-5 text-blue-500" /> Security Headers</h3>
              <div className="space-y-2">
                {result.headers.map((h, i) => (
                  <div key={i} className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-white/5 last:border-0">
                    <code className="text-sm">{h.name}</code>
                    {h.present ? <CheckCircle2 className="w-5 h-5 text-green-500" /> : <XCircle className="w-5 h-5 text-red-500" />}
                  </div>
                ))}
              </div>
            </div>

            {/* Blurred Sections */}
            <div className={isBlurred ? 'relative' : ''}>
              {isBlurred && (
                <div className="absolute inset-0 z-10 backdrop-blur-md bg-white/30 dark:bg-black/30 rounded-2xl flex items-center justify-center">
                  <div className="text-center p-8">
                    <Lock className="w-12 h-12 text-red-500 mx-auto mb-4" />
                    <p className="font-bold text-lg mb-2">Full Report Locked</p>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      {emailType === 'free' ? 'Corporate email required. Contact sakis@sakis-athan.com' : 'Click the verification link in your email to unlock.'}
                    </p>
                  </div>
                </div>
              )}

              <div className="space-y-6">
                {/* Exposed Files */}
                {result.exposedFiles.filter(f => f.accessible).length > 0 && (
                  <div className="bg-white dark:bg-white/5 rounded-2xl p-6 border border-red-200 dark:border-red-500/20">
                    <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-red-500"><FolderOpen className="w-5 h-5" /> Exposed Files Found</h3>
                    <div className="space-y-3">
                      {result.exposedFiles.filter(f => f.accessible).map((f, i) => (
                        <div key={i} className="flex items-start gap-3 p-3 bg-red-50 dark:bg-red-500/5 rounded-lg">
                          <span className={`text-xs px-2 py-0.5 rounded border ${riskBadge(f.risk)}`}>{f.risk}</span>
                          <div>
                            <code className="text-sm font-bold">{f.path}</code>
                            <p className="text-xs text-slate-500 mt-1">{f.desc}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Admin Panels */}
                {result.adminPanels.filter(p => p.accessible).length > 0 && (
                  <div className="bg-white dark:bg-white/5 rounded-2xl p-6 border border-orange-200 dark:border-orange-500/20">
                    <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-orange-500"><Eye className="w-5 h-5" /> Exposed Admin Panels</h3>
                    <div className="space-y-2">
                      {result.adminPanels.filter(p => p.accessible).map((p, i) => (
                        <div key={i} className="flex items-center justify-between p-3 bg-orange-50 dark:bg-orange-500/5 rounded-lg">
                          <div>
                            <code className="text-sm font-bold">{p.path}</code>
                            <span className="text-xs text-slate-500 ml-2">({p.name})</span>
                          </div>
                          <span className="text-xs text-orange-500 font-semibold">ACCESSIBLE</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Cookie Security */}
                {result.cookies.length > 0 && (
                  <div className="bg-white dark:bg-white/5 rounded-2xl p-6 border border-slate-200 dark:border-white/10">
                    <h3 className="text-lg font-bold mb-4 flex items-center gap-2"><Cookie className="w-5 h-5 text-yellow-500" /> Cookie Security</h3>
                    <div className="space-y-3">
                      {result.cookies.map((c, i) => (
                        <div key={i} className="p-3 bg-slate-50 dark:bg-white/5 rounded-lg">
                          <code className="text-sm font-bold">{c.name}</code>
                          <div className="flex gap-2 mt-2">
                            <span className={`text-xs px-2 py-0.5 rounded ${c.secure ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                              {c.secure ? '✓ Secure' : '✗ No Secure'}
                            </span>
                            <span className={`text-xs px-2 py-0.5 rounded ${c.httpOnly ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                              {c.httpOnly ? '✓ HttpOnly' : '✗ No HttpOnly'}
                            </span>
                            <span className="text-xs px-2 py-0.5 rounded bg-slate-200 dark:bg-white/10">SameSite: {c.sameSite}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Info Disclosure */}
                {result.infoDisclosure.length > 0 && (
                  <div className="bg-white dark:bg-white/5 rounded-2xl p-6 border border-slate-200 dark:border-white/10">
                    <h3 className="text-lg font-bold mb-4 flex items-center gap-2"><Server className="w-5 h-5 text-yellow-500" /> Information Disclosure</h3>
                    {result.infoDisclosure.map((d, i) => (
                      <div key={i} className="flex items-start gap-3 p-3 bg-yellow-50 dark:bg-yellow-500/5 rounded-lg mb-2">
                        <span className={`text-xs px-2 py-0.5 rounded border ${riskBadge(d.risk)}`}>{d.risk}</span>
                        <div>
                          <code className="text-sm">{d.header}: {d.value}</code>
                          <p className="text-xs text-slate-500 mt-1">{d.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* CORS */}
                {result.cors.misconfigured && (
                  <div className="bg-white dark:bg-white/5 rounded-2xl p-6 border border-red-200 dark:border-red-500/20">
                    <h3 className="text-lg font-bold mb-2 text-red-500">CORS Misconfiguration Detected</h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400">{result.cors.details}</p>
                  </div>
                )}

                {/* Technologies */}
                {result.technologies.length > 0 && (
                  <div className="bg-white dark:bg-white/5 rounded-2xl p-6 border border-slate-200 dark:border-white/10">
                    <h3 className="text-lg font-bold mb-4 flex items-center gap-2"><Fingerprint className="w-5 h-5 text-purple-500" /> Detected Technologies</h3>
                    <div className="flex flex-wrap gap-2">
                      {result.technologies.map((t, i) => (
                        <span key={i} className="px-3 py-1.5 bg-purple-50 dark:bg-purple-500/10 text-purple-700 dark:text-purple-300 rounded-lg text-sm border border-purple-200 dark:border-purple-500/20">
                          {t.name} <span className="text-xs opacity-60">({t.category})</span>
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Trackers */}
                {result.trackers.found > 0 && (
                  <div className="bg-white dark:bg-white/5 rounded-2xl p-6 border border-slate-200 dark:border-white/10">
                    <h3 className="text-lg font-bold mb-4">Pre-Consent Trackers ({result.trackers.found})</h3>
                    <div className="space-y-2">
                      {result.trackers.list.map((t, i) => (
                        <div key={i} className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-white/5">
                          <span className="text-sm font-medium">{t.name}</span>
                          <span className="text-xs px-2 py-0.5 rounded bg-slate-100 dark:bg-white/10">{t.type}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      <footer className="text-center py-6 text-xs text-slate-400 border-t border-slate-200 dark:border-white/5">
        CREATED BY ATHANASIOS (SAKIS) ATHANASOPOULOS
      </footer>
    </div>
  );
}
