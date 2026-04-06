// GET   — fetch all sent/signed contracts for this project
// POST  — sign a specific phase contract
// PATCH — submit a payment receipt URL (advance or balance) for a phase
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { prisma } from '@/lib/prisma';
import { notifyContractSigned } from '@/lib/email';

interface RouteContext { params: Promise<{ clientSlug: string; projectId: string }> }

function portalAuth(req: NextRequest, clientSlug: string) {
  const secret = process.env.ADMIN_PASSWORD;
  if (!secret) return false;
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

  const contracts = await prisma.projectContract.findMany({
    where: {
      projectId: project.id,
      status: { in: ['sent', 'signed'] },
    },
    orderBy: { phase: 'asc' },
  });

  return NextResponse.json({ contracts });
}

export async function POST(req: NextRequest, { params }: RouteContext) {
  const { clientSlug, projectId } = await params;
  if (!portalAuth(req, clientSlug)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const project = await getProject(projectId, clientSlug);
  if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const { signature, phase = 1 } = await req.json();
  if (!signature?.trim()) return NextResponse.json({ error: 'Signature required' }, { status: 400 });

  // If this is phase > 1, ensure previous phase is already signed
  if (phase > 1) {
    const previousPhase = await prisma.projectContract.findUnique({
      where: { projectId_phase: { projectId: project.id, phase: phase - 1 } },
    });
    if (!previousPhase || previousPhase.status !== 'signed') {
      return NextResponse.json({
        error: `Phase ${phase - 1} must be signed before you can sign Phase ${phase}`,
      }, { status: 400 });
    }
  }

  const contract = await prisma.projectContract.findUnique({
    where: { projectId_phase: { projectId: project.id, phase } },
  });
  if (!contract || contract.status !== 'sent') {
    return NextResponse.json({ error: 'Contract is not available for signing' }, { status: 400 });
  }

  const signedAt = new Date();
  const updated = await prisma.projectContract.update({
    where: { projectId_phase: { projectId: project.id, phase } },
    data: { status: 'signed', clientSignature: signature.trim(), signedAt },
  });

  // Fire-and-forget: notify Rachna that client signed
  try {
    const proj = await prisma.clientProject.findUnique({
      where: { id: project.id },
      include: { client: true },
    });
    if (proj) {
      const adminUrl = `https://rachnabuilds.com/admin/projects/${project.id}`;
      notifyContractSigned(
        proj.client.name,
        proj.name,
        phase,
        contract.phaseLabel,
        signedAt,
        adminUrl,
      ).catch(console.error);
    }
  } catch {}

  return NextResponse.json({ contract: updated });
}

export async function PATCH(req: NextRequest, { params }: RouteContext) {
  const { clientSlug, projectId } = await params;
  if (!portalAuth(req, clientSlug)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const project = await getProject(projectId, clientSlug);
  if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const url = new URL(req.url);
  const phase = parseInt(url.searchParams.get('phase') ?? '1', 10);

  const body = await req.json();
  const data: Record<string, unknown> = {};
  if (body.advanceReceiptUrl !== undefined) data.advanceReceiptUrl = body.advanceReceiptUrl;
  if (body.balanceReceiptUrl !== undefined) data.balanceReceiptUrl = body.balanceReceiptUrl;

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });
  }

  const contract = await prisma.projectContract.update({
    where: { projectId_phase: { projectId: project.id, phase } },
    data,
  });
  return NextResponse.json({ contract });
}
