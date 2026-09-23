// Queue a StoreProof audit for a lead (admin-triggered, WhatsApp flow).
// The worker runs it; the lead is NOT emailed — Rachna shares the link
// personally. Auth: admin_session via proxy.ts.
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));

  const lead = await prisma.funnelLead.findUnique({ where: { id } });
  if (!lead) return NextResponse.json({ error: 'Lead not found' }, { status: 404 });

  // Store URL: from the request (admin just typed it) or already on the lead
  const rawUrl = String(body.storeUrl || lead.storeUrl || '').trim();
  if (!rawUrl) return NextResponse.json({ error: 'storeUrl required' }, { status: 400 });
  const normalizedUrl = rawUrl.startsWith('http') ? rawUrl : `https://${rawUrl}`;
  let host: string;
  try { host = new URL(normalizedUrl).hostname.replace(/^www\./, ''); } catch {
    return NextResponse.json({ error: 'Invalid store URL' }, { status: 400 });
  }

  if (rawUrl !== lead.storeUrl) {
    await prisma.funnelLead.update({ where: { id }, data: { storeUrl: normalizedUrl } });
  }

  const pending = await prisma.storeProofJob.findFirst({
    where: { host, status: { in: ['queued', 'running'] } },
  });
  if (pending) {
    return NextResponse.json({ ok: true, jobId: pending.id, status: pending.status, deduped: true });
  }

  const job = await prisma.storeProofJob.create({
    data: {
      storeUrl: normalizedUrl, host,
      name: lead.name, email: lead.email,
      funnelLeadId: lead.id,
      emailLead: false, // WhatsApp is the channel — no automated email
    },
  });
  await prisma.leadActivity.create({
    data: { leadId: lead.id, type: 'system', text: `Store audit queued for ${host}` },
  }).catch(() => {});

  return NextResponse.json({ ok: true, jobId: job.id, status: 'queued' });
}
