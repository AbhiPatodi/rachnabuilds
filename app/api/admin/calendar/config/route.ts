import { NextRequest, NextResponse } from 'next/server';
import { getBookingConfig, saveBookingConfig } from '@/lib/availability';

export const dynamic = 'force-dynamic';

export async function GET() {
  const config = await getBookingConfig();
  return NextResponse.json(config);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  if (!body.workHours || typeof body.slotMinutes !== 'number') {
    return NextResponse.json({ error: 'Invalid config' }, { status: 400 });
  }
  await saveBookingConfig({
    slotMinutes: body.slotMinutes,
    bufferMinutes: body.bufferMinutes,
    lookaheadDays: body.lookaheadDays,
    minNoticeHours: body.minNoticeHours,
    workHours: body.workHours,
  });
  return NextResponse.json({ ok: true });
}
