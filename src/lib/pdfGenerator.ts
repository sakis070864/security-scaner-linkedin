import { jsPDF } from 'jspdf';
import { DeepScanResult } from './scanner';

// ── Color Palette ──────────────────────────────────────────────────
const COLORS = {
  black: [20, 20, 20] as const,
  darkGray: [45, 55, 72] as const,
  medGray: [74, 85, 104] as const,
  lightGray: [160, 170, 180] as const,
  veryLightGray: [235, 238, 242] as const,
  white: [255, 255, 255] as const,
  red: [220, 53, 69] as const,
  green: [40, 167, 69] as const,
  orange: [230, 126, 34] as const,
  blue: [41, 98, 255] as const,
  darkBlue: [26, 54, 93] as const,
  gold: [218, 165, 32] as const,
  lightRed: [255, 235, 238] as const,
  lightGreen: [232, 245, 233] as const,
  lightOrange: [255, 243, 224] as const,
  headerBg: [26, 32, 44] as const,
};

// ── Helper: Draw a rounded rectangle ────────────────────────────
function drawRoundedRect(doc: jsPDF, x: number, y: number, w: number, h: number, r: number, fillColor: readonly [number, number, number]) {
  doc.setFillColor(fillColor[0], fillColor[1], fillColor[2]);
  doc.roundedRect(x, y, w, h, r, r, 'F');
}

// ── Helper: Draw status badge ───────────────────────────────────
function drawBadge(doc: jsPDF, text: string, x: number, y: number, color: readonly [number, number, number], bgColor: readonly [number, number, number]) {
  const textWidth = doc.getTextWidth(text) + 6;
  drawRoundedRect(doc, x, y - 4, textWidth, 6, 1.5, bgColor);
  doc.setTextColor(color[0], color[1], color[2]);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text(text, x + 3, y);
}

// ── Helper: Check page overflow and add new page ────────────────
function checkPage(doc: jsPDF, y: number, needed: number = 30): number {
  if (y + needed > 280) {
    doc.addPage();
    return 20;
  }
  return y;
}

// ── Helper: Section header with icon ────────────────────────────
function sectionHeader(doc: jsPDF, title: string, y: number, pageWidth: number): number {
  y = checkPage(doc, y, 20);
  // Accent line
  doc.setDrawColor(COLORS.blue[0], COLORS.blue[1], COLORS.blue[2]);
  doc.setLineWidth(0.8);
  doc.line(15, y, 15, y + 7);
  // Title
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(COLORS.darkBlue[0], COLORS.darkBlue[1], COLORS.darkBlue[2]);
  doc.text(title, 19, y + 5);
  // Underline
  doc.setDrawColor(COLORS.veryLightGray[0], COLORS.veryLightGray[1], COLORS.veryLightGray[2]);
  doc.setLineWidth(0.3);
  doc.line(15, y + 9, pageWidth - 15, y + 9);
  return y + 14;
}

// ── Helper: Get grade color ─────────────────────────────────────
function gradeColor(grade: string): readonly [number, number, number] {
  switch (grade) {
    case 'A': return COLORS.green;
    case 'B': return COLORS.blue;
    case 'C': return COLORS.orange;
    default: return COLORS.red;
  }
}

function gradeLabel(grade: string): string {
  switch (grade) {
    case 'A': return 'Low Risk';
    case 'B': return 'Moderate Risk';
    case 'C': return 'Elevated Risk';
    default: return 'High Risk';
  }
}

// ════════════════════════════════════════════════════════════════════
//  MAIN PDF GENERATOR
// ════════════════════════════════════════════════════════════════════
export async function generateComplianceReport(scanData: DeepScanResult): Promise<Buffer> {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pw = doc.internal.pageSize.getWidth(); // page width
  let y = 0;

  // ═══════════════════════════════════════════════════════════════
  //  PAGE 1 — BRANDED HEADER
  // ═══════════════════════════════════════════════════════════════

  // Dark header band
  drawRoundedRect(doc, 0, 0, pw, 42, 0, COLORS.headerBg);

  // Company name
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(COLORS.gold[0], COLORS.gold[1], COLORS.gold[2]);
  doc.text('ATHAN SECURITY', pw / 2, 10, { align: 'center' });

  // Report title
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text('Data Privacy & Security Threat Assessment', pw / 2, 20, { align: 'center' });

  // Branded tagline
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(180, 190, 210);
  doc.text('Created by Athanasios (Sakis) Athanasopoulos  |  sakis@sakis-athan.com  |  We resolve security issues fast', pw / 2, 28, { align: 'center' });

  // Report date
  doc.setFontSize(7);
  doc.setTextColor(130, 140, 160);
  doc.text(`Report Generated: ${new Date(scanData.timestamp).toLocaleString('en-US', { dateStyle: 'full', timeStyle: 'short' })}`, pw / 2, 35, { align: 'center' });

  y = 50;

  // ═══════════════════════════════════════════════════════════════
  //  SCORE CARD
  // ═══════════════════════════════════════════════════════════════
  const gc = gradeColor(scanData.grade);

  // Score card background
  drawRoundedRect(doc, 15, y, pw - 30, 32, 3, COLORS.veryLightGray);

  // Grade circle
  const cx = 35;
  const cy = y + 16;
  doc.setFillColor(gc[0], gc[1], gc[2]);
  doc.circle(cx, cy, 10, 'F');
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text(scanData.grade, cx, cy + 2, { align: 'center' });

  // Security Posture label
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(gc[0], gc[1], gc[2]);
  doc.text(`Security Posture: ${gradeLabel(scanData.grade)}`, 50, y + 10);

  // Target
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(COLORS.medGray[0], COLORS.medGray[1], COLORS.medGray[2]);
  doc.text(`Target: ${scanData.url}`, 50, y + 17);

  // Score
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(COLORS.darkGray[0], COLORS.darkGray[1], COLORS.darkGray[2]);
  doc.text(`Compliance Score: ${scanData.score}%`, 50, y + 24);

  // Score bar
  const barX = 105;
  const barW = pw - 30 - 105 + 15;
  drawRoundedRect(doc, barX, y + 21, barW, 4, 2, [220, 220, 225]);
  const fillW = Math.max(2, (scanData.score / 100) * barW);
  drawRoundedRect(doc, barX, y + 21, fillW, 4, 2, gc);

  y += 40;

  // ═══════════════════════════════════════════════════════════════
  //  COMPLIANCE CONTROLS ANALYSIS
  // ═══════════════════════════════════════════════════════════════
  y = sectionHeader(doc, 'Compliance Controls Analysis', y, pw);

  const businessRisks: Record<string, string> = {
    'strict-transport-security': 'Failure to enforce HTTPS. Data (including client intake forms) can be intercepted in plain text over unsecured networks.',
    'x-frame-options': 'Vulnerable to Clickjacking. Hackers can embed your site in a malicious iframe to trick users into clicking links or submitting forms.',
    'x-content-type-options': 'Browser may misinterpret file types, enabling XSS attacks through MIME sniffing.',
    'content-security-policy': 'No restrictions on script sources. Cross-site scripting (XSS) attacks can inject malicious code into your pages.',
    'referrer-policy': 'Leaks sensitive URL data to third-party sites when users click external links.',
    'permissions-policy': 'Allows unauthorized access to sensitive browser features (camera, microphone, geolocation) by default.',
  };

  for (const header of scanData.headers) {
    y = checkPage(doc, y, 22);

    // Header name
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(COLORS.darkGray[0], COLORS.darkGray[1], COLORS.darkGray[2]);
    doc.text(header.name, 20, y);

    // Status badge
    if (header.status === 'pass') {
      drawBadge(doc, 'PASSED', pw - 42, y, COLORS.green, COLORS.lightGreen);
    } else {
      drawBadge(doc, 'MISSING', pw - 42, y, COLORS.red, COLORS.lightRed);
    }

    y += 5;

    if (header.status === 'pass') {
      // Show the detail (truncated)
      doc.setFontSize(7);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(COLORS.medGray[0], COLORS.medGray[1], COLORS.medGray[2]);
      const val = header.detail.length > 100 ? header.detail.substring(0, 100) + '...' : header.detail;
      doc.text(val, 20, y);
      y += 5;
    } else {
      // Business risk warning
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(COLORS.red[0], COLORS.red[1], COLORS.red[2]);
      doc.text('Business Risk:', 20, y);
      y += 4;
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(COLORS.medGray[0], COLORS.medGray[1], COLORS.medGray[2]);
      const riskText = businessRisks[header.name] || 'Security header is missing, increasing exposure to web attacks.';
      const riskLines = doc.splitTextToSize(riskText, pw - 40);
      doc.text(riskLines, 20, y);
      y += riskLines.length * 3.5 + 2;
    }

    // Separator line
    doc.setDrawColor(COLORS.veryLightGray[0], COLORS.veryLightGray[1], COLORS.veryLightGray[2]);
    doc.setLineWidth(0.2);
    doc.line(20, y, pw - 20, y);
    y += 5;
  }

  // ═══════════════════════════════════════════════════════════════
  //  PRIVACY SIGNAL COMPLIANCE (GPC)
  // ═══════════════════════════════════════════════════════════════
  y = sectionHeader(doc, 'Privacy Signal Compliance (GPC)', y, pw);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(COLORS.darkGray[0], COLORS.darkGray[1], COLORS.darkGray[2]);
  doc.text('Global Privacy Control (Sec-GPC)', 20, y);

  // Status badge
  if (scanData.gpc.supported) {
    drawBadge(doc, 'SUPPORTED', pw - 45, y, COLORS.green, COLORS.lightGreen);
  } else {
    drawBadge(doc, 'NOT SUPPORTED', pw - 50, y, COLORS.red, COLORS.lightRed);
  }
  y += 6;

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(COLORS.medGray[0], COLORS.medGray[1], COLORS.medGray[2]);
  const gpcLines = doc.splitTextToSize(scanData.gpc.details, pw - 40);
  doc.text(gpcLines, 20, y);
  y += gpcLines.length * 3.5 + 3;

  if (!scanData.gpc.supported) {
    y = checkPage(doc, y, 15);
    // Warning box
    drawRoundedRect(doc, 18, y - 2, pw - 36, 12, 2, COLORS.lightRed);
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(COLORS.red[0], COLORS.red[1], COLORS.red[2]);
    doc.text('⚖ LEGAL WARNING:', 22, y + 2);
    doc.setFont('helvetica', 'normal');
    const warnText = 'Ignoring GPC makes this site an immediate target for CCPA/CPRA enforcement in California, Texas, New Jersey, and 7+ other US states.';
    const warnLines = doc.splitTextToSize(warnText, pw - 52);
    doc.text(warnLines, 22, y + 6);
    y += 16;
  }

  y += 4;

  // ═══════════════════════════════════════════════════════════════
  //  PRE-CONSENT TRACKER AUDIT
  // ═══════════════════════════════════════════════════════════════
  y = sectionHeader(doc, 'Pre-Consent Tracker Audit', y, pw);

  if (scanData.trackers.found === 0) {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(COLORS.green[0], COLORS.green[1], COLORS.green[2]);
    doc.text('No pre-consent trackers detected.', 20, y);
    y += 8;
  } else {
    // Warning header
    drawRoundedRect(doc, 18, y - 2, pw - 36, 10, 2, COLORS.lightOrange);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(COLORS.orange[0], COLORS.orange[1], COLORS.orange[2]);
    doc.text(`⚠ ${scanData.trackers.found} Tracker${scanData.trackers.found > 1 ? 's' : ''} Firing Before User Consent`, 22, y + 4);
    y += 13;

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(COLORS.medGray[0], COLORS.medGray[1], COLORS.medGray[2]);
    const trackerWarn = doc.splitTextToSize(
      'These tracking scripts are hardcoded in the page source and fire immediately when a visitor loads the page — before any consent is given. This is a direct violation of GDPR Article 7 and ePrivacy Directive.',
      pw - 40
    );
    doc.text(trackerWarn, 20, y);
    y += trackerWarn.length * 3.5 + 5;

    // Tracker list
    for (const t of scanData.trackers.list) {
      y = checkPage(doc, y, 12);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(COLORS.darkGray[0], COLORS.darkGray[1], COLORS.darkGray[2]);
      doc.text(`• ${t.name}`, 22, y);
      drawBadge(doc, t.type, pw - 45, y, COLORS.orange, COLORS.lightOrange);
      y += 4;
      doc.setFontSize(7);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(COLORS.lightGray[0], COLORS.lightGray[1], COLORS.lightGray[2]);
      doc.text(t.type, 27, y);
      y += 6;
    }
  }

  y += 4;

  // ═══════════════════════════════════════════════════════════════
  //  ADVISORY: COOKIE BANNER DARK PATTERN
  // ═══════════════════════════════════════════════════════════════
  y = checkPage(doc, y, 35);
  y = sectionHeader(doc, 'Advisory: Cookie Banner "Dark Pattern" Check', y, pw);

  drawRoundedRect(doc, 18, y - 2, pw - 36, 24, 2, [255, 248, 235]);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(COLORS.medGray[0], COLORS.medGray[1], COLORS.medGray[2]);
  const advisoryText = 'Manually verify that your cookie banner\'s "Reject All" button is the same size, color, and prominence as the "Accept All" button. If "Accept" is a bright, prominent button while "Reject" is hidden in gray text or buried behind extra clicks, your site uses an illegal Deceptive Design Pattern under the 2026 EU Transparency Sweep and CPPA enforcement guidelines — carrying the same fine risk as a data breach.';
  const advLines = doc.splitTextToSize(advisoryText, pw - 44);
  doc.text(advLines, 22, y + 2);
  y += 30;

  // ═══════════════════════════════════════════════════════════════
  //  2026 REGULATORY ENFORCEMENT CALENDAR
  // ═══════════════════════════════════════════════════════════════
  y = checkPage(doc, y, 50);
  y = sectionHeader(doc, '2026 Regulatory Enforcement Calendar', y, pw);

  const calendarEvents = [
    { date: 'Jan 2026 — NOW ACTIVE', text: 'GPC signal enforcement begins in 10+ US states (CA, TX, NJ, CT, MT, OR, DE, NH, NE, MD)', color: COLORS.red },
    { date: 'Aug 2026', text: 'EU AI Act full transparency enforcement takes effect', color: COLORS.orange },
    { date: 'Ongoing', text: 'CPPA automated sweeps for GPC non-compliance across all California-facing websites', color: COLORS.orange },
    { date: 'Ongoing', text: 'EDPB "Dark Pattern" enforcement actions across all 27 EU member states', color: COLORS.orange },
  ];

  for (const ev of calendarEvents) {
    y = checkPage(doc, y, 12);
    // Date label
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(ev.color[0], ev.color[1], ev.color[2]);
    doc.text(`● ${ev.date}`, 22, y);
    y += 4;
    // Description
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(COLORS.medGray[0], COLORS.medGray[1], COLORS.medGray[2]);
    const evLines = doc.splitTextToSize(ev.text, pw - 50);
    doc.text(evLines, 27, y);
    y += evLines.length * 3.5 + 4;
  }

  y += 4;

  // ═══════════════════════════════════════════════════════════════
  //  CLOSING: YOUR BUSINESS IS EXPOSED
  // ═══════════════════════════════════════════════════════════════
  y = checkPage(doc, y, 45);

  // Warning box
  drawRoundedRect(doc, 15, y, pw - 30, 38, 3, COLORS.lightRed);

  // Warning icon
  doc.setFontSize(16);
  doc.setTextColor(COLORS.red[0], COLORS.red[1], COLORS.red[2]);
  doc.text('⚠', pw / 2, y + 8, { align: 'center' });

  // Title
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(COLORS.red[0], COLORS.red[1], COLORS.red[2]);
  doc.text('Your Business is Exposed', pw / 2, y + 15, { align: 'center' });

  // Description
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(COLORS.medGray[0], COLORS.medGray[1], COLORS.medGray[2]);
  const exposedText = 'These failures violate global data protection laws like the GDPR, CCPA/CPRA, and FTC Guidelines — which carry fines up to 4-7% of global annual revenue with no cap. We implement enterprise-grade security wrappers with zero downtime.';
  const exposedLines = doc.splitTextToSize(exposedText, pw - 44);
  doc.text(exposedLines, 22, y + 20);

  // CTA
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(COLORS.blue[0], COLORS.blue[1], COLORS.blue[2]);
  doc.text('Contact sakis@sakis-athan.com to schedule remediation', pw / 2, y + 33, { align: 'center' });

  // ═══════════════════════════════════════════════════════════════
  //  FOOTER ON ALL PAGES
  // ═══════════════════════════════════════════════════════════════
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    // Separator
    doc.setDrawColor(COLORS.veryLightGray[0], COLORS.veryLightGray[1], COLORS.veryLightGray[2]);
    doc.setLineWidth(0.3);
    doc.line(15, 287, pw - 15, 287);
    // Footer text
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(COLORS.lightGray[0], COLORS.lightGray[1], COLORS.lightGray[2]);
    doc.text('Athan Security  •  sakis-athan.com  •  Confidential Report', 15, 292);
    doc.text(`Page ${i} of ${totalPages}`, pw - 15, 292, { align: 'right' });
  }

  // Convert to Buffer
  const arrayBuffer = doc.output('arraybuffer');
  return Buffer.from(arrayBuffer);
}
