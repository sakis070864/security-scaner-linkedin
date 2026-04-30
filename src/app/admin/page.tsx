'use client';

import { useState } from 'react';
import { ShieldAlert, Lock, Copy, CheckCircle2 } from 'lucide-react';

export default function AdminPage() {
  const [key, setKey] = useState('');
  const [url, setUrl] = useState('');
  const [email, setEmail] = useState('');
  const [authenticated, setAuthenticated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [reportLink, setReportLink] = useState('');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const handleAuth = (e: React.FormEvent) => {
    e.preventDefault();
    if (key) setAuthenticated(true);
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setReportLink('');
    try {
      const res = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, email, key }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setReportLink(data.reportLink);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const copyLink = () => {
    navigator.clipboard.writeText(reportLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!authenticated) {
    return (
      <div className="min-h-screen bg-[#030712] flex items-center justify-center p-4">
        <form onSubmit={handleAuth} className="bg-white/5 border border-white/10 rounded-2xl p-8 w-full max-w-sm space-y-4">
          <div className="text-center">
            <Lock className="w-10 h-10 text-red-500 mx-auto mb-3" />
            <h1 className="text-xl font-bold text-white">Admin Access</h1>
          </div>
          <input type="password" value={key} onChange={e => setKey(e.target.value)} placeholder="Secret Key"
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-red-500" />
          <button type="submit" className="w-full bg-red-600 text-white py-3 rounded-xl font-semibold hover:bg-red-700">Enter</button>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#030712] text-white p-6">
      <div className="max-w-xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <ShieldAlert className="w-6 h-6 text-red-500" />
          <h1 className="text-2xl font-bold">Admin — Generate Report Link</h1>
        </div>

        <form onSubmit={handleGenerate} className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-4">
          <input type="text" value={url} onChange={e => setUrl(e.target.value)} placeholder="Client Website URL"
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-red-500" />
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Client Email"
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-red-500" />
          <button type="submit" disabled={loading || !url || !email}
            className="w-full bg-red-600 text-white py-3 rounded-xl font-semibold hover:bg-red-700 disabled:opacity-50">
            {loading ? 'Scanning & Generating...' : 'Generate Report Link'}
          </button>
        </form>

        {error && <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400">{error}</div>}

        {reportLink && (
          <div className="bg-green-500/10 border border-green-500/30 rounded-2xl p-6 space-y-3">
            <div className="flex items-center gap-2 text-green-400">
              <CheckCircle2 className="w-5 h-5" />
              <span className="font-bold">Report Link Ready</span>
            </div>
            <div className="flex gap-2">
              <input type="text" readOnly value={reportLink}
                className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white" />
              <button onClick={copyLink} className="px-4 py-2 bg-white/10 rounded-lg hover:bg-white/20 transition-colors">
                {copied ? <CheckCircle2 className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-xs text-slate-500">Send this link to {email}. Expires in 48 hours.</p>
          </div>
        )}
      </div>
    </div>
  );
}
