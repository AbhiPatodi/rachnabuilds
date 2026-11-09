import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getPipelineSettings } from '@/lib/team';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json(await getPipelineSettings());
}

/** Admin only (proxy.ts blocks reps from anything but GET). */
export async function PUT(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const writes: Promise<unknown>[] = [];
  if (body.assignMethod !== undefined) {
    if (!['off', 'round_robin', 'fewest_open'].includes(body.assignMethod)) return NextResponse.json({ error: 'bad assignMethod' }, { status: 400 });
    writes.push(prisma.setting.upsert({ where: { key: 'lead_assign_method' }, update: { value: body.assignMethod }, create: { key: 'lead_assign_method', value: body.assignMethod } }));
  }
  if (body.subStatus !== undefined) {
    if (typeof body.subStatus !== 'object' || Array.isArray(body.subStatus)) return NextResponse.json({ error: 'bad subStatus' }, { status: 400 });
    const clean: Record<string, string[]> = {};
    for (const [k, v] of Object.entries(body.subStatus)) {
      if (Array.isArray(v)) clean[k] = v.map((x) => String(x).trim().slice(0, 60)).filter(Boolean).slice(0, 20);
    }
    const value = JSON.stringify(clean);
    writes.push(prisma.setting.upsert({ where: { key: 'lead_substatus_options' }, update: { value }, create: { key: 'lead_substatus_options', value } }));
  }
  await Promise.all(writes);
  return NextResponse.json(await getPipelineSettings());
}
