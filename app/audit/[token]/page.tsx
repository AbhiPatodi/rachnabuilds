import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import type { AuditReportData } from '@/lib/auditBot';
import AuditReportView from '@/app/components/audit/AuditReportView';
import '../../training/funnel.css';

export const metadata: Metadata = {
  title: 'Shopify Conversion Audit | Rachna Builds',
  robots: { index: false, follow: false },
};

export default async function AuditReportPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const audit = await prisma.auditReport.findUnique({ where: { token }, include: { funnelLead: true } });
  if (!audit || (audit.status !== 'draft' && audit.status !== 'sent')) notFound();

  let report: AuditReportData;
  try {
    report = JSON.parse(audit.reportJson);
  } catch {
    notFound();
  }

  const firstName = audit.funnelLead.name.split(' ')[0];

  return (
    <div className="fn-root">
      <header className="fn-header">
        <span className="fn-logo">
          <img src="/branding/rachna-builds-wordmark.svg" alt="Rachna Builds" style={{ height: 22, width: 'auto', display: 'block' }} />
        </span>
      </header>

      <main className="fn-main">
        <div className="fn-hero">
          <div className="fn-hero-inner">
            <div className="fn-callout">Conversion Audit · {audit.storeUrl.replace(/^https?:\/\//, '')}</div>
            <h1 className="fn-h1">
              {firstName}, Here&apos;s What&apos;s <em>Blocking Your Conversions.</em>
            </h1>
          </div>
        </div>

        <div className="fn-body fn-body-raised" style={{ maxWidth: 860 }}>
          <AuditReportView
            report={report}
            footer={
              <a href="/training/apply" className="fn-btn" style={{ maxWidth: 320, margin: '16px auto 0' }}>
                Book Your Strategy Call →
              </a>
            }
          />
        </div>
      </main>

      <footer className="fn-footer">© {new Date().getFullYear()} Rachna Builds. All rights reserved.</footer>
    </div>
  );
}
