'use client';

import { useState, useEffect } from 'react';
import { ArrowRight, ArrowLeft, ShieldCheck, AlertTriangle, ShieldAlert, CheckCircle2, XCircle, Sun, Moon, Laptop, Calendar } from 'lucide-react';

type ScanResult = {
  url: string;
  grade: string;
  score: number;
  headers: Array<{
    name: string;
    present: boolean;
    value: string;
  }>;
  gpc: {
    supported: boolean;
    wellKnownFound: boolean;
    details: string;
  };
  trackers: {
    found: number;
    list: Array<{ name: string; domain: string; type: string }>;
  };
  timestamp: string;
};

type Theme = 'dark' | 'light' | 'system';

export default function Home() {
  const [url, setUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [theme, setTheme] = useState<Theme>('system');
  const [mounted, setMounted] = useState(false);
  const [scanPhase, setScanPhase] = useState('');

  // Bot Protection State
  const [showBotChallenge, setShowBotChallenge] = useState(false);
  const [botNum1, setBotNum1] = useState(0);
  const [botNum2, setBotNum2] = useState(0);
  const [botOp, setBotOp] = useState('+');
  const [botAnswer, setBotAnswer] = useState('');
  const [botError, setBotError] = useState(false);

  // Initialize theme
  useEffect(() => {
    setMounted(true);
    const savedTheme = localStorage.getItem('scanner-theme') as Theme | null;
    if (savedTheme) {
      setTheme(savedTheme);
    }
  }, []);

  // Apply theme to document
  useEffect(() => {
    if (!mounted) return;
    
    const root = document.documentElement;
    root.classList.remove('light', 'dark');

    if (theme === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      root.classList.add(systemTheme);
    } else {
      root.classList.add(theme);
    }

    localStorage.setItem('scanner-theme', theme);
  }, [theme, mounted]);

  const triggerBotChallenge = (e: React.MouseEvent) => {
    e.preventDefault();
    setBotNum1(Math.floor(Math.random() * 10) + 1);
    setBotNum2(Math.floor(Math.random() * 10) + 1);
    setBotOp(Math.random() > 0.5 ? '+' : '×');
    setBotAnswer('');
    setBotError(false);
    setShowBotChallenge(true);
  };

  const verifyBotChallenge = (e: React.FormEvent) => {
    e.preventDefault();
    const answer = parseInt(botAnswer.trim(), 10);
    const expected = botOp === '+' ? botNum1 + botNum2 : botNum1 * botNum2;
    
    if (answer === expected) {
      window.open('https://sakis-athan.com', '_blank');
      setShowBotChallenge(false);
    } else {
      setBotError(true);
      setBotAnswer('');
    }
  };

  const handleScan = async (e: React.FormEvent) => {
    e.preventDefault();
    let targetUrl = url.trim();
    if (!targetUrl) return;

    setIsLoading(true);
    setError(null);
    setResult(null);
    setScanPhase('Checking security headers...');

    // Animate through phases while the request runs
    const phaseTimer1 = setTimeout(() => setScanPhase('Verifying Global Privacy Control (GPC)...'), 1500);
    const phaseTimer2 = setTimeout(() => setScanPhase('Scanning for pre-consent trackers...'), 3000);
    const phaseTimer3 = setTimeout(() => setScanPhase('Generating compliance report...'), 4500);

    try {
      const res = await fetch('/api/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: targetUrl })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to scan website');
      }

      setResult(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      clearTimeout(phaseTimer1);
      clearTimeout(phaseTimer2);
      clearTimeout(phaseTimer3);
      setScanPhase('');
      setIsLoading(false);
    }
  };

  const getGradeColor = (grade: string) => {
    switch (grade) {
      case 'A': return 'text-green-600 dark:text-green-500 border-green-500/50 bg-green-500/10';           // 91-100% GREEN
      case 'B': return 'text-emerald-500 dark:text-emerald-400 border-emerald-400/50 bg-emerald-400/10';   // 61-90% Light Green
      case 'C': return 'text-yellow-500 dark:text-yellow-400 border-yellow-400/50 bg-yellow-400/10';       // 41-60% Gold
      case 'D': return 'text-pink-500 dark:text-pink-400 border-pink-400/50 bg-pink-400/10';               // 21-40% Pink
      default: return 'text-red-600 dark:text-red-500 border-red-500/50 bg-red-500/10';                    // 0-20% Red
    }
  };

  const getPostureLabel = (grade: string) => {
    switch (grade) {
      case 'A': return 'Excellent';
      case 'B': return 'Good';
      case 'C': return 'Moderate Risk';
      case 'D': return 'High Risk';
      default: return 'Critical Risk';
    }
  };

  const getBarColor = (grade: string) => {
    switch (grade) {
      case 'A': return 'bg-green-500';      // GREEN
      case 'B': return 'bg-emerald-400';    // Light Green
      case 'C': return 'bg-yellow-400';     // Gold
      case 'D': return 'bg-pink-400';       // Pink
      default: return 'bg-red-500';         // Red
    }
  };

  const getRiskExplanation = (headerName: string) => {
    const explanations: Record<string, string> = {
      'strict-transport-security': 'Failure to enforce HTTPS. Data (including client intake forms) can be intercepted in plain text over unsecured networks.',
      'x-frame-options': 'Vulnerable to Clickjacking. Hackers can embed your site in a malicious iframe to trick users into clicking links or submitting forms.',
      'x-content-type-options': 'Vulnerable to MIME-sniffing. Attackers can upload malicious scripts disguised as images or documents.',
      'content-security-policy': 'Lacks modern XSS protection. Malicious scripts could be injected into your site to steal client data.',
      'referrer-policy': 'Leaks sensitive URL data to third-party sites when users click external links.',
      'permissions-policy': 'Allows unauthorized access to sensitive browser features (camera, microphone, geolocation) by default.'
    };
    return explanations[headerName] || 'Missing critical security control.';
  };

  if (!mounted) return null; // Prevent hydration mismatch

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0a0a0a] text-slate-900 dark:text-white selection:bg-blue-500/30 font-sans transition-colors duration-300">
      
      {/* Navigation */}
      <nav className="w-full border-b border-slate-200 dark:border-white/5 bg-white/80 dark:bg-black/50 backdrop-blur-md fixed top-0 z-50 transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4 sm:gap-6">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-6 h-6 text-blue-600 dark:text-blue-500" />
              <span className="font-bold tracking-tight text-lg sm:text-xl">Athan<span className="text-blue-600 dark:text-blue-500">Security</span></span>
            </div>
            
            <div className="w-px h-5 bg-slate-300 dark:bg-white/10"></div>
            
            <a 
              href="https://sakis-athan.com" 
              className="flex items-center gap-1.5 text-xs sm:text-sm font-medium text-slate-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">Back to Website</span>
              <span className="sm:hidden">Back</span>
            </a>
          </div>
          <div className="flex items-center gap-4">
            
            {/* Theme Toggle */}
            <div className="flex items-center bg-slate-100 dark:bg-white/5 rounded-full p-1 border border-slate-200 dark:border-white/10">
              <button 
                onClick={() => setTheme('light')}
                className={`p-1.5 rounded-full transition-colors ${theme === 'light' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                aria-label="Light mode"
              >
                <Sun className="w-4 h-4" />
              </button>
              <button 
                onClick={() => setTheme('system')}
                className={`p-1.5 rounded-full transition-colors ${theme === 'system' ? 'bg-white dark:bg-white/10 shadow-sm text-blue-600 dark:text-blue-400' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                aria-label="System mode"
              >
                <Laptop className="w-4 h-4" />
              </button>
              <button 
                onClick={() => setTheme('dark')}
                className={`p-1.5 rounded-full transition-colors ${theme === 'dark' ? 'bg-slate-800 shadow-sm text-blue-400' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                aria-label="Dark mode"
              >
                <Moon className="w-4 h-4" />
              </button>
            </div>

            <a href="mailto:sakis@sakis-athan.com" className="hidden sm:block text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">
              Contact Support
            </a>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 pt-32 pb-24">
        
        <div className="text-center mb-10 space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-blue-500/20 bg-blue-500/10 text-blue-600 dark:text-blue-400 text-xs sm:text-sm font-medium mb-4">
            <ShieldAlert className="w-4 h-4" />
            NY SHIELD Act Compliance Scanner
          </div>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight leading-tight">
            Is Your Website or App <br className="hidden sm:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-500">
              Vulnerable to a Breach?
            </span>
          </h1>
          <p className="text-slate-600 dark:text-slate-400 text-base sm:text-lg md:text-xl max-w-2xl mx-auto leading-relaxed mt-4">
            Is your website or app protecting your visitors&apos; sensitive data? The NY SHIELD Act caps breach notification failures at $250,000—but CCPA and GDPR carry no such small caps, reaching <span className="font-bold text-slate-900 dark:text-white">4–7% of global revenue</span>. Enter your URL below for a free diagnostic report.
          </p>
        </div>

        {/* Search Bar */}
        <form onSubmit={handleScan} className="max-w-2xl mx-auto relative group mt-8">
          <div className="absolute -inset-1 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-2xl sm:rounded-3xl blur opacity-20 group-hover:opacity-40 transition duration-1000 group-hover:duration-200"></div>
          <div className="relative flex flex-col sm:flex-row items-center bg-white dark:bg-[#111111] border border-slate-200 dark:border-white/10 rounded-2xl sm:rounded-3xl p-2 shadow-xl sm:shadow-2xl transition-colors duration-300">
            <div className="hidden sm:block pl-4 pr-2 text-slate-400 dark:text-slate-500 font-mono text-sm sm:text-base">https://</div>
            <input 
              type="text" 
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="yourwebsite.com"
              className="w-full sm:flex-1 bg-transparent border-none outline-none text-slate-900 dark:text-white text-base sm:text-lg placeholder-slate-400 dark:placeholder-slate-600 py-3 sm:py-4 px-4 sm:px-0 text-center sm:text-left"
              disabled={isLoading}
            />
            <button 
              type="submit"
              disabled={isLoading || !url}
              className="w-full sm:w-auto mt-2 sm:mt-0 bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-500 text-white px-6 sm:px-8 py-3 sm:py-4 rounded-xl sm:rounded-2xl font-medium transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Scanning...
                </>
              ) : (
                <>
                  Analyze
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </form>

        {/* Scan Phase Indicator */}
        {isLoading && scanPhase && (
          <div className="mt-8 text-center animate-in fade-in duration-500">
            <div className="inline-flex items-center gap-3 px-5 py-3 rounded-2xl bg-white dark:bg-[#111111] border border-slate-200 dark:border-white/10 shadow-lg">
              <svg className="animate-spin h-4 w-4 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span className="text-sm font-medium text-slate-600 dark:text-slate-300">{scanPhase}</span>
            </div>
          </div>
        )}

        {/* Subtle Credit */}
        {!result && !error && !isLoading && (
          <div className="mt-32 sm:mt-40 text-center opacity-80">
            <p className="text-[10px] sm:text-xs font-semibold tracking-widest uppercase text-slate-400 dark:text-slate-600 select-none cursor-default">
              Created by Athanasios (Sakis) Athanasopoulos
            </p>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mt-8 p-4 sm:p-5 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-xl sm:rounded-2xl text-red-600 dark:text-red-400 flex items-start gap-3 max-w-2xl mx-auto shadow-sm">
            <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-sm sm:text-base">Scan Failed</h3>
              <p className="text-xs sm:text-sm mt-1 opacity-90">{error}</p>
            </div>
          </div>
        )}

        {/* Results Dashboard */}
        {result && (
          <div className="mt-16 animate-in fade-in slide-in-from-bottom-8 duration-700">
            
            {/* Grade Header */}
            <div className="flex flex-col md:flex-row items-center gap-6 sm:gap-8 bg-white dark:bg-[#111111] border border-slate-200 dark:border-white/10 p-6 sm:p-8 rounded-3xl shadow-xl dark:shadow-2xl relative overflow-hidden transition-colors duration-300">
              <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-blue-500/5 dark:from-blue-500/10 to-transparent blur-3xl rounded-full"></div>
              
              <div className={`shrink-0 w-28 h-28 sm:w-32 sm:h-32 rounded-2xl sm:rounded-3xl border-2 flex items-center justify-center shadow-lg ${getGradeColor(result.grade)}`}>
                <span className="text-5xl sm:text-6xl font-black">{result.grade}</span>
              </div>
              
              <div className="flex-1 text-center md:text-left z-10 w-full">
                <h2 className="text-xl sm:text-2xl font-bold mb-2">Security Posture: {getPostureLabel(result.grade)}</h2>
                <p className="text-slate-500 dark:text-slate-400 mb-4 text-sm sm:text-base truncate">
                  Target: <span className="text-slate-700 dark:text-slate-200 font-mono">{result.url}</span>
                </p>
                
                {/* Dynamic Progress Bar */}
                <div className="mb-4 max-w-md mx-auto md:mx-0">
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Compliance Score</span>
                    <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{result.score}%</span>
                  </div>
                  <div className="w-full bg-slate-200 dark:bg-slate-700/50 rounded-full h-2.5 overflow-hidden border border-slate-300/50 dark:border-slate-600/50">
                    <div 
                      className={`h-full rounded-full transition-all duration-1000 ease-out ${getBarColor(result.grade)}`}
                      style={{ width: `${result.score}%` }}
                    ></div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 justify-center md:justify-start">
                  <div className="bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 px-3 py-1 rounded-md text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-300">
                    Tested: {new Date(result.timestamp).toLocaleTimeString()}
                  </div>
                </div>
              </div>
            </div>

            {/* Detailed Headers List */}
            <div className="mt-8 sm:mt-10 space-y-4">
              <h3 className="text-lg sm:text-xl font-semibold mb-4 sm:mb-6 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                Compliance Controls Analysis
              </h3>
              
              {result.headers.map((header, idx) => (
                <div key={idx} className="bg-white dark:bg-[#111111] border border-slate-200 dark:border-white/5 rounded-xl sm:rounded-2xl p-4 sm:p-5 hover:border-slate-300 dark:hover:border-white/10 transition-colors shadow-sm">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 mb-3">
                    <div className="flex items-center gap-3 overflow-hidden">
                      {header.present ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                      ) : (
                        <XCircle className="w-5 h-5 text-red-500 shrink-0" />
                      )}
                      <span className="font-mono text-sm sm:text-base font-semibold text-slate-800 dark:text-slate-200 truncate">{header.name}</span>
                    </div>
                    <div className="flex-shrink-0 self-start sm:self-auto">
                      {header.present ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20">
                          Passed
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-500/20">
                          Missing
                        </span>
                      )}
                    </div>
                  </div>
                  
                  {!header.present && (
                    <div className="mt-4 pl-4 sm:pl-8 border-l-2 border-red-300 dark:border-red-500/30 ml-1 sm:ml-2">
                      <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-bold mb-1">Business Risk:</p>
                      <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                        {getRiskExplanation(header.name)}
                      </p>
                    </div>
                  )}
                  {header.present && (
                    <div className="mt-2 pl-4 sm:pl-8 border-l-2 border-emerald-300 dark:border-emerald-500/30 ml-1 sm:ml-2 overflow-hidden">
                      <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-500 font-mono truncate">{header.value}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* GPC Privacy Signal Compliance */}
            <div className="mt-8 sm:mt-10">
              <h3 className="text-lg sm:text-xl font-semibold mb-4 sm:mb-6 flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                Privacy Signal Compliance (GPC)
              </h3>
              <div className={`bg-white dark:bg-[#111111] border rounded-xl sm:rounded-2xl p-4 sm:p-5 shadow-sm ${result.gpc.supported ? 'border-emerald-200 dark:border-emerald-500/20' : 'border-red-200 dark:border-red-500/20'}`}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3">
                    {result.gpc.supported ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-500 shrink-0" />
                    )}
                    <span className="font-mono text-sm sm:text-base font-semibold text-slate-800 dark:text-slate-200">Global Privacy Control (Sec-GPC)</span>
                  </div>
                  <div className="flex-shrink-0">
                    {result.gpc.supported ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20">
                        Honored
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-500/20">
                        Not Supported
                      </span>
                    )}
                  </div>
                </div>
                <div className={`mt-4 pl-4 sm:pl-8 border-l-2 ml-1 sm:ml-2 ${result.gpc.supported ? 'border-emerald-300 dark:border-emerald-500/30' : 'border-red-300 dark:border-red-500/30'}`}>
                  <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                    {result.gpc.details}
                  </p>
                  {!result.gpc.supported && (
                    <p className="text-xs sm:text-sm text-red-600 dark:text-red-400 font-semibold mt-2">
                      ⚖️ Ignoring GPC makes this site an immediate target for CCPA/CPRA enforcement in California, Texas, New Jersey, and 7+ other US states.
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Pre-Consent Tracker Audit */}
            <div className="mt-8 sm:mt-10">
              <h3 className="text-lg sm:text-xl font-semibold mb-4 sm:mb-6 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                Pre-Consent Tracker Audit
              </h3>

              {result.trackers.found > 0 ? (
                <div className="space-y-3">
                  <div className="bg-red-50 dark:bg-red-500/5 border border-red-200 dark:border-red-500/20 rounded-xl sm:rounded-2xl p-4 sm:p-5 shadow-sm">
                    <div className="flex items-center gap-3 mb-3">
                      <XCircle className="w-5 h-5 text-red-500 shrink-0" />
                      <span className="font-semibold text-sm sm:text-base text-red-700 dark:text-red-400">
                        ⚠ {result.trackers.found} Tracker{result.trackers.found > 1 ? 's' : ''} Firing Before User Consent
                      </span>
                    </div>
                    <p className="text-xs sm:text-sm text-red-600 dark:text-red-400 font-semibold mb-4 pl-4 sm:pl-8 ml-1 sm:ml-2 border-l-2 border-red-300 dark:border-red-500/30">
                      These tracking scripts were found hardcoded in the page source and will fire immediately when a visitor loads the page — before any consent is given. This is a direct violation of GDPR Article 7 and ePrivacy Directive.
                    </p>
                  </div>

                  {result.trackers.list.map((tracker, idx) => (
                    <div key={idx} className="bg-white dark:bg-[#111111] border border-slate-200 dark:border-white/5 rounded-xl sm:rounded-2xl p-4 sm:p-5 hover:border-slate-300 dark:hover:border-white/10 transition-colors shadow-sm">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-3">
                          <XCircle className="w-4 h-4 text-red-500 shrink-0" />
                          <span className="font-semibold text-sm text-slate-800 dark:text-slate-200">{tracker.name}</span>
                        </div>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] sm:text-xs font-semibold bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20">
                          {tracker.type}
                        </span>
                      </div>
                      <p className="mt-2 pl-4 sm:pl-7 text-[10px] sm:text-xs text-slate-500 dark:text-slate-500 font-mono truncate">{tracker.domain}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-white dark:bg-[#111111] border border-emerald-200 dark:border-emerald-500/20 rounded-xl sm:rounded-2xl p-4 sm:p-5 shadow-sm">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                    <span className="font-semibold text-sm sm:text-base text-emerald-700 dark:text-emerald-400">Clean — No pre-consent trackers detected in page source.</span>
                  </div>
                  <p className="mt-2 pl-4 sm:pl-8 text-xs sm:text-sm text-slate-500 dark:text-slate-400 ml-1 sm:ml-2 border-l-2 border-emerald-300 dark:border-emerald-500/30">
                    No known tracking scripts (Google Analytics, Meta Pixel, etc.) were found hardcoded in the initial HTML response.
                  </p>
                </div>
              )}
            </div>

            {/* Cookie Banner Advisory */}
            <div className="mt-8 sm:mt-10 p-4 sm:p-5 rounded-xl sm:rounded-2xl bg-amber-50 dark:bg-amber-500/5 border border-amber-200 dark:border-amber-500/20 shadow-sm">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-sm sm:text-base text-amber-800 dark:text-amber-300 mb-1">Advisory: Cookie Banner &quot;Dark Pattern&quot; Check</h4>
                  <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                    Manually verify that your cookie banner&apos;s <span className="font-bold">&quot;Reject All&quot;</span> button is the same size, color, and prominence as the <span className="font-bold">&quot;Accept All&quot;</span> button. If &quot;Accept&quot; is a bright, prominent button while &quot;Reject&quot; is hidden in gray text or buried behind extra clicks, your site uses an illegal <span className="font-bold text-amber-700 dark:text-amber-400">Deceptive Design Pattern</span> under the 2026 EU Transparency Sweep and CPPA enforcement guidelines — carrying the same fine risk as a data breach.
                  </p>
                </div>
              </div>
            </div>

            {/* Regulatory Calendar */}
            <div className="mt-8 sm:mt-10 p-4 sm:p-6 rounded-xl sm:rounded-2xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 shadow-sm">
              <h4 className="font-semibold text-sm sm:text-base text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                2026 Regulatory Enforcement Calendar
              </h4>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <span className="shrink-0 mt-0.5 w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                  <div>
                    <span className="text-xs sm:text-sm font-bold text-red-600 dark:text-red-400">Jan 2026 — NOW ACTIVE</span>
                    <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">GPC signal enforcement begins in 10+ US states (CA, TX, NJ, CT, MT, OR, DE, NH, NE, MD)</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <span className="shrink-0 mt-0.5 w-2 h-2 rounded-full bg-amber-500"></span>
                  <div>
                    <span className="text-xs sm:text-sm font-bold text-amber-600 dark:text-amber-400">Aug 2026</span>
                    <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">EU AI Act full transparency enforcement takes effect</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <span className="shrink-0 mt-0.5 w-2 h-2 rounded-full bg-purple-500 animate-pulse"></span>
                  <div>
                    <span className="text-xs sm:text-sm font-bold text-purple-600 dark:text-purple-400">Ongoing</span>
                    <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">CPPA automated sweeps for GPC non-compliance across all California-facing websites</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <span className="shrink-0 mt-0.5 w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
                  <div>
                    <span className="text-xs sm:text-sm font-bold text-blue-600 dark:text-blue-400">Ongoing</span>
                    <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">EDPB &quot;Dark Pattern&quot; enforcement actions across all 27 EU member states</p>
                  </div>
                </div>
              </div>
            </div>

            {/* CTA Section */}
            {result.grade !== 'A' ? (
              <div className="mt-10 sm:mt-12 p-6 sm:p-8 rounded-2xl sm:rounded-3xl bg-blue-50 dark:bg-[#111827] dark:bg-none border border-blue-200 dark:border-blue-900/50 text-center shadow-sm">
                <AlertTriangle className="w-10 h-10 sm:w-12 sm:h-12 text-yellow-600 dark:text-yellow-500 mx-auto mb-4" />
                <h3 className="text-xl sm:text-2xl font-bold mb-3 text-slate-900 dark:text-white">Your Business is Exposed</h3>
                <p className="text-sm sm:text-base text-slate-700 dark:text-slate-300 max-w-xl mx-auto mb-6 sm:mb-8 leading-relaxed">
                  These failures may violate the <span className="font-bold text-slate-900 dark:text-white">NY SHIELD Act</span> ($250K cap for notification failures), the <span className="font-bold text-slate-900 dark:text-white">CCPA/CPRA</span>, and the <span className="font-bold text-slate-900 dark:text-white">EU GDPR</span> — which carry fines up to <span className="font-bold text-red-600 dark:text-red-400">4–7% of global annual revenue</span> with no cap. We implement enterprise-grade security wrappers with zero downtime.
                </p>
                {!showBotChallenge ? (
                  <button 
                    onClick={triggerBotChallenge}
                    className="inline-flex w-full sm:w-auto items-center justify-center bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-500 text-white font-semibold px-6 sm:px-8 py-3 sm:py-4 rounded-xl transition-all hover:scale-105 active:scale-95 shadow-lg shadow-blue-600/20"
                  >
                    Schedule Remediation
                  </button>
                ) : (
                  <form onSubmit={verifyBotChallenge} className="mt-4 flex flex-col items-center gap-3 animate-in fade-in zoom-in duration-300">
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Security Check: What is {botNum1} {botOp} {botNum2}?</p>
                    <div className="flex gap-2">
                      <input 
                        type="number" 
                        value={botAnswer}
                        onChange={(e) => setBotAnswer(e.target.value)}
                        className={`w-24 text-center px-3 py-2 border rounded-lg bg-white dark:bg-[#111111] text-slate-900 dark:text-white ${botError ? 'border-red-500 focus:ring-red-500 dark:border-red-500' : 'border-slate-300 dark:border-slate-700 focus:ring-blue-500'} focus:outline-none focus:ring-2`}
                        placeholder="?"
                        autoFocus
                      />
                      <button 
                        type="submit"
                        disabled={!botAnswer}
                        className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-500 text-white px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50"
                      >
                        Verify
                      </button>
                    </div>
                    {botError && <p className="text-xs text-red-500 font-medium">Incorrect, please try again.</p>}
                  </form>
                )}
              </div>
            ) : (
              <div className="mt-10 sm:mt-12 p-6 sm:p-8 rounded-2xl sm:rounded-3xl bg-green-50 dark:bg-[#0a1f0a] border border-green-200 dark:border-green-900/50 text-center shadow-sm">
                <ShieldCheck className="w-10 h-10 sm:w-12 sm:h-12 text-green-600 dark:text-green-500 mx-auto mb-4" />
                <h3 className="text-xl sm:text-2xl font-bold mb-3 text-slate-900 dark:text-white">Your Business is Protected</h3>
                <p className="text-sm sm:text-base text-slate-700 dark:text-slate-300 max-w-xl mx-auto mb-6 sm:mb-8 leading-relaxed">
                  All critical security headers are properly configured. Your website meets the NY SHIELD Act and GDPR compliance benchmarks. We offer ongoing monitoring and advanced hardening services to keep you ahead of the 2026 regulatory landscape.
                </p>
                <a 
                  href="https://sakis-athan.com" 
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex w-full sm:w-auto items-center justify-center bg-green-600 hover:bg-green-700 dark:bg-green-600 dark:hover:bg-green-500 text-white font-semibold px-6 sm:px-8 py-3 sm:py-4 rounded-xl transition-all hover:scale-105 active:scale-95 shadow-lg shadow-green-600/20"
                >
                  Explore Advanced Protection
                </a>
              </div>
            )}

          </div>
        )}

      </main>
    </div>
  );
}
