import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { settings } = body as { settings: Record<string, string> };

  if (!settings || typeof settings !== 'object') {
    return NextResponse.json({ error: 'settings object is required' }, { status: 400 });
  }

  const entries = Object.entries(settings);
  if (entries.length === 0) {
    return NextResponse.json({ ok: true, count: 0 });
  }

  await prisma.$transaction(
    entries.map(([key, value]) =>
      prisma.setting.upsert({
        where: { key },
        update: { value: String(value) },
        create: { key, value: String(value) },
      })
    )
  );

  return NextResponse.json({ ok: true, count: entries.length });
}
