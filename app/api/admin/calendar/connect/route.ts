import { NextResponse } from 'next/server';
import { getAuthUrl } from '@/lib/googleCalendar';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const url = getAuthUrl();
    return NextResponse.redirect(url);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed to start OAuth' }, { status: 500 });
  }
}
