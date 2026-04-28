// ─── Curated Tracker Database ───────────────────────────────────────────────
// These are real, well-documented tracking domains used by major ad/analytics platforms.
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

// Known inline tracker function signatures found in <script> tag content
const INLINE_TRACKER_SIGNATURES = [
  { name: 'Meta / Facebook Pixel', pattern: "fbq(", type: 'Marketing' },
  { name: 'Google Analytics (gtag)', pattern: "gtag(", type: 'Analytics' },
  { name: 'Google Analytics (ga())', pattern: "ga('send", type: 'Analytics' },
  { name: 'TikTok Pixel', pattern: "ttq.load", type: 'Marketing' },
  { name: 'Hotjar', pattern: "hj(", type: 'Analytics' },
  { name: 'LinkedIn Insight Tag', pattern: "_linkedin_partner_id", type: 'Marketing' },
  { name: 'Microsoft Clarity', pattern: "clarity(", type: 'Analytics' },
  { name: 'Pinterest Tag', pattern: "pintrk(", type: 'Marketing' },
];

// ─── GPC Detection ──────────────────────────────────────────────────────────
// Checks the official .well-known/gpc.json endpoint (W3C GPC Specification)
async function checkGPC(targetUrl: string): Promise<{
  supported: boolean;
  wellKnownFound: boolean;
  details: string;
}> {
  try {
    const origin = new URL(targetUrl).origin;
    const gpcUrl = `${origin}/.well-known/gpc.json`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(gpcUrl, {
      method: 'GET',
      signal: controller.signal,
      redirect: 'follow',
      headers: {
        'User-Agent': 'SecurityScanner-LeadGen/1.0',
        'Accept': 'application/json',
      }
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      return {
        supported: false,
        wellKnownFound: false,
        details: 'No .well-known/gpc.json found. This site does not declare Global Privacy Control support — a mandatory signal in 10+ US states as of 2026.'
      };
    }

    const text = await response.text();
    try {
      const json = JSON.parse(text);
      if (json.gpc === true) {
        return {
          supported: true,
          wellKnownFound: true,
          details: `GPC support declared. Last updated: ${json.lastUpdate || 'Not specified'}.`
        };
      } else {
        return {
          supported: false,
          wellKnownFound: true,
          details: 'The .well-known/gpc.json file exists but "gpc" is set to false. The site explicitly declines to honor Global Privacy Control.'
        };
      }
    } catch {
      return {
        supported: false,
        wellKnownFound: true,
        details: 'The .well-known/gpc.json file exists but contains invalid JSON. GPC support status is unknown.'
      };
    }
  } catch {
    return {
      supported: false,
      wellKnownFound: false,
      details: 'No .well-known/gpc.json found. This site does not declare Global Privacy Control support — a mandatory signal in 10+ US states as of 2026.'
    };
  }
}

// ─── Pre-Consent Tracker Scan ───────────────────────────────────────────────
// Fetches the raw HTML and searches for known tracking script signatures
async function scanTrackers(targetUrl: string): Promise<{
  found: number;
  list: Array<{ name: string; domain: string; type: string }>;
}> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(targetUrl, {
      method: 'GET',
      signal: controller.signal,
      redirect: 'follow',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml',
        'Sec-GPC': '1', // Tell the site we have GPC enabled — compliant sites should NOT load trackers
      }
    });
    clearTimeout(timeoutId);

    const html = await response.text();
    const htmlLower = html.toLowerCase();

    const foundTrackers: Array<{ name: string; domain: string; type: string }> = [];
    const seenNames = new Set<string>();

    // Check <script src="..."> patterns against known tracker domains
    for (const tracker of KNOWN_TRACKERS) {
      if (seenNames.has(tracker.name)) continue;
      for (const pattern of tracker.patterns) {
        if (htmlLower.includes(pattern.toLowerCase())) {
          foundTrackers.push({
            name: tracker.name,
            domain: pattern,
            type: tracker.type,
          });
          seenNames.add(tracker.name);
          break; // Only report each tracker once
        }
      }
    }

    // Check inline <script> content for known function calls (e.g., fbq(), gtag())
    for (const sig of INLINE_TRACKER_SIGNATURES) {
      if (seenNames.has(sig.name)) continue;
      if (htmlLower.includes(sig.pattern.toLowerCase())) {
        foundTrackers.push({
          name: sig.name,
          domain: `Inline code: ${sig.pattern}...)`,
          type: sig.type,
        });
        seenNames.add(sig.name);
      }
    }

    return {
      found: foundTrackers.length,
      list: foundTrackers,
    };
  } catch {
    // If we can't fetch the HTML (e.g., blocked), return empty — don't crash the scan
    return { found: 0, list: [] };
  }
}

export type ScanResultData = {
  url: string;
  grade: string;
  score: number;
  headers: Array<{ name: string; present: boolean; value: string }>;
  gpc: { supported: boolean; wellKnownFound: boolean; details: string };
  trackers: { found: number; list: Array<{ name: string; domain: string; type: string }> };
  timestamp: string;
};

export async function performScan(targetUrl: string): Promise<ScanResultData> {
  // Ensure the URL has a protocol
  if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
    targetUrl = `https://${targetUrl}`;
  }

  // ── Phase 1: Security Header Check
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  const browserUA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

  let response;
  try {
    // Use GET with browser User-Agent (many sites block HEAD and custom UAs)
    response = await fetch(targetUrl, {
      method: 'GET',
      signal: controller.signal,
      redirect: 'follow',
      headers: {
        'User-Agent': browserUA,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      }
    });
    clearTimeout(timeoutId);
    console.log(`[Scanner] Fetched ${targetUrl} — Status: ${response.status}`);
  } catch (err: any) {
    clearTimeout(timeoutId);
    console.error(`[Scanner] Failed to fetch ${targetUrl}:`, err.message);
    throw new Error(`Failed to reach the website (${err.message}). Please check the URL and try again.`);
  }

  if (!response) {
    throw new Error('No response received from the website.');
  }

  // Define the critical headers we are looking for
  const headersToCheck = [
    'strict-transport-security',
    'x-frame-options',
    'x-content-type-options',
    'content-security-policy',
    'referrer-policy',
    'permissions-policy'
  ];

  const headerResults = [];
  let headerScore = 100;
  const penaltyPerHeader = 100 / headersToCheck.length;

  for (const headerName of headersToCheck) {
    const headerValue = response.headers.get(headerName);
    const isPresent = headerValue !== null && headerValue !== '';
    
    if (!isPresent) {
      headerScore -= penaltyPerHeader;
    }

    headerResults.push({
      name: headerName,
      present: isPresent,
      value: headerValue || 'Missing'
    });
  }

  // ── Phase 2: GPC + Tracker Scan
  // Run both checks in parallel for speed
  const [gpcResult, trackerResult] = await Promise.all([
    checkGPC(targetUrl),
    scanTrackers(targetUrl),
  ]);

  // ── Combined Scoring
  // Headers: 60% weight | GPC: 15% weight | Trackers: 25% weight
  const headerComponent = (headerScore / 100) * 60;
  const gpcComponent = gpcResult.supported ? 15 : 0;
  // Tracker scoring: 0 trackers = full 25 points. Each tracker found subtracts points.
  const trackerPenalty = Math.min(trackerResult.found * 6.25, 25);
  const trackerComponent = 25 - trackerPenalty;

  const totalScore = Math.round(headerComponent + gpcComponent + trackerComponent);

  // Calculate Grade based on custom percentage ranges
  let grade = 'F';
  if (totalScore >= 91) grade = 'A';
  else if (totalScore >= 61) grade = 'B';
  else if (totalScore >= 41) grade = 'C';
  else if (totalScore >= 21) grade = 'D';

  return {
    url: targetUrl,
    grade,
    score: totalScore,
    headers: headerResults,
    gpc: gpcResult,
    trackers: trackerResult,
    timestamp: new Date().toISOString()
  };
}
