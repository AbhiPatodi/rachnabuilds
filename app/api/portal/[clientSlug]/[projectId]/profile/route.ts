// PATCH /api/portal/[clientSlug]/[projectId]/profile
// Authenticated portal route — lets the client save their own contact info into adminProfile
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import crypto from 'crypto';
import { prisma } from '@/lib/prisma';

interface RouteParams {
  params: Promise<{ clientSlug: string; projectId: string }>;
}

const CLIENT_KEYS = ['clientEmail', 'clientPhone', 'clientWhatsapp', 'clientWebsite', 'clientInstagram'] as const;

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const { clientSlug, projectId } = await params;

  // Auth check
  const store = await cookies();
  const secret = process.env.ADMIN_PASSWORD || 'secret';
  const expected = crypto.createHmac('sha256', secret).update(clientSlug).digest('hex');
  const portalCookie = store.get(`pc_${clientSlug}`)?.value;
  const adminSession = store.get('admin_session')?.value;
  const adminHash = crypto.createHash('sha256').update(process.env.ADMIN_PASSWORD || '').digest('hex');
  const isAdmin = adminSession === adminHash;

  if (portalCookie !== expected && !isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Validate client + project ownership
  const client = await prisma.client.findUnique({ where: { slug: clientSlug }, select: { id: true } });
  if (!client) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const project = await prisma.clientProject.findFirst({
    where: { id: projectId, clientId: client.id },
    select: { id: true, adminProfile: true },
  });
  if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const body = await req.json();

  // Only allow whitelisted client-facing keys
  const updates: Record<string, string> = {};
  for (const key of CLIENT_KEYS) {
    if (typeof body[key] === 'string') {
      updates[key] = body[key];
    }
  }

  // Merge into existing adminProfile
  const existing = (project.adminProfile as Record<string, unknown>) ?? {};
  const merged = { ...existing, ...updates };

  await prisma.clientProject.update({
    where: { id: project.id },
    data: { adminProfile: merged },
  });

  return NextResponse.json({ ok: true });
}
