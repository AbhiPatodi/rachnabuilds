// GET    — fetch all contracts for project (array)
// POST   — create a new phase contract
// PATCH  — update content/status for a specific phase (?phase=N)
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { notifyContractReady } from '@/lib/email';

interface RouteContext { params: Promise<{ projectId: string }> }

async function auth() {
  const store = await cookies();
  return !!store.get('admin_session')?.value;
}

function defaultContent(clientName: string, projectName: string, phase: number, phaseLabel?: string): string {
  const label = phaseLabel || `Phase ${phase}`;
  return JSON.stringify({
    version: '2',
    meta: {
      clientName,
      projectName: `${projectName} — ${label}`,
      date: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }),
      preparedBy: 'Rachna Jain — Rachna Builds',
    },
    sections: [
      { id: 's1', type: 'bullets', title: 'Scope of Work', items: [''] },
      { id: 's2', type: 'bullets', title: 'Deliverables', items: [''] },
      { id: 's3', type: 'timeline', title: 'Timeline', rows: [
        { milestone: 'Kickoff + Setup', duration: 'Week 1' },
        { milestone: 'Development', duration: 'Week 2–3' },
        { milestone: 'Review + Revisions', duration: 'Week 4' },
        { milestone: 'Delivery', duration: 'Week 5' },
      ], note: '' },
      { id: 's4', type: 'payment', title: 'Investment', totalFee: '', schedule: [
        { label: '50% Advance', amount: '', timing: 'due on signing' },
        { label: '50% Balance', amount: '', timing: 'due before delivery' },
      ], latePenalty: '2% per month after 7-day grace period' },
      { id: 's5', type: 'bullets', title: 'Revisions Policy', items: [
        'Includes 2 rounds of revisions',
        'Additional revisions billed at ₹2,500/hour',
      ]},
      { id: 's6', type: 'bullets', title: 'Client Responsibilities', items: [
        'Provide brand assets, content, and access within 5 days of signing',
        'Provide feedback within 5 business days of each review',
      ]},
      { id: 's7', type: 'text', title: 'Intellectual Property', body: 'Upon receipt of final payment, all rights to the completed work transfer to the client. Third-party themes, plugins, and apps remain under their respective licenses.' },
      { id: 's8', type: 'text', title: 'Confidentiality', body: 'Both parties agree to keep all project details, pricing, and communications confidential and shall not disclose them to any third party without prior written consent.' },
      { id: 's9', type: 'text', title: 'Governing Law', body: 'This agreement is governed by the laws of India. Any disputes shall be resolved in courts of Mumbai, Maharashtra.' },
    ],
  });
}

export async function GET(_req: NextRequest, { params }: RouteContext) {
  if (!await auth()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { projectId } = await params;

  const contracts = await prisma.projectContract.findMany({
    where: { projectId },
    orderBy: { phase: 'asc' },
  });
  return NextResponse.json({ contracts });
}

export async function POST(req: NextRequest, { params }: RouteContext) {
  if (!await auth()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { projectId } = await params;

  const body = await req.json();
  const { phase, phaseLabel } = body;

  if (!phase || typeof phase !== 'number') {
    return NextResponse.json({ error: 'phase (number) required' }, { status: 400 });
  }

  const project = await prisma.clientProject.findUnique({
    where: { id: projectId },
    include: { client: true },
  });
  if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 });

  const existing = await prisma.projectContract.findUnique({
    where: { projectId_phase: { projectId, phase } },
  });
  if (existing) return NextResponse.json({ error: `Phase ${phase} already exists` }, { status: 409 });

  const content = defaultContent(project.client.name, project.name, phase, phaseLabel);
  const contract = await prisma.projectContract.create({
    data: { projectId, phase, phaseLabel: phaseLabel || null, content },
  });
  return NextResponse.json({ contract });
}

export async function PATCH(req: NextRequest, { params }: RouteContext) {
  if (!await auth()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { projectId } = await params;

  const url = new URL(req.url);
  const phaseParam = url.searchParams.get('phase');
  const phase = phaseParam ? parseInt(phaseParam, 10) : 1;

  const body = await req.json();
  const { content, status, phaseLabel, advancePaid, balancePaid, advanceReceiptUrl, balanceReceiptUrl } = body;

  const data: Record<string, unknown> = {};
  if (content !== undefined) data.content = content;
  if (phaseLabel !== undefined) data.phaseLabel = phaseLabel;
  if (status !== undefined) {
    data.status = status;
    if (status === 'sent') data.sentAt = new Date();
  }
  if (advancePaid !== undefined) data.advancePaid = advancePaid;
  if (balancePaid !== undefined) data.balancePaid = balancePaid;
  if (advanceReceiptUrl !== undefined) data.advanceReceiptUrl = advanceReceiptUrl;
  if (balanceReceiptUrl !== undefined) data.balanceReceiptUrl = balanceReceiptUrl;

  const contract = await prisma.projectContract.upsert({
    where: { projectId_phase: { projectId, phase } },
    create: { projectId, phase, ...data },
    update: data,
  });

  // Fire-and-forget: notify client when contract is marked as sent
  if (status === 'sent') {
    const project = await prisma.clientProject.findUnique({
      where: { id: projectId },
      include: { client: true },
    });
    if (project?.client?.email) {
      const portalUrl = `https://rachnabuilds.com/portal/${project.client.slug}/${projectId}`;
      // Extract payment info from contract content to include in email
      let paymentInfo: Parameters<typeof notifyContractReady>[4] = undefined;
      try {
        const parsed = JSON.parse(contract.content);
        const paySection = (parsed.sections ?? []).find((s: { type: string }) => s.type === 'payment');
        if (paySection) {
          paymentInfo = {
            totalFee: paySection.totalFee || undefined,
            schedule: paySection.schedule?.filter((r: { label: string }) => r.label) ?? [],
            paymentMethods: paySection.paymentMethods,
          };
        }
      } catch {}
      notifyContractReady(
        project.client.email,
        project.client.name,
        project.name,
        portalUrl,
        paymentInfo,
      ).catch(console.error);
    }
  }

  return NextResponse.json({ contract });
}
