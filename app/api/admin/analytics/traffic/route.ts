// GET /api/admin/analytics/traffic — GA4 website traffic snapshot for the
// admin Analytics page. POST saves the GA4 numeric property id manually.
import { NextRequest, NextResponse } from 'next/server';
import { getTrafficSnapshot, savePropertyId } from '@/lib/googleAnalytics';

export const dynamic = 'force-dynamic';

export async function GET() {
  const result = await getTrafficSnapshot(28);
  return NextResponse.json(result);
}

export async function POST(req: NextRequest) {
  try {
    const { propertyId } = await req.json();
    if (!propertyId || typeof propertyId !== 'string') {
      return NextResponse.json({ error: 'propertyId is required' }, { status: 400 });
    }
    await savePropertyId(propertyId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed' }, { status: 400 });
  }
}
