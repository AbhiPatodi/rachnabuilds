import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { isAdmin, isClientSession } from '@/lib/auth';

interface RouteContext { params: Promise<{ clientSlug: string; projectId: string }> }

async function isAdminSession() {
  return isAdmin();
}

async function verifyPortalCookie(_req: NextRequest, clientSlug: string): Promise<boolean> {
  return isClientSession(clientSlug);
}

export async function GET(req: NextRequest, { params }: RouteContext) {
  const { clientSlug, projectId } = await params;
  const authed = (await verifyPortalCookie(req, clientSlug)) || await isAdminSession();
  if (!authed) return NextResponse.json({ links: [] });

  const client = await prisma.client.findUnique({ where: { slug: clientSlug }, select: { id: true } });
  if (!client) return NextResponse.json({ links: [] });
  const project = await prisma.clientProject.findFirst({
    where: { id: projectId, clientId: client.id },
    select: { tabConfig: true },
  });
  const cfg = (project?.tabConfig as Record<string, unknown>) ?? {};
  return NextResponse.json({ links: cfg.buildLinks ?? [] });
}
