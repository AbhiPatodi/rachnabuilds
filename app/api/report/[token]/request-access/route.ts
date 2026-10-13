// A visitor asking for a revoked Store Health Report back. Emails Rachna and
// logs it on the CRM lead's timeline so the ask is not just an email.
// Public by design (the token is the only credential), so it is rate-limited
// per token and the body is length-capped.
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendEmail } from '@/lib/email';
import { sendPushToAll } from '@/lib/webpush';

export const dynamic = 'force-dynamic';

const ADMIN_EMAIL = 'hello@rachnabuilds.com';
const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));

export async function POST(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  const report = await prisma.storeProofReport.findUnique({
    where: { publicToken: token },
    select: { id: true, storeName: true, host: true, status: true, funnelLeadId: true },
  });
  if (!report) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const name = String(body.name || '').trim().slice(0, 120);
  const contact = String(body.contact || '').trim().slice(0, 160);
  const note = String(body.note || '').trim().slice(0, 800);
  if (!contact) return NextResponse.json({ error: 'contact required' }, { status: 400 });

  // One request per token per 10 minutes — the token is the only credential.
  const recent = await prisma.rateLimitHit.findFirst({
    where: { key: `report-access:${token}`, createdAt: { gt: new Date(Date.now() - 10 * 60_000) } },
  }).catch(() => null);
  if (recent) return NextResponse.json({ ok: true, deduped: true });
  await prisma.rateLimitHit.create({ data: { key: `report-access:${token}` } }).catch(() => {});

  const who = name ? `${name} (${contact})` : contact;
  const html = `
    <p><b>${esc(who)}</b> asked for access to the <b>${esc(report.storeName)}</b> report
    (${esc(report.host)}), which is currently hidden.</p>
    ${note ? `<p><i>“${esc(note)}”</i></p>` : ''}
    <p>Reply to them directly, then un-hide it in Admin → StoreProof if you want them to have it.</p>`;

  await sendEmail(ADMIN_EMAIL, `🔑 Report access requested — ${report.storeName}`, html).catch(() => {});
  await sendPushToAll(
    '🔑 Report access requested',
    `${report.storeName} — ${who}`,
    '/admin/storeproof',
  ).catch(() => {});

  if (report.funnelLeadId) {
    await prisma.leadActivity.create({
      data: {
        leadId: report.funnelLeadId,
        type: 'note',
        text: `🔑 Asked for access to the hidden ${report.storeName} report — ${who}${note ? ` · “${note}”` : ''}`,
      },
    }).catch(() => {});
  }

  return NextResponse.json({ ok: true });
}
