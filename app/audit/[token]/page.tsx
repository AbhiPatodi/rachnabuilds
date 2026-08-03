import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import type { AuditReportData } from '@/lib/auditBot';
import '../../training/funnel.css';

export const metadata: Metadata = {
  title: 'Shopify Conversion Audit | Rachna Builds',
  robots: { index: false, follow: false },
};

const SEVERITY_STYLE: Record<string, { bg: string; color: string; label: string }> = {
  critical: { bg: 'rgba(217,72,72,0.1)', color: '#C03A3A', label: 'Critical' },
  high: { bg: 'rgba(217,119,6,0.1)', color: '#B45309', label: 'High' },
  medium: { bg: 'rgba(202,138,4,0.1)', color: '#A16207', label: 'Medium' },
  low: { bg: 'rgba(10,31,19,0.06)', color: 'rgba(10,31,19,0.55)', label: 'Low' },
};

function ScoreRing({ label, value }: { label: string; value: number }) {
  const color = value >= 70 ? '#10B981' : value >= 50 ? '#D97706' : '#C03A3A';
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{
        width: 76, height: 76, borderRadius: '50%', margin: '0 auto 8px',
        background: `conic-gradient(${color} ${value * 3.6}deg, rgba(10,31,19,0.08) 0)`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <div style={{ width: 60, height: 60, borderRadius: '50%', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Lexend, sans-serif', fontWeight: 900, fontSize: 20, color: '#0A1F13' }}>
          {value}
        </div>
      </div>
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(10,31,19,0.55)' }}>{label}</div>
    </div>
  );
}

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
            <p className="fn-sub">{report.estimatedImpact}</p>
          </div>
        </div>

        <div className="fn-body fn-body-raised" style={{ maxWidth: 860 }}>
          <div className="fn-card fn-card-wide" style={{ maxWidth: 'none' }}>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 28, flexWrap: 'wrap', marginBottom: 24 }}>
              <ScoreRing label="Overall" value={report.scores.overall} />
              <ScoreRing label="Performance" value={report.scores.performance} />
              <ScoreRing label="Trust" value={report.scores.trust} />
              <ScoreRing label="UX" value={report.scores.ux} />
              <ScoreRing label="SEO" value={report.scores.seo} />
            </div>
            <p style={{ fontSize: 15, lineHeight: 1.7, color: 'rgba(10,31,19,0.75)', textAlign: 'left' }}>{report.summary}</p>
          </div>

          <h2 style={{ fontFamily: 'Lexend, sans-serif', fontWeight: 700, fontSize: 24, color: '#0A1F13', margin: '40px 0 16px', textAlign: 'left' }}>
            The Bottlenecks ({report.issues.length})
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {report.issues.map((issue, i) => {
              const sev = SEVERITY_STYLE[issue.severity] ?? SEVERITY_STYLE.medium;
              return (
                <div key={i} className="fn-card fn-card-wide" style={{ maxWidth: 'none', padding: '22px 26px', textAlign: 'left' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 100, background: sev.bg, color: sev.color, letterSpacing: '0.04em', textTransform: 'uppercase' }}>{sev.label}</span>
                    <span style={{ fontSize: 11, fontWeight: 600, color: 'rgba(10,31,19,0.4)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{issue.category}</span>
                    <strong style={{ fontFamily: 'Lexend, sans-serif', fontSize: 16, color: '#0A1F13', width: '100%' }}>{issue.title}</strong>
                  </div>
                  <p style={{ fontSize: 14, lineHeight: 1.65, color: 'rgba(10,31,19,0.7)', marginBottom: 8 }}><strong style={{ color: '#0A1F13' }}>Found:</strong> {issue.finding}</p>
                  <p style={{ fontSize: 14, lineHeight: 1.65, color: 'rgba(10,31,19,0.7)', marginBottom: 8 }}><strong style={{ color: '#0A1F13' }}>Why it costs you:</strong> {issue.impact}</p>
                  <p style={{ fontSize: 14, lineHeight: 1.65, color: 'rgba(10,31,19,0.7)' }}><strong style={{ color: '#0E8A6E' }}>The fix:</strong> {issue.fix}</p>
                </div>
              );
            })}
          </div>

          <h2 style={{ fontFamily: 'Lexend, sans-serif', fontWeight: 700, fontSize: 24, color: '#0A1F13', margin: '40px 0 16px', textAlign: 'left' }}>Quick Wins</h2>
          <div className="fn-card fn-card-wide" style={{ maxWidth: 'none', textAlign: 'left' }}>
            <ul style={{ margin: 0, paddingLeft: 20, lineHeight: 2, fontSize: 14.5, color: 'rgba(10,31,19,0.75)' }}>
              {report.quickWins.map((w, i) => <li key={i}>{w}</li>)}
            </ul>
          </div>

          <h2 style={{ fontFamily: 'Lexend, sans-serif', fontWeight: 700, fontSize: 24, color: '#0A1F13', margin: '40px 0 16px', textAlign: 'left' }}>Your Action Plan</h2>
          <div style={{ display: 'grid', gap: 12 }}>
            {report.actionPlan.map((phase, i) => (
              <div key={i} className="fn-card fn-card-wide" style={{ maxWidth: 'none', textAlign: 'left' }}>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#0E8A6E', marginBottom: 4 }}>{phase.phase}</div>
                <strong style={{ fontFamily: 'Lexend, sans-serif', fontSize: 17, color: '#0A1F13' }}>{phase.title}</strong>
                <ul style={{ margin: '10px 0 0', paddingLeft: 20, lineHeight: 1.9, fontSize: 14, color: 'rgba(10,31,19,0.7)' }}>
                  {phase.items.map((item, j) => <li key={j}>{item}</li>)}
                </ul>
              </div>
            ))}
          </div>

          <div className="fn-card fn-card-wide" style={{ maxWidth: 'none', marginTop: 40, textAlign: 'center', background: '#0A1F13' }}>
            <h3 style={{ fontFamily: 'Lexend, sans-serif', fontWeight: 700, fontSize: 22, color: '#fff', marginBottom: 8 }}>
              Want these fixed in 14 days?
            </h3>
            <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.65)', marginBottom: 20 }}>
              We&apos;ll walk through this report together and map out exactly what to fix first.
            </p>
            <a href="/training/apply" className="fn-btn" style={{ maxWidth: 320, margin: '0 auto' }}>
              Book Your Strategy Call →
            </a>
          </div>
        </div>
      </main>

      <footer className="fn-footer">© {new Date().getFullYear()} Rachna Builds. All rights reserved.</footer>
    </div>
  );
}
