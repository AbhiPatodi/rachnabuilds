// POST /api/admin/projects/[projectId]/apply-template
// Creates client_required docs from the template for this project's clientType + platform.
// Non-destructive: skips docs whose title already exists on the project.
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import crypto from 'crypto';
import { prisma } from '@/lib/prisma';
import { getDocumentTemplate } from '@/lib/portal-config';

interface RouteContext { params: Promise<{ projectId: string }> }

async function auth() {
  const store = await cookies();
  return !!store.get('admin_session')?.value;
}

export async function POST(_req: NextRequest, { params }: RouteContext) {
  if (!await auth()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { projectId } = await params;

  const project = await prisma.clientProject.findUnique({
    where: { id: projectId },
    select: { id: true, clientType: true, platform: true, documents: { select: { title: true } } },
  });
  if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const template = getDocumentTemplate(project.clientType, project.platform);
  if (!template.length) return NextResponse.json({ added: 0, message: 'No template for this type' });

  const existingTitles = new Set(project.documents.map(d => d.title.toLowerCase()));

  const toCreate = template.filter(t => !existingTitles.has(t.title.toLowerCase()));

  if (toCreate.length === 0) {
    return NextResponse.json({ added: 0, message: 'All template docs already exist' });
  }

  await prisma.projectDocument.createMany({
    data: toCreate.map(t => ({
      id: crypto.randomBytes(12).toString('hex'),
      projectId: project.id,
      docType: 'client_required',
      title: t.title,
      url: '',
      notes: t.notes,
    })),
  });

  return NextResponse.json({ added: toCreate.length, message: `Added ${toCreate.length} document(s) from template` });
}
