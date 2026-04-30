// ═══════════════════════════════════════════════════════════════
//  EMAIL VALIDATION & TOKEN STORE
// ═══════════════════════════════════════════════════════════════

import { DeepScanResult } from './scanner';

// Free email providers that are NOT corporate
const FREE_EMAIL_PROVIDERS = new Set([
  'gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'aol.com',
  'icloud.com', 'mail.com', 'protonmail.com', 'proton.me', 'zoho.com',
  'yandex.com', 'yandex.ru', 'live.com', 'msn.com', 'gmx.com',
  'fastmail.com', 'tutanota.com', 'tutamail.com', 'hey.com',
  'me.com', 'mac.com', 'inbox.com', 'mail.ru', 'seznam.cz',
  'web.de', 'gmx.de', 'gmx.net', 'yahoo.co.uk', 'yahoo.co.jp',
  'outlook.co.uk', 'hotmail.co.uk', 'googlemail.com',
]);

export function isCorporateEmail(email: string): boolean {
  const domain = email.split('@')[1]?.toLowerCase();
  if (!domain) return false;
  return !FREE_EMAIL_PROVIDERS.has(domain);
}

export function getEmailDomain(email: string): string {
  return email.split('@')[1]?.toLowerCase() || '';
}

// ─── Token-Based Results Store ──────────────────────────────────────────────
// In-memory store (Vercel serverless = ephemeral, but sufficient for short-lived tokens)
// For production scale, use Redis/KV store

type StoredScan = {
  token: string;
  email: string;
  url: string;
  result: DeepScanResult;
  verified: boolean;
  createdAt: number;
  expiresAt: number;
  source: 'corporate' | 'admin' | 'free';
};

// Global store (persists across requests in same serverless instance)
const scanStore = new Map<string, StoredScan>();

export function generateToken(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  for (let i = 0; i < 32; i++) {
    token += chars[Math.floor(Math.random() * chars.length)];
  }
  return token;
}

export function storeScan(token: string, email: string, url: string, result: DeepScanResult, source: 'corporate' | 'admin' | 'free'): void {
  // Clean expired entries
  const now = Date.now();
  for (const [key, scan] of scanStore) {
    if (scan.expiresAt < now) scanStore.delete(key);
  }

  scanStore.set(token, {
    token, email, url, result,
    verified: source === 'admin', // Admin-generated links are pre-verified
    createdAt: now,
    expiresAt: now + (48 * 60 * 60 * 1000), // 48 hours expiry
    source,
  });
}

export function getScan(token: string): StoredScan | null {
  const scan = scanStore.get(token);
  if (!scan) return null;
  if (scan.expiresAt < Date.now()) {
    scanStore.delete(token);
    return null;
  }
  return scan;
}

export function verifyScan(token: string): boolean {
  const scan = scanStore.get(token);
  if (!scan) return false;
  scan.verified = true;
  return true;
}
