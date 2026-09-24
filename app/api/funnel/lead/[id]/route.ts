import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

interface RouteContext {
  params: Promise<{ id: string }>;
}

// Public by design (magic links in follow-up emails restore a lead's session),
// but lead ids leak through optin/apply responses and teaser URLs — so this
// must never return raw contact PII. Masked values are enough for the UI to
// greet the lead and gate the funnel; forms re-collect anything they submit.
const maskEmail = (e: string) => {
  const [u, d] = e.split('@');
  return d ? `${u.slice(0, 1)}***@${d}` : '***';
};
const maskPhone = (p: string | null) => (p ? `•••${p.slice(-2)}` : null);

export async function GET(_req: NextRequest, { params }: RouteContext) {
  const { id } = await params;
  const lead = await prisma.funnelLead.findUnique({
    where: { id },
    select: { id: true, name: true, email: true, phone: true, whatsapp: true, stage: true },
  });
  if (!lead) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({
    id: lead.id,
    name: lead.name,
    stage: lead.stage,
    email: null,
    phone: null,
    whatsapp: null,
    emailMasked: maskEmail(lead.email),
    phoneMasked: maskPhone(lead.whatsapp || lead.phone),
  });
}
