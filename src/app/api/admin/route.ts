import { NextResponse } from 'next/server';
import { performDeepScan } from '@/lib/scanner';
import { generateToken, storeScan } from '@/lib/emailValidator';

const ADMIN_SECRET = process.env.ADMIN_SECRET_KEY || 'Sakis@1964';

export async function POST(request: Request) {
  try {
    const { url, email, key } = await request.json();

    // Verify admin key
    if (key !== ADMIN_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!url || !email) {
      return NextResponse.json({ error: 'URL and email are required' }, { status: 400 });
    }

    // Run deep scan
    const result = await performDeepScan(url);

    // Generate pre-verified token (admin links are auto-verified)
    const token = generateToken();
    storeScan(token, email, url, result, 'admin');

    // Build the shareable link
    const baseUrl = request.headers.get('origin') || request.headers.get('referer')?.replace(/\/+$/, '') || '';
    const reportLink = `${baseUrl}/report/${token}`;

    return NextResponse.json({
      success: true,
      token,
      reportLink,
      grade: result.grade,
      score: result.score,
    });

  } catch (error: any) {
    console.error('Admin Scan Error:', error);
    return NextResponse.json(
      { error: error.message || 'Scan failed' },
      { status: 500 }
    );
  }
}
