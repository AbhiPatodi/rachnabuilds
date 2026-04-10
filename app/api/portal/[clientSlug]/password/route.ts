// PATCH /api/portal/[clientSlug]/password — client self-service password change
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';

interface RouteContext { params: Promise<{ clientSlug: string }> }

function verifyPortalCookie(req: NextRequest, clientSlug: string) {
  const secret = process.env.ADMIN_PASSWORD;
  if (!secret) return false;
  const expected = crypto.createHmac('sha256', secret).update(clientSlug).digest('hex');
  return req.cookies.get(`pc_${clientSlug}`)?.value === expected;
}

export async function PATCH(req: NextRequest, { params }: RouteContext) {
  const { clientSlug } = await params;
  if (!verifyPortalCookie(req, clientSlug)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { currentPassword, newPassword } = await req.json();

  if (!currentPassword?.trim() || !newPassword?.trim()) {
    return NextResponse.json({ error: 'currentPassword and newPassword are required' }, { status: 400 });
  }
  if (newPassword.trim().length < 6) {
    return NextResponse.json({ error: 'New password must be at least 6 characters' }, { status: 400 });
  }

  const client = await prisma.client.findUnique({
    where: { slug: clientSlug },
    select: { id: true, passwordHash: true, clientProfile: true },
  });
  if (!client) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const valid = await bcrypt.compare(currentPassword.trim(), client.passwordHash);
  if (!valid) return NextResponse.json({ error: 'Current password is incorrect' }, { status: 400 });

  const newHash = await bcrypt.hash(newPassword.trim(), 10);
  const existingProfile = (client.clientProfile as Record<string, unknown>) ?? {};

  await prisma.client.update({
    where: { id: client.id },
    data: {
      passwordHash: newHash,
      clientProfile: { ...existingProfile, portalPassword: newPassword.trim() },
    },
  });

  return NextResponse.json({ ok: true });
}
