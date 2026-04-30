import { NextResponse } from 'next/server';
import { createToken } from '@/lib/emailValidator';

const ADMIN_SECRET = process.env.ADMIN_SECRET_KEY || 'Sakis@1964';

export async function POST(request: Request) {
  try {
    const { url, email, key } = await request.json();

    if (key !== ADMIN_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!url || !email) {
      return NextResponse.json({ error: 'URL and email are required' }, { status: 400 });
    }

    // Create pre-verified token
    const token = createToken(email, url, 'admin');

    // Build the shareable link
    const baseUrl = request.headers.get('origin') || request.headers.get('referer')?.replace(/\/+$/, '') || '';
    const reportLink = `${baseUrl}/report/${token}`;

    return NextResponse.json({
      success: true,
      token,
      reportLink,
    });

  } catch (error: any) {
    console.error('Admin Error:', error);
    return NextResponse.json({ error: error.message || 'Failed' }, { status: 500 });
  }
}
