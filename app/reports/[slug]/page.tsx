import { cookies } from 'next/headers';
import crypto from 'crypto';
import { prisma } from '@/lib/prisma';
import PasswordGate from './PasswordGate';
import PortalView, { ReportWithSectionsAndDocs } from './PortalView';
import { isAdminToken, isReportSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ preview?: string }>;
}

export default async function ReportPage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const { preview } = await searchParams;
  const cookieStore = await cookies();

  const [report, emailSetting] = await Promise.all([
    prisma.report.findUnique({
      where: { slug },
      include: { sections: true, documents: true },
    }),
    prisma.setting.findUnique({ where: { key: 'contact_email' } }),
  ]);

  const contactEmail = emailSetting?.value ?? 'hello@rachnabuilds.com';

  // Not found or inactive
  if (!report || !report.isActive) {
    return (
      <div style={{ minHeight: '100vh', background: '#0B0F1A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Inter, -apple-system, sans-serif', padding: '24px' }}>
        <div style={{ textAlign: 'center', maxWidth: '400px' }}>
          <div style={{ width: '56px', height: '56px', borderRadius: '14px', background: 'rgba(255,107,107,.1)', border: '1px solid rgba(255,107,107,.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', fontSize: '24px' }}>
            ⚠️
          </div>
          <h1 style={{ fontFamily: 'Space Grotesk, -apple-system, sans-serif', fontSize: '22px', fontWeight: 700, color: '#E8ECF4', marginBottom: '12px' }}>
            Report not found or expired
          </h1>
          <p style={{ fontSize: '14px', color: '#8B95A8', lineHeight: 1.6 }}>
            This report link is no longer active. Please contact{' '}
            <a href={`mailto:${contactEmail}`} style={{ color: '#06D6A0', textDecoration: 'none' }}>
              {contactEmail}
            </a>{' '}
            if you believe this is an error.
          </p>
        </div>
      </div>
    );
  }

  // Signed session check
  const clientOk = await isReportSession(slug);

  // Check if admin is previewing (admin_session must be valid)
  const isAdminPreview = preview === '1' && (await isAdminToken(cookieStore.get('admin_session')?.value));

  // Never ship credentials to the browser — PortalView is a client component.
  const { passwordHash: _ph, clientPasswordPlain: _pp, ...safeReport } = report;
  void _ph; void _pp;
  const viewReport = { ...safeReport, passwordHash: '', clientPasswordPlain: null } as unknown as ReportWithSectionsAndDocs;

  if (clientOk) {
    return <PortalView report={viewReport} isAdminPreview={isAdminPreview} />;
  }

  // Admin can preview without client password
  if (isAdminPreview) {
    return <PortalView report={viewReport} isAdminPreview={true} />;
  }

  return <PasswordGate slug={slug} clientName={report.clientName} />;
}
