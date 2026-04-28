import { NextResponse } from 'next/server';
import { performScan } from '@/lib/scanner';

export async function POST(request: Request) {
  try {
    const { url } = await request.json();

    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    const result = await performScan(url);
    return NextResponse.json(result);

  } catch (error: any) {
    console.error('Scan Error:', error);
    return NextResponse.json(
      { error: error.message || 'An unexpected error occurred during the scan.' },
      { status: 500 }
    );
  }
}
