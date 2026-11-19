import Link from 'next/link';
import { listAdminReports } from '@/lib/adminReports';

export const dynamic = 'force-dynamic';

export default function AdsReviewsPage() {
  const reports = listAdminReports();
  return (
    <div className="admin-content">
      <div className="admin-page-header">
        <div>
          <h1>Ads reviews</h1>
          <p>Internal reports on the Meta ads and the lead funnel — the ones shown to the UAbility team.</p>
        </div>
      </div>
      <div className="admin-card" style={{ padding: 0, overflow: 'hidden' }}>
        {reports.length === 0 ? (
          <div className="admin-empty">No reports yet.</div>
        ) : (
          <table className="admin-table">
            <thead><tr><th>Date</th><th>Report</th><th>Size</th><th>Open</th></tr></thead>
            <tbody>
              {reports.map((r) => (
                <tr key={r.slug}>
                  <td style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>{new Date(r.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                  <td style={{ fontWeight: 600, color: 'var(--text)' }}>{r.title}</td>
                  <td style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{Math.round(r.bytes / 1024)} KB</td>
                  <td><Link href={`/admin/money/ads-reviews/${r.slug}`} className="admin-btn admin-btn-primary" style={{ padding: '6px 12px', fontSize: 13 }}>Open</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
