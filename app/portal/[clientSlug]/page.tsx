import { cookies } from 'next/headers';
import crypto from 'crypto';
import { prisma } from '@/lib/prisma';
import PortalPasswordGate from './PortalPasswordGate';
import ClientPortalView from './ClientPortalView';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ clientSlug: string }>;
  searchParams: Promise<{ preview?: string }>;
}

export default async function ClientPortalPage({ params, searchParams }: PageProps) {
  const { clientSlug } = await params;
  const { preview } = await searchParams;
  const cookieStore = await cookies();

  const client = await prisma.client.findUnique({
    where: { slug: clientSlug },
    include: {
      projects: {
        orderBy: { displayOrder: 'asc' },
        include: {
          _count: {
            select: { sections: true, documents: true },
          },
        },
      },
    },
  });

  if (!client || !client.isActive) {
    return (
      <div style={{ minHeight: '100vh', background: '#0B0F1A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Inter, -apple-system, sans-serif', padding: '24px' }}>
        <div style={{ textAlign: 'center', maxWidth: '400px' }}>
          <div style={{ width: '56px', height: '56px', borderRadius: '14px', background: 'rgba(255,107,107,.1)', border: '1px solid rgba(255,107,107,.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', fontSize: '24px' }}>
            ⚠️
          </div>
          <h1 style={{ fontFamily: 'Space Grotesk, -apple-system, sans-serif', fontSize: '22px', fontWeight: 700, color: '#E8ECF4', marginBottom: '12px' }}>
            Portal not found or inactive
          </h1>
          <p style={{ fontSize: '14px', color: '#8B95A8', lineHeight: 1.6 }}>
            This portal link is no longer active. Please contact{' '}
            <a href="mailto:rachnajain2103@gmail.com" style={{ color: '#06D6A0', textDecoration: 'none' }}>
              rachnajain2103@gmail.com
            </a>{' '}
            if you believe this is an error.
          </p>
        </div>
      </div>
    );
  }

  // HMAC verification
  const secret = process.env.ADMIN_PASSWORD || 'secret';
  const expected = crypto.createHmac('sha256', secret).update(clientSlug).digest('hex');
  const cookieValue = cookieStore.get(`pc_${clientSlug}`)?.value;

  // Admin preview bypass
  const adminSession = cookieStore.get('admin_session')?.value;
  const adminHash = crypto.createHash('sha256').update(process.env.ADMIN_PASSWORD || '').digest('hex');
  const isAdminPreview = preview === '1' && adminSession === adminHash;

  if (cookieValue !== expected && !isAdminPreview) {
    return <PortalPasswordGate clientSlug={clientSlug} clientName={client.name} />;
  }

  // Serialize projects for the client component
  const projects = client.projects.map(p => ({
    id: p.id,
    name: p.name,
    clientType: p.clientType,
    status: p.status,
    displayOrder: p.displayOrder,
    sectionCount: p._count.sections,
    documentCount: p._count.documents,
    updatedAt: p.updatedAt.toISOString(),
  }));

  return (
    <ClientPortalView
      clientSlug={clientSlug}
      clientName={client.name}
      projects={projects}
    />
  );
}
