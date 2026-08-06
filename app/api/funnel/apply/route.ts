import { NextRequest, NextResponse, after } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendPushToAll } from '@/lib/webpush';
import { notifyNewLead } from '@/lib/email';

export const dynamic = 'force-dynamic';

const CHALLENGES = ['traffic_no_sales', 'low_conversion', 'poor_roas', 'cart_abandonment', 'brand_mismatch', 'other'];
const REVENUES = ['under_5k', '5k_10k', '10k_25k', '25k_50k', 'over_50k'];
const FINANCIALS = ['ready_now', 'can_invest', 'budget_challenge'];
const READINESS = ['right_now', 'within_30_days', 'later'];

const LABELS: Record<string, string> = {
  traffic_no_sales: 'Getting traffic but not enough sales',
  low_conversion: 'Low conversion rate',
  poor_roas: 'Poor ROAS',
  cart_abandonment: 'High cart abandonment',
  brand_mismatch: "Store doesn't reflect our brand",
  other: 'Other',
  under_5k: 'Under $5,000',
  '5k_10k': '$5,000–$10,000',
  '10k_25k': '$10,000–$25,000',
  '25k_50k': '$25,000–$50,000',
  over_50k: '$50,000+',
  ready_now: 'Has budget to invest immediately',
  can_invest: 'Can invest if it makes sense',
  budget_challenge: 'Budget is a major challenge',
  right_now: 'RIGHT NOW',
  within_30_days: 'Within 30 days',
  later: 'More than 30 days',
};

export async function POST(req: NextRequest) {
  try {
    const {
      name, email, whatsapp, storeUrl, role,
      challenge, revenue, blocker, financial, readiness,
      utmSource, utmMedium, utmCampaign, utmContent,
    } = await req.json();

    if (!name?.trim()) return NextResponse.json({ error: 'Full name is required' }, { status: 400 });
    if (!email?.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'A valid email is required' }, { status: 400 });
    }
    if (!whatsapp?.trim()) return NextResponse.json({ error: 'WhatsApp number is required' }, { status: 400 });
    if (!storeUrl?.trim()) return NextResponse.json({ error: 'Website / store URL is required' }, { status: 400 });
    if (!challenge || !CHALLENGES.includes(challenge)) return NextResponse.json({ error: 'Please select your biggest challenge' }, { status: 400 });
    if (!revenue || !REVENUES.includes(revenue)) return NextResponse.json({ error: 'Please select your monthly revenue' }, { status: 400 });
    if (!blocker?.trim()) return NextResponse.json({ error: 'Please tell us what is preventing your store from converting' }, { status: 400 });
    if (!financial || !FINANCIALS.includes(financial)) return NextResponse.json({ error: 'Please select your financial situation' }, { status: 400 });
    if (!readiness || !READINESS.includes(readiness)) return NextResponse.json({ error: 'Please select how soon you are ready' }, { status: 400 });

    const cleanEmail = email.trim().toLowerCase();
    const applicationData = {
      name: name.trim(),
      whatsapp: whatsapp.trim(),
      storeUrl: storeUrl.trim(),
      role: role?.trim() || null,
      challenge,
      revenue,
      blocker: blocker.trim(),
      financial,
      readiness,
      stage: 'applied',
      appliedAt: new Date(),
    };

    const lead = await prisma.funnelLead.upsert({
      where: { email: cleanEmail },
      create: {
        email: cleanEmail,
        phone: whatsapp.trim(),
        utmSource: utmSource || null,
        utmMedium: utmMedium || null,
        utmCampaign: utmCampaign || null,
        utmContent: utmContent || null,
        ...applicationData,
      },
      update: applicationData,
    });

    const isHot = readiness === 'right_now' && financial === 'ready_now';
    // See comment in booking/create/route.ts — after() keeps the function
    // alive for these instead of an unreliable fire-and-forget promise.
    after(async () => {
      await sendPushToAll(
        isHot ? '🔥 HOT Funnel Application!' : 'New Funnel Application!',
        `${name} — ${LABELS[revenue]} — ${LABELS[readiness]}`,
        '/admin/funnel-leads',
      ).catch(() => {});

      await notifyNewLead({
        source: 'VSL Funnel Application',
        fields: [
          { label: 'Name', value: name.trim() },
          { label: 'Email', value: cleanEmail },
          { label: 'WhatsApp', value: whatsapp.trim() },
          { label: 'Store URL', value: storeUrl.trim() },
          ...(role?.trim() ? [{ label: 'Role', value: role.trim() }] : []),
          { label: 'Challenge', value: LABELS[challenge] },
          { label: 'Monthly Revenue', value: LABELS[revenue] },
          { label: 'Financial Situation', value: LABELS[financial] },
          { label: 'Ready to Start', value: LABELS[readiness] },
        ],
        message: blocker.trim(),
      }).catch(() => {});
    });

    return NextResponse.json({ ok: true, id: lead.id });
  } catch (err) {
    console.error('Funnel apply error:', err);
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 });
  }
}
