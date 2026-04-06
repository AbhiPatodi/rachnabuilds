// POST /api/admin/portal-leads/[id]/convert
// Converts a PortalLead into a Client + ClientProject in one step.
// Body: { password, projectName?, slug? }
// Auto-generates slug from businessName or name if not supplied.
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import bcryptjs from 'bcryptjs';
import crypto from 'crypto';
import { prisma } from '@/lib/prisma';
import { getDocumentTemplate, getSectionTemplate } from '@/lib/portal-config';

interface RouteContext { params: Promise<{ id: string }> }

async function auth() {
  const store = await cookies();
  return !!store.get('admin_session')?.value;
}

function toSlug(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 60);
}

export async function POST(req: NextRequest, { params }: RouteContext) {
  if (!await auth()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;

  const lead = await prisma.portalLead.findUnique({ where: { id } });
  if (!lead) return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
  if (lead.status === 'converted' && lead.convertedClientId) {
    return NextResponse.json({ error: 'Already converted', clientId: lead.convertedClientId }, { status: 409 });
  }

  const body = await req.json();
  const rawPassword: string = body.password?.trim();
  if (!rawPassword || rawPassword.length < 6) {
    return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
  }

  // Resolve slug: provided > businessName > name
  const baseSlug = toSlug(body.slug?.trim() || lead.businessName || lead.name);
  if (!baseSlug) return NextResponse.json({ error: 'Could not generate slug' }, { status: 400 });

  // Ensure slug is unique (append year if taken)
  let slug = baseSlug;
  const existing = await prisma.client.findUnique({ where: { slug } });
  if (existing) slug = `${baseSlug}-${new Date().getFullYear()}`;

  const passwordHash = await bcryptjs.hash(rawPassword, 10);
  const projectName = body.projectName?.trim() || (lead.businessName ? `${lead.businessName} — ${lead.clientType.replace(/_/g, ' ')}` : `${lead.name} — Project`);

  // Create client + project in a transaction
  const result = await prisma.$transaction(async (tx) => {
    const client = await tx.client.create({
      data: {
        id: crypto.randomBytes(12).toString('hex'),
        name: lead.businessName || lead.name,
        email: lead.email,
        phone: lead.phone ?? undefined,
        slug,
        passwordHash,
        clientProfile: { portalPassword: rawPassword },
      },
    });

    const project = await tx.clientProject.create({
      data: {
        id: crypto.randomBytes(12).toString('hex'),
        clientId: client.id,
        name: projectName,
        clientType: lead.clientType,
        platform: lead.platform ?? undefined,
        status: 'active',
      },
    });

    // Auto-create document checklist
    const docTemplate = getDocumentTemplate(lead.clientType, lead.platform);
    if (docTemplate.length > 0) {
      await tx.projectDocument.createMany({
        data: docTemplate.map(t => ({
          id: crypto.randomBytes(12).toString('hex'),
          projectId: project.id,
          docType: 'client_required',
          title: t.title,
          url: '',
          notes: t.notes,
        })),
      });
    }

    // Auto-create sections
    const sectionTemplate = getSectionTemplate(lead.clientType);
    if (sectionTemplate.length > 0) {
      await tx.projectSection.createMany({
        data: sectionTemplate.map(s => ({
          id: crypto.randomBytes(12).toString('hex'),
          projectId: project.id,
          sectionType: s.sectionType,
          title: s.title,
          content: { items: [] },
          displayOrder: s.displayOrder,
        })),
      });
    }

    // Mark lead converted
    await tx.portalLead.update({
      where: { id: lead.id },
      data: { status: 'converted', convertedClientId: client.id },
    });

    return { client, project };
  });

  return NextResponse.json({
    ok: true,
    clientId: result.client.id,
    clientSlug: result.client.slug,
    projectId: result.project.id,
    portalUrl: `/portal/${result.client.slug}`,
    password: rawPassword,
  }, { status: 201 });
}
