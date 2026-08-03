import { NextResponse } from 'next/server';
import { isCalendarConnected, getConnectedEmail, disconnectCalendar } from '@/lib/googleCalendar';

export const dynamic = 'force-dynamic';

export async function GET() {
  const connected = await isCalendarConnected();
  const email = connected ? await getConnectedEmail() : null;
  return NextResponse.json({ connected, email });
}

export async function DELETE() {
  await disconnectCalendar();
  return NextResponse.json({ ok: true });
}
