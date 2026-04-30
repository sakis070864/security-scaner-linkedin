import { NextResponse } from 'next/server';
import { getScan } from '@/lib/emailValidator';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  if (!token) {
    return NextResponse.json({ error: 'Token required' }, { status: 400 });
  }

  const scan = getScan(token);
  if (!scan) {
    return NextResponse.json({ error: 'Report not found or expired' }, { status: 404 });
  }

  if (!scan.verified) {
    return NextResponse.json({ error: 'Report not yet verified. Please check your email.' }, { status: 403 });
  }

  return NextResponse.json({
    result: scan.result,
    email: scan.email,
    url: scan.url,
  });
}
