// GET  — fetch contract (only if sent or signed)
// POST — sign the contract
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { prisma } from '@/lib/prisma';

interface RouteContext { params: Promise<{ clientSlug: string; projectId: string }> }

function portalAuth(req: NextRequest, clientSlug: string) {
  const secret = process.env.ADMIN_PASSWORD || 'secret';
  const expected = crypto.createHmac('sha256', secret).update(clientSlug).digest('hex');
  return req.cookies.get(`pc_${clientSlug}`)?.value === expected;
}

async function getProject(projectId: string, clientSlug: string) {
  const client = await prisma.client.findUnique({ where: { slug: clientSlug }, select: { id: true } });
  if (!client) return null;
  return prisma.clientProject.findFirst({ where: { id: projectId, clientId: client.id }, select: { id: true } });
}

export async function GET(req: NextRequest, { params }: RouteContext) {
  const { clientSlug, projectId } = await params;
  if (!portalAuth(req, clientSlug)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const project = await getProject(projectId, clientSlug);
  if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const contract = await prisma.projectContract.findUnique({ where: { projectId: project.id } });
  if (!contract || contract.status === 'draft') {
    return NextResponse.json({ contract: null });
  }
  return NextResponse.json({ contract });
}

export async function POST(req: NextRequest, { params }: RouteContext) {
  const { clientSlug, projectId } = await params;
  if (!portalAuth(req, clientSlug)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const project = await getProject(projectId, clientSlug);
  if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const contract = await prisma.projectContract.findUnique({ where: { projectId: project.id } });
  if (!contract || contract.status !== 'sent') {
    return NextResponse.json({ error: 'Contract is not available for signing' }, { status: 400 });
  }

  const { signature } = await req.json();
  if (!signature?.trim()) return NextResponse.json({ error: 'Signature required' }, { status: 400 });

  const updated = await prisma.projectContract.update({
    where: { projectId: project.id },
    data: { status: 'signed', clientSignature: signature.trim(), signedAt: new Date() },
  });
  return NextResponse.json({ contract: updated });
}
