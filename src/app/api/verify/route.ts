import { NextResponse } from 'next/server';
import { verifyScan, getScan } from '@/lib/emailValidator';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get('token');

  if (!token) {
    return NextResponse.json({ error: 'Token required' }, { status: 400 });
  }

  const scan = getScan(token);
  if (!scan) {
    // Redirect to main page with error
    const baseUrl = new URL(request.url).origin;
    return NextResponse.redirect(`${baseUrl}?error=expired`);
  }

  // Mark as verified
  verifyScan(token);

  // Redirect to report page
  const baseUrl = new URL(request.url).origin;
  return NextResponse.redirect(`${baseUrl}/report/${token}`);
}
