import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { prisma } from '@/lib/prisma';

interface RouteContext { params: Promise<{ slug: string }> }

function getIp(req: NextRequest): string {
  // x-vercel-forwarded-for is set by Vercel to the real client IP
  return (
    req.headers.get('x-vercel-forwarded-for') ||
    req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    req.headers.get('x-real-ip') ||
    '0.0.0.0'
  );
}

function parseUserAgent(ua: string): { device: string; browser: string } {
  const tablet = /tablet|ipad/i.test(ua);
  const mobile = !tablet && /mobile|android|iphone/i.test(ua);
  const device = tablet ? 'tablet' : mobile ? 'mobile' : 'desktop';

  let browser = 'Unknown';
  if (/edg\//i.test(ua)) browser = 'Edge';
  else if (/chrome|chromium/i.test(ua)) browser = 'Chrome';
  else if (/firefox/i.test(ua)) browser = 'Firefox';
  else if (/safari/i.test(ua) && !/chrome/i.test(ua)) browser = 'Safari';
  else if (/opera|opr/i.test(ua)) browser = 'Opera';

  return { device, browser };
}

async function geolocate(ip: string): Promise<{ country: string; countryCode: string; city: string }> {
  // Skip loopback / private IPs
  if (!ip || ip === '0.0.0.0' || ip.startsWith('127.') || ip.startsWith('192.168.') || ip.startsWith('10.') || ip === '::1' || ip.startsWith('172.')) {
    return { country: '', countryCode: '', city: '' };
  }
  try {
    // ip-api.com: free, no auth, works from server/datacenter IPs (45 req/min)
    const res = await fetch(`http://ip-api.com/json/${ip}?fields=status,country,countryCode,city`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return { country: '', countryCode: '', city: '' };
    const data = await res.json();
    if (data.status !== 'success') return { country: '', countryCode: '', city: '' };
    return {
      country: data.country || '',
      countryCode: data.countryCode || '',
      city: data.city || '',
    };
  } catch {
    return { country: '', countryCode: '', city: '' };
  }
}

function auth(req: NextRequest, slug: string): boolean {
  const secret = process.env.ADMIN_PASSWORD || 'secret';
  const expected = crypto.createHmac('sha256', secret).update(slug).digest('hex');
  return req.cookies.get(`rp_${slug}`)?.value === expected;
}

// POST — create or confirm session (called on portal mount)
export async function POST(req: NextRequest, { params }: RouteContext) {
  const { slug } = await params;
  if (!auth(req, slug)) return NextResponse.json({ ok: false }, { status: 401 });

  let body: { sessionId: string; userAgent?: string };
  try {
    const text = await req.text();
    body = JSON.parse(text);
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { sessionId, userAgent = '' } = body;
  if (!sessionId) return NextResponse.json({ error: 'sessionId required' }, { status: 400 });

  const report = await prisma.report.findUnique({ where: { slug }, select: { id: true } });
  if (!report) return NextResponse.json({ ok: false }, { status: 404 });

  // Check if session already exists (return visit)
  const existing = await prisma.portalSession.findUnique({ where: { sessionId } });
  if (existing) {
    // Update lastActiveAt to mark return
    await prisma.portalSession.update({
      where: { sessionId },
      data: { lastActiveAt: new Date() },
    });
    return NextResponse.json({ ok: true, returning: true });
  }

  // New session — geolocate and parse UA
  const ip = getIp(req);
  const [geo, ua] = await Promise.all([
    geolocate(ip),
    Promise.resolve(parseUserAgent(userAgent)),
  ]);

  await prisma.portalSession.upsert({
    where: { sessionId },
    create: {
      id: crypto.randomBytes(12).toString('hex'),
      reportId: report.id,
      sessionId,
      ip,
      country: geo.country,
      countryCode: geo.countryCode,
      city: geo.city,
      device: ua.device,
      browser: ua.browser,
    },
    update: { lastActiveAt: new Date() },
  });

  return NextResponse.json({ ok: true, returning: false });
}

// PATCH — update session duration (called every 30s + on unload via sendBeacon)
export async function PATCH(req: NextRequest, { params }: RouteContext) {
  const { slug } = await params;
  if (!auth(req, slug)) return NextResponse.json({ ok: false }, { status: 401 });

  let body: { sessionId: string; duration: number };
  try {
    const text = await req.text();
    body = JSON.parse(text);
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { sessionId, duration } = body;
  if (!sessionId || typeof duration !== 'number') return NextResponse.json({ error: 'Bad request' }, { status: 400 });

  await prisma.portalSession.updateMany({
    where: { sessionId },
    data: { totalDuration: Math.round(duration), lastActiveAt: new Date() },
  });

  return NextResponse.json({ ok: true });
}
