import { NextResponse } from 'next/server';
import { performDeepScan } from '@/lib/scanner';
import { isCorporateEmail, generateToken, storeScan } from '@/lib/emailValidator';
import { sendVerificationEmail } from '@/lib/mailer';

export async function POST(request: Request) {
  try {
    const { url, email } = await request.json();

    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }
    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Valid email is required' }, { status: 400 });
    }

    const corporate = isCorporateEmail(email);
    const token = generateToken();

    // Run the deep scan
    const result = await performDeepScan(url);

    // Store results with token
    storeScan(token, email, url, result, corporate ? 'corporate' : 'free');

    // If corporate email → send verification email
    if (corporate) {
      try {
        const baseUrl = request.headers.get('origin') || request.headers.get('referer')?.replace(/\/+$/, '') || '';
        const verifyLink = `${baseUrl}/api/verify?token=${token}`;
        await sendVerificationEmail(email, url, verifyLink);
      } catch (mailErr) {
        console.error('Failed to send verification email:', mailErr);
      }
    }

    // Return partial results (frontend will blur based on email type)
    return NextResponse.json({
      token,
      emailType: corporate ? 'corporate' : 'free',
      result, // Full result sent — frontend handles blur display
    });

  } catch (error: any) {
    console.error('Deep Scan Error:', error);
    return NextResponse.json(
      { error: error.message || 'An unexpected error occurred during the scan.' },
      { status: 500 }
    );
  }
}
