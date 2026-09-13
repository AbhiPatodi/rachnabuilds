// Test push triggered from the admin UI. Auth comes from the admin_session
// cookie via proxy.ts, which guards every /api/admin/* path.
import { NextResponse } from 'next/server';
import { sendPushToAll } from '@/lib/webpush';

export const dynamic = 'force-dynamic';

export async function POST() {
  await sendPushToAll(
    '⚡ Test notification',
    'If you can read this, lead alerts will reach this device.',
    '/admin/funnel-leads',
  );
  return NextResponse.json({ ok: true });
}
