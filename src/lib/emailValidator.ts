// ═══════════════════════════════════════════════════════════════
//  EMAIL VALIDATION & TOKEN SYSTEM
//  Uses base64-encoded tokens instead of in-memory storage
//  (Vercel serverless = no persistent memory between requests)
// ═══════════════════════════════════════════════════════════════

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

// ─── Token Encoding/Decoding ────────────────────────────────────────────────
// Token = base64url({ email, url, exp, source })
// This is NOT a security mechanism — it's a convenience token.
// The "gate" is the email verification step itself.

type TokenPayload = {
  email: string;
  url: string;
  exp: number; // expiry timestamp
  source: 'corporate' | 'admin' | 'free';
};

export function createToken(email: string, url: string, source: 'corporate' | 'admin' | 'free'): string {
  const payload: TokenPayload = {
    email,
    url,
    exp: Date.now() + (48 * 60 * 60 * 1000), // 48 hours
    source,
  };
  // Base64url encode
  const json = JSON.stringify(payload);
  const base64 = Buffer.from(json).toString('base64url');
  return base64;
}

export function decodeToken(token: string): TokenPayload | null {
  try {
    const json = Buffer.from(token, 'base64url').toString('utf-8');
    const payload: TokenPayload = JSON.parse(json);
    // Check expiry
    if (payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}
