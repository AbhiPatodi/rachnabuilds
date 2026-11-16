// Every 10 min (Vercel Cron): pick up email replies from leads. See lib/leadReplies.
import { NextRequest, NextResponse } from 'next/server';
import { safeEqual } from '@/lib/auth';
import { checkLeadReplies } from '@/lib/leadReplies';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  if (!process.env.CRON_SECRET || !safeEqual(req.headers.get('authorization'), `Bearer ${process.env.CRON_SECRET}`)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    return NextResponse.json({ ok: true, ...(await checkLeadReplies()) });
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message });
  }
}
