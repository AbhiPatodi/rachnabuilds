// POST — client accepts the proposal
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { prisma } from '@/lib/prisma';
import { notifyProposalAccepted } from '@/lib/email';

interface RouteContext { params: Promise<{ clientSlug: string; projectId: string }> }

function portalAuth(req: NextRequest, clientSlug: string) {
  const secret = process.env.ADMIN_PASSWORD || 'secret';
  const expected = crypto.createHmac('sha256', secret).update(clientSlug).digest('hex');
  return req.cookies.get(`pc_${clientSlug}`)?.value === expected;
}

export async function POST(req: NextRequest, { params }: RouteContext) {
  const { clientSlug, projectId } = await params;
  if (!portalAuth(req, clientSlug)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const client = await prisma.client.findUnique({ where: { slug: clientSlug }, select: { id: true, name: true } });
  if (!client) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const project = await prisma.clientProject.findFirst({
    where: { id: projectId, clientId: client.id },
    select: { id: true, name: true, adminProfile: true },
  });
  if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const { name } = await req.json();
  if (!name?.trim()) return NextResponse.json({ error: 'Name required' }, { status: 400 });

  const current = (project.adminProfile ?? {}) as Record<string, unknown>;
  if (current.proposalAcceptedAt) {
    return NextResponse.json({ error: 'Proposal already accepted' }, { status: 409 });
  }

  const updated = await prisma.clientProject.update({
    where: { id: project.id },
    data: {
      adminProfile: {
        ...current,
        proposalAcceptedAt: new Date().toISOString(),
        proposalAcceptedBy: name.trim(),
      },
    },
    select: { adminProfile: true },
  });

  const profile = updated.adminProfile as Record<string, unknown>;

  // Fire-and-forget: notify Rachna that the proposal was accepted
  notifyProposalAccepted(
    project.name,
    client.name,
    name.trim(),
    `https://rachnabuilds.com/admin/projects/${project.id}`,
  ).catch(console.error);

  return NextResponse.json({
    success: true,
    acceptedAt: profile.proposalAcceptedAt,
    acceptedBy: profile.proposalAcceptedBy,
  });
}
