// ═══════════════════════════════════════════════════════════════
//  DEEP PENETRATION SCANNER ENGINE
//  Passive-only vulnerability assessment (no active exploitation)
// ═══════════════════════════════════════════════════════════════

const BROWSER_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

// ─── Curated Tracker Database ───────────────────────────────────────────────
const KNOWN_TRACKERS = [
  { name: 'Google Analytics', patterns: ['google-analytics.com', 'www.google-analytics.com/analytics.js'], type: 'Analytics' },
  { name: 'Google Tag Manager', patterns: ['googletagmanager.com/gtag', 'googletagmanager.com/gtm'], type: 'Tag Manager' },
  { name: 'Meta / Facebook Pixel', patterns: ['connect.facebook.net', 'facebook.com/tr'], type: 'Marketing' },
  { name: 'TikTok Pixel', patterns: ['analytics.tiktok.com'], type: 'Marketing' },
  { name: 'LinkedIn Insight Tag', patterns: ['snap.licdn.com', 'linkedin.com/px'], type: 'Marketing' },
  { name: 'Microsoft Clarity', patterns: ['clarity.ms'], type: 'Analytics' },
  { name: 'Hotjar', patterns: ['hotjar.com', 'static.hotjar.com'], type: 'Analytics' },
  { name: 'Bing UET', patterns: ['bat.bing.com'], type: 'Marketing' },
  { name: 'Google Ads / DoubleClick', patterns: ['doubleclick.net', 'googlesyndication.com', 'googleadservices.com'], type: 'Advertising' },
  { name: 'Pinterest Tag', patterns: ['pinimg.com/ct', 'ct.pinterest.com'], type: 'Marketing' },
  { name: 'Twitter / X Pixel', patterns: ['ads-twitter.com', 'static.ads-twitter.com', 'analytics.twitter.com'], type: 'Marketing' },
  { name: 'Snapchat Pixel', patterns: ['sc-static.net'], type: 'Marketing' },
];

const INLINE_TRACKER_SIGNATURES = [
  { name: 'Meta / Facebook Pixel', pattern: 'fbq(', type: 'Marketing' },
  { name: 'Google Analytics (gtag)', pattern: 'gtag(', type: 'Analytics' },
  { name: 'Google Analytics (ga())', pattern: "ga('send", type: 'Analytics' },
  { name: 'TikTok Pixel', pattern: 'ttq.load', type: 'Marketing' },
  { name: 'Hotjar', pattern: 'hj(', type: 'Analytics' },
  { name: 'LinkedIn Insight Tag', pattern: '_linkedin_partner_id', type: 'Marketing' },
  { name: 'Microsoft Clarity', pattern: 'clarity(', type: 'Analytics' },
  { name: 'Pinterest Tag', pattern: 'pintrk(', type: 'Marketing' },
];

// ─── Sensitive Files to Probe ───────────────────────────────────────────────
const SENSITIVE_FILES = [
  { path: '/.env', risk: 'Critical', desc: 'Environment variables file — may contain database passwords, API keys, secrets' },
  { path: '/.git/config', risk: 'Critical', desc: 'Git configuration — exposes repository structure and potentially credentials' },
  { path: '/wp-config.php', risk: 'Critical', desc: 'WordPress config — contains database credentials and auth keys' },
  { path: '/.htpasswd', risk: 'Critical', desc: 'Apache password file — contains hashed credentials' },
  { path: '/phpinfo.php', risk: 'High', desc: 'PHP info page — reveals server configuration, installed modules, paths' },
  { path: '/server-status', risk: 'High', desc: 'Apache server status — reveals active connections and internal URLs' },
  { path: '/robots.txt', risk: 'Info', desc: 'Robots file — may reveal hidden directories and internal paths' },
  { path: '/sitemap.xml', risk: 'Info', desc: 'Sitemap — reveals full site structure' },
  { path: '/.well-known/security.txt', risk: 'Info', desc: 'Security contact info — good practice but reveals security team details' },
  { path: '/crossdomain.xml', risk: 'Medium', desc: 'Flash cross-domain policy — may allow unauthorized cross-domain access' },
  { path: '/backup.sql', risk: 'Critical', desc: 'Database backup — full database dump with all data' },
  { path: '/database.sql', risk: 'Critical', desc: 'Database dump — full database with credentials and user data' },
  { path: '/debug.log', risk: 'High', desc: 'Debug log — may contain stack traces, credentials, internal paths' },
  { path: '/error.log', risk: 'High', desc: 'Error log — may reveal internal server errors and paths' },
];

// ─── Admin Panels to Check ──────────────────────────────────────────────────
const ADMIN_PANELS = [
  { path: '/wp-admin', name: 'WordPress Admin' },
  { path: '/wp-login.php', name: 'WordPress Login' },
  { path: '/admin', name: 'Admin Panel' },
  { path: '/administrator', name: 'Joomla Admin' },
  { path: '/phpmyadmin', name: 'phpMyAdmin' },
  { path: '/cpanel', name: 'cPanel' },
  { path: '/webmail', name: 'Webmail' },
  { path: '/login', name: 'Login Page' },
  { path: '/dashboard', name: 'Dashboard' },
];

// ─── Technology Signatures ──────────────────────────────────────────────────
const TECH_SIGNATURES = [
  { name: 'WordPress', patterns: ['wp-content', 'wp-includes', 'wp-json'], category: 'CMS' },
  { name: 'Joomla', patterns: ['/media/jui/', '/components/com_', 'Joomla!'], category: 'CMS' },
  { name: 'Drupal', patterns: ['Drupal.settings', '/sites/default/', '/core/misc/drupal'], category: 'CMS' },
  { name: 'Shopify', patterns: ['cdn.shopify.com', 'shopify-section'], category: 'E-Commerce' },
  { name: 'Wix', patterns: ['static.wixstatic.com', 'wix.com'], category: 'Website Builder' },
  { name: 'Squarespace', patterns: ['squarespace.com', 'static1.squarespace.com'], category: 'Website Builder' },
  { name: 'React', patterns: ['react.production.min', '__NEXT_DATA__', 'reactroot'], category: 'Framework' },
  { name: 'Next.js', patterns: ['__NEXT_DATA__', '_next/static', 'next/dist'], category: 'Framework' },
  { name: 'Vue.js', patterns: ['vue.runtime', '__vue__', 'vue-router'], category: 'Framework' },
  { name: 'Angular', patterns: ['ng-version', 'angular.min', 'ng-app'], category: 'Framework' },
  { name: 'jQuery', patterns: ['jquery.min.js', 'jquery-', 'jQuery'], category: 'Library' },
  { name: 'Bootstrap', patterns: ['bootstrap.min.css', 'bootstrap.min.js', 'bootstrap.bundle'], category: 'Library' },
  { name: 'Cloudflare', patterns: ['cf-ray', 'cloudflare'], category: 'CDN/Security' },
];

// ═══════════════════════════════════════════════════════════════
//  CHECK FUNCTIONS
// ═══════════════════════════════════════════════════════════════

async function quickFetch(url: string, timeoutMs = 5000): Promise<Response | null> {
  try {
    const controller = new AbortController();
    const tid = setTimeout(() => controller.abort(), timeoutMs);
    const res = await fetch(url, {
      method: 'HEAD',
      signal: controller.signal,
      redirect: 'follow',
      headers: { 'User-Agent': BROWSER_UA },
    });
    clearTimeout(tid);
    return res;
  } catch {
    return null;
  }
}

// ─── GPC Detection ──────────────────────────────────────────────────────────
async function checkGPC(targetUrl: string) {
  try {
    const origin = new URL(targetUrl).origin;
    const gpcUrl = `${origin}/.well-known/gpc.json`;
    const controller = new AbortController();
    const tid = setTimeout(() => controller.abort(), 5000);
    const response = await fetch(gpcUrl, {
      method: 'GET', signal: controller.signal, redirect: 'follow',
      headers: { 'User-Agent': BROWSER_UA, 'Accept': 'application/json' }
    });
    clearTimeout(tid);

    if (!response.ok) {
      return { supported: false, wellKnownFound: false, details: 'No .well-known/gpc.json found. This site does not declare Global Privacy Control support — a mandatory signal in 10+ US states as of 2026.' };
    }
    const text = await response.text();
    try {
      const json = JSON.parse(text);
      if (json.gpc === true) {
        return { supported: true, wellKnownFound: true, details: `GPC support declared. Last updated: ${json.lastUpdate || 'Not specified'}.` };
      }
      return { supported: false, wellKnownFound: true, details: 'The .well-known/gpc.json file exists but "gpc" is set to false.' };
    } catch {
      return { supported: false, wellKnownFound: true, details: 'The .well-known/gpc.json file exists but contains invalid JSON.' };
    }
  } catch {
    return { supported: false, wellKnownFound: false, details: 'No .well-known/gpc.json found. This site does not declare Global Privacy Control support.' };
  }
}

// ─── Pre-Consent Tracker Scan ───────────────────────────────────────────────
async function scanTrackers(targetUrl: string, html: string) {
  const htmlLower = html.toLowerCase();
  const foundTrackers: Array<{ name: string; domain: string; type: string }> = [];
  const seenNames = new Set<string>();

  for (const tracker of KNOWN_TRACKERS) {
    if (seenNames.has(tracker.name)) continue;
    for (const pattern of tracker.patterns) {
      if (htmlLower.includes(pattern.toLowerCase())) {
        foundTrackers.push({ name: tracker.name, domain: pattern, type: tracker.type });
        seenNames.add(tracker.name);
        break;
      }
    }
  }
  for (const sig of INLINE_TRACKER_SIGNATURES) {
    if (seenNames.has(sig.name)) continue;
    if (htmlLower.includes(sig.pattern.toLowerCase())) {
      foundTrackers.push({ name: sig.name, domain: `Inline: ${sig.pattern}...)`, type: sig.type });
      seenNames.add(sig.name);
    }
  }
  return { found: foundTrackers.length, list: foundTrackers };
}

// ─── Exposed Files ──────────────────────────────────────────────────────────
async function checkExposedFiles(origin: string) {
  const results: Array<{ path: string; accessible: boolean; risk: string; desc: string; status: number }> = [];

  const checks = SENSITIVE_FILES.map(async (file) => {
    const res = await quickFetch(`${origin}${file.path}`);
    const status = res?.status || 0;
    // 200 = accessible, 403 = exists but blocked (still info), others = not found
    const accessible = status === 200;
    results.push({ path: file.path, accessible, risk: file.risk, desc: file.desc, status });
  });

  await Promise.all(checks);
  return results.sort((a, b) => (a.accessible === b.accessible ? 0 : a.accessible ? -1 : 1));
}

// ─── Admin Panel Detection ──────────────────────────────────────────────────
async function checkAdminPanels(origin: string) {
  const results: Array<{ path: string; name: string; accessible: boolean; status: number }> = [];

  const checks = ADMIN_PANELS.map(async (panel) => {
    const res = await quickFetch(`${origin}${panel.path}`);
    const status = res?.status || 0;
    const accessible = status === 200 || status === 301 || status === 302;
    results.push({ path: panel.path, name: panel.name, accessible, status });
  });

  await Promise.all(checks);
  return results;
}

// ─── Cookie Security ────────────────────────────────────────────────────────
function analyzeCookies(response: Response) {
  const setCookieHeaders = response.headers.getSetCookie?.() || [];
  const cookies: Array<{
    name: string; secure: boolean; httpOnly: boolean; sameSite: string;
    issues: string[];
  }> = [];

  for (const cookieStr of setCookieHeaders) {
    const parts = cookieStr.split(';').map(p => p.trim());
    const nameValue = parts[0]?.split('=');
    const name = nameValue?.[0] || 'unknown';
    const lower = cookieStr.toLowerCase();

    const secure = lower.includes('secure');
    const httpOnly = lower.includes('httponly');
    const sameSiteMatch = lower.match(/samesite=(strict|lax|none)/i);
    const sameSite = sameSiteMatch ? sameSiteMatch[1] : 'Not Set';

    const issues: string[] = [];
    if (!secure) issues.push('Missing Secure flag — cookie sent over HTTP');
    if (!httpOnly) issues.push('Missing HttpOnly flag — accessible to JavaScript/XSS');
    if (sameSite === 'Not Set' || sameSite.toLowerCase() === 'none') {
      issues.push('SameSite not set or None — vulnerable to CSRF');
    }

    cookies.push({ name, secure, httpOnly, sameSite, issues });
  }
  return cookies;
}

// ─── Information Disclosure ─────────────────────────────────────────────────
function checkInfoDisclosure(response: Response) {
  const findings: Array<{ header: string; value: string; risk: string; desc: string }> = [];

  const server = response.headers.get('server');
  if (server) {
    findings.push({ header: 'Server', value: server, risk: 'Medium', desc: 'Server software and version exposed — helps attackers target known vulnerabilities' });
  }
  const powered = response.headers.get('x-powered-by');
  if (powered) {
    findings.push({ header: 'X-Powered-By', value: powered, risk: 'Medium', desc: 'Technology stack exposed — reveals framework/language version' });
  }
  const aspVersion = response.headers.get('x-aspnet-version');
  if (aspVersion) {
    findings.push({ header: 'X-AspNet-Version', value: aspVersion, risk: 'Medium', desc: 'ASP.NET version exposed' });
  }
  return findings;
}

// ─── CORS Misconfiguration ──────────────────────────────────────────────────
function checkCORS(response: Response) {
  const acao = response.headers.get('access-control-allow-origin');
  const acac = response.headers.get('access-control-allow-credentials');

  if (!acao) return { misconfigured: false, details: 'No CORS headers present (default restrictive policy)', origin: null };
  if (acao === '*') {
    return { misconfigured: true, details: 'Access-Control-Allow-Origin is set to * (wildcard) — any website can make requests to this server', origin: '*' };
  }
  if (acao === '*' && acac === 'true') {
    return { misconfigured: true, details: 'CRITICAL: Wildcard origin with credentials allowed — full cross-origin access with authentication', origin: '*' };
  }
  return { misconfigured: false, details: `CORS restricted to: ${acao}`, origin: acao };
}

// ─── Technology Fingerprint ─────────────────────────────────────────────────
function fingerprintTech(html: string, response: Response) {
  const htmlLower = html.toLowerCase();
  const detected: Array<{ name: string; category: string; evidence: string }> = [];
  const seen = new Set<string>();

  for (const tech of TECH_SIGNATURES) {
    if (seen.has(tech.name)) continue;
    for (const pattern of tech.patterns) {
      if (htmlLower.includes(pattern.toLowerCase())) {
        detected.push({ name: tech.name, category: tech.category, evidence: pattern });
        seen.add(tech.name);
        break;
      }
    }
  }

  // Check headers for Cloudflare
  const cfRay = response.headers.get('cf-ray');
  if (cfRay && !seen.has('Cloudflare')) {
    detected.push({ name: 'Cloudflare', category: 'CDN/Security', evidence: 'cf-ray header' });
  }

  return detected;
}

// ═══════════════════════════════════════════════════════════════
//  RESULT TYPES
// ═══════════════════════════════════════════════════════════════

export type DeepScanResult = {
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

// ═══════════════════════════════════════════════════════════════
//  MAIN SCAN FUNCTION
// ═══════════════════════════════════════════════════════════════

export async function performDeepScan(targetUrl: string): Promise<DeepScanResult> {
  if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
    targetUrl = `https://${targetUrl}`;
  }

  const origin = new URL(targetUrl).origin;

  // Phase 1: Fetch the page
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  let response: Response;
  try {
    response = await fetch(targetUrl, {
      method: 'GET', signal: controller.signal, redirect: 'follow',
      headers: {
        'User-Agent': BROWSER_UA,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Sec-GPC': '1',
      }
    });
    clearTimeout(timeoutId);
  } catch (err: any) {
    clearTimeout(timeoutId);
    throw new Error(`Failed to reach the website (${err.message}). Please check the URL and try again.`);
  }

  const html = await response.text();

  // Phase 2: Run ALL checks in parallel
  const [gpcResult, trackerResult, exposedFiles, adminPanels] = await Promise.all([
    checkGPC(targetUrl),
    scanTrackers(targetUrl, html),
    checkExposedFiles(origin),
    checkAdminPanels(origin),
  ]);

  // Synchronous checks
  const cookies = analyzeCookies(response);
  const infoDisclosure = checkInfoDisclosure(response);
  const cors = checkCORS(response);
  const technologies = fingerprintTech(html, response);

  // Phase 3: Security Headers
  const headersToCheck = [
    'strict-transport-security', 'x-frame-options', 'x-content-type-options',
    'content-security-policy', 'referrer-policy', 'permissions-policy'
  ];

  const headerResults: Array<{ name: string; present: boolean; value: string }> = [];
  let headerScore = 100;
  const penaltyPerHeader = 100 / headersToCheck.length;

  for (const headerName of headersToCheck) {
    const headerValue = response.headers.get(headerName);
    const isPresent = headerValue !== null && headerValue !== '';
    if (!isPresent) headerScore -= penaltyPerHeader;
    headerResults.push({ name: headerName, present: isPresent, value: headerValue || 'Missing' });
  }

  // Phase 4: Scoring
  // Headers: 25% | Vulnerabilities: 40% | Cookies/CORS: 15% | GPC+Trackers: 20%
  const headerComponent = (headerScore / 100) * 25;

  // Vulnerability score (exposed files + admin panels + info disclosure)
  const exposedCritical = exposedFiles.filter(f => f.accessible && (f.risk === 'Critical' || f.risk === 'High')).length;
  const exposedAdmin = adminPanels.filter(p => p.accessible).length;
  const infoLeaks = infoDisclosure.length;
  const vulnPenalty = Math.min((exposedCritical * 15) + (exposedAdmin * 5) + (infoLeaks * 3), 40);
  const vulnComponent = 40 - vulnPenalty;

  // Cookie/CORS score
  const cookieIssues = cookies.reduce((sum, c) => sum + c.issues.length, 0);
  const corsPenalty = cors.misconfigured ? 8 : 0;
  const cookieCorsComponent = Math.max(15 - (cookieIssues * 2) - corsPenalty, 0);

  // GPC + Trackers
  const gpcComponent = gpcResult.supported ? 10 : 0;
  const trackerPenalty = Math.min(trackerResult.found * 2.5, 10);
  const trackerGpcComponent = (10 - trackerPenalty) + gpcComponent;

  const totalScore = Math.max(0, Math.min(100, Math.round(headerComponent + vulnComponent + cookieCorsComponent + trackerGpcComponent)));

  let grade = 'F';
  if (totalScore >= 91) grade = 'A';
  else if (totalScore >= 71) grade = 'B';
  else if (totalScore >= 51) grade = 'C';
  else if (totalScore >= 31) grade = 'D';

  return {
    url: targetUrl, grade, score: totalScore,
    headers: headerResults, gpc: gpcResult, trackers: trackerResult,
    exposedFiles, adminPanels, cookies, infoDisclosure, cors, technologies,
    timestamp: new Date().toISOString()
  };
}
