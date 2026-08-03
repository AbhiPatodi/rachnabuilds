import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendEmail } from '@/lib/email';

export const dynamic = 'force-dynamic';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(_req: NextRequest, { params }: RouteContext) {
  const { id } = await params;
  const audit = await prisma.auditReport.findUnique({ where: { id }, include: { funnelLead: true } });
  if (!audit) return NextResponse.json({ error: 'Report not found' }, { status: 404 });
  if (audit.status !== 'draft' && audit.status !== 'sent') {
    return NextResponse.json({ error: `Report is ${audit.status} — generate it first` }, { status: 400 });
  }

  const url = `https://rachnabuilds.com/audit/${audit.token}`;
  const lead = audit.funnelLead;
  const firstName = lead.name.split(' ')[0];

  const html = `
  <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;color:#0A1F13">
    <h2 style="color:#0B3D2E">Your Shopify Conversion Audit is ready, ${firstName} 🎉</h2>
    <p>I've completed the conversion audit of <strong>${audit.storeUrl}</strong>. Inside you'll find:</p>
    <ul style="line-height:1.8">
      <li>Your store's conversion scores across performance, trust, UX and SEO</li>
      <li>The specific bottlenecks costing you sales right now — with fixes</li>
      <li>A prioritized action plan</li>
    </ul>
    <p style="margin:28px 0">
      <a href="${url}" style="background:#10B981;color:#fff;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:bold">View Your Audit Report →</a>
    </p>
    <p>We'll walk through it together on our call — come with questions.</p>
    <p>— Rachna<br/>Rachna Builds · Shopify Conversion Optimization</p>
  </div>`;

  const result = await sendEmail(lead.email, `Your Shopify Conversion Audit is ready — ${audit.storeUrl}`, html);
  if (!result.ok) {
    return NextResponse.json({ error: `Email failed: ${result.reason}` }, { status: 500 });
  }

  await prisma.auditReport.update({ where: { id }, data: { status: 'sent', sentAt: new Date() } });
  return NextResponse.json({ ok: true, url });
}
