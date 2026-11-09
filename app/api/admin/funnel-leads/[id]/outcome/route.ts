import { NextRequest, NextResponse } from 'next/server';
import { applyOutcome, OUTCOMES } from '@/lib/leadStatus';
import { currentSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

/** One-tap outcome from the lead page: logs it, moves the status, sets the
 *  next follow-up date (see OUTCOMES in lib/leadStatus). */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { outcome, actor, auto } = await req.json().catch(() => ({}));
  const session = await currentSession();
  if (!OUTCOMES[outcome]) return NextResponse.json({ error: `outcome must be one of: ${Object.keys(OUTCOMES).join(', ')}` }, { status: 400 });
  try {
    const lead = await applyOutcome(id, outcome, actor || session?.name || null, !!auto);
    return NextResponse.json({ ok: true, lead });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'failed';
    return NextResponse.json({ error: msg }, { status: msg === 'not found' ? 404 : 500 });
  }
}
