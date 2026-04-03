import { cookies } from 'next/headers';
import crypto from 'crypto';
import { prisma } from '@/lib/prisma';
import PortalPasswordGate from '../PortalPasswordGate';
import ProjectPortalView from './ProjectPortalView';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ clientSlug: string; projectId: string }>;
}

export default async function ProjectPortalPage({ params }: PageProps) {
  const { clientSlug, projectId } = await params;
  const cookieStore = await cookies();

  // Find and verify client
  const client = await prisma.client.findUnique({
    where: { slug: clientSlug },
    select: { id: true, name: true, isActive: true },
  });

  if (!client || !client.isActive) {
    return (
      <div style={{ minHeight: '100vh', background: '#0B0F1A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Inter, -apple-system, sans-serif', padding: '24px' }}>
        <div style={{ textAlign: 'center', maxWidth: '400px' }}>
          <h1 style={{ fontFamily: 'Space Grotesk, -apple-system, sans-serif', fontSize: '22px', fontWeight: 700, color: '#E8ECF4', marginBottom: '12px' }}>
            Portal not found
          </h1>
          <p style={{ fontSize: '14px', color: '#8B95A8', lineHeight: 1.6 }}>
            This portal link is no longer active.
          </p>
        </div>
      </div>
    );
  }

  // HMAC cookie check (v2)
  const secret = process.env.ADMIN_PASSWORD || 'secret';
  const expected = crypto.createHmac('sha256', secret).update(clientSlug).digest('hex');
  const cookieValue = cookieStore.get(`pc_${clientSlug}`)?.value;

  if (cookieValue !== expected) {
    return <PortalPasswordGate clientSlug={clientSlug} clientName={client.name} />;
  }

  // Find project — verify it belongs to this client
  const project = await prisma.clientProject.findFirst({
    where: { id: projectId, clientId: client.id },
    include: {
      sections: { orderBy: { displayOrder: 'asc' } },
      documents: { orderBy: { uploadedAt: 'desc' } },
    },
  });

  if (!project) {
    return (
      <div style={{ minHeight: '100vh', background: '#0B0F1A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Inter, -apple-system, sans-serif', padding: '24px' }}>
        <div style={{ textAlign: 'center', maxWidth: '400px' }}>
          <h1 style={{ fontFamily: 'Space Grotesk, -apple-system, sans-serif', fontSize: '22px', fontWeight: 700, color: '#E8ECF4', marginBottom: '12px' }}>
            Project not found
          </h1>
          <p style={{ fontSize: '14px', color: '#8B95A8', lineHeight: 1.6 }}>
            This project does not exist or you do not have access to it.
          </p>
        </div>
      </div>
    );
  }

  return (
    <ProjectPortalView
      clientSlug={clientSlug}
      clientName={client.name}
      project={{
        id: project.id,
        name: project.name,
        clientType: project.clientType,
        status: project.status,
        adminProfile: project.adminProfile as Record<string, unknown> | null,
        sections: project.sections.map(s => ({
          id: s.id,
          projectId: s.projectId,
          sectionType: s.sectionType,
          title: s.title,
          content: s.content,
          displayOrder: s.displayOrder,
          createdAt: s.createdAt.toISOString(),
        })),
        documents: project.documents.map(d => ({
          id: d.id,
          projectId: d.projectId,
          docType: d.docType,
          title: d.title,
          url: d.url,
          notes: d.notes,
          uploadedAt: d.uploadedAt.toISOString(),
        })),
      }}
    />
  );
}
