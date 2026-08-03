import type { AuditReportData } from '@/lib/auditBot';

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

const cardStyle: React.CSSProperties = {
  background: '#fff', border: '1px solid rgba(10,31,19,0.09)', borderRadius: 16,
  padding: '28px 30px', textAlign: 'left', boxShadow: '0 4px 16px rgba(10,31,19,0.05)',
};

/** Renders a full audit report. Self-contained (light card styling), safe to embed on any background. */
export default function AuditReportView({ report, footer }: { report: AuditReportData; footer?: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={cardStyle}>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 28, flexWrap: 'wrap', marginBottom: 24 }}>
          <ScoreRing label="Overall" value={report.scores.overall} />
          <ScoreRing label="Performance" value={report.scores.performance} />
          <ScoreRing label="Trust" value={report.scores.trust} />
          <ScoreRing label="UX" value={report.scores.ux} />
          <ScoreRing label="SEO" value={report.scores.seo} />
        </div>
        <p style={{ fontSize: 15, lineHeight: 1.7, color: 'rgba(10,31,19,0.75)', margin: 0 }}>{report.summary}</p>
      </div>

      <h2 style={{ fontFamily: 'Lexend, sans-serif', fontWeight: 700, fontSize: 20, color: '#0A1F13', margin: '20px 0 4px' }}>
        The Bottlenecks ({report.issues.length})
      </h2>
      {report.issues.map((issue, i) => {
        const sev = SEVERITY_STYLE[issue.severity] ?? SEVERITY_STYLE.medium;
        return (
          <div key={i} style={{ ...cardStyle, padding: '20px 24px' }}>
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

      <h2 style={{ fontFamily: 'Lexend, sans-serif', fontWeight: 700, fontSize: 20, color: '#0A1F13', margin: '20px 0 4px' }}>Quick Wins</h2>
      <div style={cardStyle}>
        <ul style={{ margin: 0, paddingLeft: 20, lineHeight: 2, fontSize: 14.5, color: 'rgba(10,31,19,0.75)' }}>
          {report.quickWins.map((w, i) => <li key={i}>{w}</li>)}
        </ul>
      </div>

      <h2 style={{ fontFamily: 'Lexend, sans-serif', fontWeight: 700, fontSize: 20, color: '#0A1F13', margin: '20px 0 4px' }}>Action Plan</h2>
      {report.actionPlan.map((phase, i) => (
        <div key={i} style={cardStyle}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#0E8A6E', marginBottom: 4 }}>{phase.phase}</div>
          <strong style={{ fontFamily: 'Lexend, sans-serif', fontSize: 17, color: '#0A1F13' }}>{phase.title}</strong>
          <ul style={{ margin: '10px 0 0', paddingLeft: 20, lineHeight: 1.9, fontSize: 14, color: 'rgba(10,31,19,0.7)' }}>
            {phase.items.map((item, j) => <li key={j}>{item}</li>)}
          </ul>
        </div>
      ))}

      <div style={{ ...cardStyle, marginTop: 16, textAlign: 'center', background: '#0A1F13' }}>
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', margin: 0, fontWeight: 600 }}>{report.estimatedImpact}</p>
        {footer}
      </div>
    </div>
  );
}
