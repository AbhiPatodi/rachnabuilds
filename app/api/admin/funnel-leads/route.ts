import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { randomBytes } from 'crypto';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status');
  const stage = searchParams.get('stage');

  const leads = await prisma.funnelLead.findMany({
    where: {
      ...(status ? { status } : {}),
      ...(stage ? { stage } : {}),
    },
    orderBy: { createdAt: 'desc' },
    include: {
      auditReports: {
        orderBy: { createdAt: 'desc' },
        take: 1,
        select: { id: true, status: true, token: true, error: true, updatedAt: true },
      },
    },
  });

  // Attach VSL watch progress (a lead may have several sessions — aggregate)
  const watches = await prisma.videoWatch.findMany({
    where: { email: { in: leads.map((l) => l.email) } },
  });
  const watchByEmail = new Map<string, { secondsWatched: number; maxPosition: number; duration: number }>();
  for (const w of watches) {
    if (!w.email) continue;
    const cur = watchByEmail.get(w.email) || { secondsWatched: 0, maxPosition: 0, duration: 0 };
    watchByEmail.set(w.email, {
      secondsWatched: cur.secondsWatched + w.secondsWatched,
      maxPosition: Math.max(cur.maxPosition, w.maxPosition),
      duration: Math.max(cur.duration, w.duration),
    });
  }

  return NextResponse.json(leads.map((l) => ({
    ...l,
    hasCallScript: !!l.callScript,
    callScript: undefined,
    videoWatch: watchByEmail.get(l.email) || null,
  })));
}

/** Manual entry — Upwork, referrals, direct WhatsApp, LinkedIn. Email is unique+required
 *  in the schema, so a phone-only lead gets a synthetic one that the UI hides. */
const MANUAL = new Set(['upwork', 'referral', 'direct', 'linkedin', 'instagram', 'other']);
export async function POST(req: NextRequest) {
  const b = await req.json().catch(() => ({}));
  const name = String(b.name || '').trim();
  const phone = String(b.phone || '').trim() || null;
  let email = String(b.email || '').trim().toLowerCase();
  const source = MANUAL.has(String(b.source)) ? String(b.source) : 'other';
  if (!name) return NextResponse.json({ error: 'name required' }, { status: 400 });
  if (!email && !phone) return NextResponse.json({ error: 'email or phone required' }, { status: 400 });
  if (!email) email = `${(phone || name).replace(/[^a-z0-9]/gi, '').toLowerCase() || randomBytes(4).toString('hex')}@no-email.local`;
  const existing = await prisma.funnelLead.findUnique({ where: { email } });
  if (existing) return NextResponse.json({ error: 'A lead with this email already exists', id: existing.id }, { status: 409 });
  let storeUrl = String(b.storeUrl || '').trim() || null;
  if (storeUrl && !/^https?:\/\//.test(storeUrl)) storeUrl = `https://${storeUrl}`;
  const detail = String(b.detail || '').trim() || null;
  const lead = await prisma.funnelLead.create({
    data: {
      name, email, phone, whatsapp: phone, storeUrl,
      stage: 'applied', status: 'new',
      utmSource: source, utmMedium: 'manual', utmCampaign: detail,
      notes: String(b.notes || '').trim() || null,
    },
  });
  await prisma.leadActivity.create({
    data: { id: 'act_' + randomBytes(10).toString('hex'), leadId: lead.id, type: 'system', text: `➕ Added manually — ${source}${detail ? ` · ${detail}` : ''}` },
  }).catch(() => {});
  return NextResponse.json({ ok: true, id: lead.id });
}
