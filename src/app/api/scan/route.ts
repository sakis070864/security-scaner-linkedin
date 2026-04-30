import { NextResponse } from 'next/server';
import { performDeepScan } from '@/lib/scanner';
import { isCorporateEmail, createToken } from '@/lib/emailValidator';
import { sendVerificationEmail } from '@/lib/mailer';
import { saveLeadToSheet } from '@/lib/googleSheets';

export async function POST(request: Request) {
  try {
    const { url, email } = await request.json();

    if (!url) return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    if (!email || !email.includes('@')) return NextResponse.json({ error: 'Valid email is required' }, { status: 400 });

    const corporate = isCorporateEmail(email);

    // Run the deep scan
    const result = await performDeepScan(url);

    // Create token (encodes email + url in base64url)
    const token = createToken(email, url, corporate ? 'corporate' : 'free');

    // If corporate email → send verification email with link to /report/TOKEN
    if (corporate) {
      try {
        const baseUrl = request.headers.get('origin') || request.headers.get('referer')?.replace(/\/+$/, '') || '';
        const reportLink = `${baseUrl}/report/${token}`;
        await sendVerificationEmail(email, url, reportLink);
      } catch (mailErr) {
        console.error('Failed to send verification email:', mailErr);
      }
    }

    // Save lead to Google Sheets (with DeepSearch source tag)
    try {
      await saveLeadToSheet({ email, url, grade: result.grade, score: result.score });
    } catch (sheetErr) {
      console.error('Google Sheets save failed:', sheetErr);
    }

    return NextResponse.json({
      token,
      emailType: corporate ? 'corporate' : 'free',
      result,
    });

  } catch (error: any) {
    console.error('Deep Scan Error:', error);
    return NextResponse.json({ error: error.message || 'Scan failed' }, { status: 500 });
  }
}
