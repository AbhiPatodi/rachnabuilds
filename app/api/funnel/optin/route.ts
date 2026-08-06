import { NextRequest, NextResponse, after } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendPushToAll } from '@/lib/webpush';
import { notifyNewLead } from '@/lib/email';
import { sendMetaCapiEvent, clientIpFromHeaders } from '@/lib/metaCapi';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { name, email, phone, profession, utmSource, utmMedium, utmCampaign, utmContent, metaEventId } = await req.json();

    if (!name?.trim()) return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    if (!email?.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'A valid email is required' }, { status: 400 });
    }
    if (!phone?.trim()) return NextResponse.json({ error: 'Phone is required' }, { status: 400 });

    const cleanEmail = email.trim().toLowerCase();

    const lead = await prisma.funnelLead.upsert({
      where: { email: cleanEmail },
      create: {
        name: name.trim(),
        email: cleanEmail,
        phone: phone.trim(),
        profession: profession?.trim() || null,
        utmSource: utmSource || null,
        utmMedium: utmMedium || null,
        utmCampaign: utmCampaign || null,
        utmContent: utmContent || null,
      },
      update: {
        name: name.trim(),
        phone: phone.trim(),
        profession: profession?.trim() || null,
      },
    });

    // See comment in booking/create/route.ts — after() keeps the function
    // alive for these instead of an unreliable fire-and-forget promise.
    const fbp = req.cookies.get('_fbp')?.value;
    const fbc = req.cookies.get('_fbc')?.value;
    const clientIp = clientIpFromHeaders(req.headers);
    const userAgent = req.headers.get('user-agent') || undefined;
    after(async () => {
      await sendPushToAll('VSL Opt-in!', `${name} (${cleanEmail}) unlocked the training`, '/admin/funnel-leads').catch(() => {});
      await notifyNewLead({
        source: 'VSL Funnel Opt-in',
        fields: [
          { label: 'Name', value: name.trim() },
          { label: 'Email', value: cleanEmail },
          { label: 'Phone', value: phone.trim() },
          ...(profession?.trim() ? [{ label: 'Profession', value: profession.trim() }] : []),
        ],
      }).catch(() => {});
      if (metaEventId) {
        await sendMetaCapiEvent({
          eventName: 'Lead',
          eventId: metaEventId,
          eventSourceUrl: 'https://rachnabuilds.com/training',
          email: cleanEmail,
          phone: phone.trim(),
          fbp, fbc,
          clientIpAddress: clientIp,
          clientUserAgent: userAgent,
        }).catch(() => {});
      }
    });

    return NextResponse.json({ ok: true, id: lead.id });
  } catch (err) {
    console.error('Funnel opt-in error:', err);
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 });
  }
}
