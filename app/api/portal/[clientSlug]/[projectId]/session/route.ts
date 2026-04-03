import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { prisma } from '@/lib/prisma';

interface RouteContext { params: Promise<{ clientSlug: string; projectId: string }> }

function getIp(req: NextRequest): string {
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
  if (!ip || ip === '0.0.0.0' || ip.startsWith('127.') || ip.startsWith('192.168.') || ip.startsWith('10.') || ip === '::1' || ip.startsWith('172.')) {
    return { country: '', countryCode: '', city: '' };
  }
  try {
    const res = await fetch(`http://ip-api.com/json/${ip}?fields=status,country,countryCode,city`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return { country: '', countryCode: '', city: '' };
    const data = await res.json();
    if (data.status !== 'success') return { country: '', countryCode: '', city: '' };
    return { country: data.country || '', countryCode: data.countryCode || '', city: data.city || '' };
  } catch {
    return { country: '', countryCode: '', city: '' };
  }
}

function auth(req: NextRequest, clientSlug: string): boolean {
  const secret = process.env.ADMIN_PASSWORD || 'secret';
  const expected = crypto.createHmac('sha256', secret).update(clientSlug).digest('hex');
  return req.cookies.get(`pc_${clientSlug}`)?.value === expected;
}

async function getProject(projectId: string, clientSlug: string) {
  const client = await prisma.client.findUnique({ where: { slug: clientSlug }, select: { id: true } });
  if (!client) return null;
  return prisma.clientProject.findFirst({
    where: { id: projectId, clientId: client.id },
    select: { id: true },
  });
}

// POST — create or confirm session (called on portal mount)
export async function POST(req: NextRequest, { params }: RouteContext) {
  const { clientSlug, projectId } = await params;
  if (!auth(req, clientSlug)) return NextResponse.json({ ok: false }, { status: 401 });

  let body: { sessionId: string; userAgent?: string };
  try {
    const text = await req.text();
    body = JSON.parse(text);
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { sessionId, userAgent = '' } = body;
  if (!sessionId) return NextResponse.json({ error: 'sessionId required' }, { status: 400 });

  const project = await getProject(projectId, clientSlug);
  if (!project) return NextResponse.json({ ok: false }, { status: 404 });

  const existing = await prisma.projectSession.findUnique({ where: { sessionId } });
  if (existing) {
    await prisma.projectSession.update({
      where: { sessionId },
      data: { lastActiveAt: new Date() },
    });
    return NextResponse.json({ ok: true, returning: true });
  }

  const ip = getIp(req);
  const [geo, ua] = await Promise.all([
    geolocate(ip),
    Promise.resolve(parseUserAgent(userAgent)),
  ]);

  await prisma.projectSession.upsert({
    where: { sessionId },
    create: {
      id: crypto.randomBytes(12).toString('hex'),
      projectId: project.id,
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
  const { clientSlug } = await params;
  if (!auth(req, clientSlug)) return NextResponse.json({ ok: false }, { status: 401 });

  let body: { sessionId: string; duration: number };
  try {
    const text = await req.text();
    body = JSON.parse(text);
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { sessionId, duration } = body;
  if (!sessionId || typeof duration !== 'number') {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 });
  }

  await prisma.projectSession.updateMany({
    where: { sessionId },
    data: { totalDuration: Math.round(duration), lastActiveAt: new Date() },
  });

  return NextResponse.json({ ok: true });
}
