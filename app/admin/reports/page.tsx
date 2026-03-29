import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import DashboardActions from '../dashboard/DashboardActions';

export const dynamic = 'force-dynamic';

export default async function ReportsPage() {
  const reports = await prisma.report.findMany({
    orderBy: { createdAt: 'desc' },
    include: { _count: { select: { sections: true, documents: true } } },
  });

  return (
    <div className="admin-content">
      <div className="admin-page-header">
        <div>
          <h1>Client Reports</h1>
          <p>Manage client portals and reports</p>
        </div>
        <Link href="/admin/reports/new" className="admin-btn admin-btn-primary">
          + New Report
        </Link>
      </div>

      <div className="admin-card" style={{ padding: 0, overflow: 'hidden' }}>
        {reports.length === 0 ? (
          <div className="admin-empty">
            <div style={{ fontWeight: 600, marginBottom: 4 }}>No client reports yet</div>
            <div>Create your first report to share with a client.</div>
          </div>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>Client</th>
                <th>Portal Link</th>
                <th>Created</th>
                <th>Views</th>
                <th>Sections</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {reports.map(report => (
                <tr key={report.id}>
                  <td>
                    <div style={{ fontWeight: 600, color: 'var(--text)', marginBottom: 2 }}>{report.clientName}</div>
                    {report.clientEmail && (
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace' }}>{report.clientEmail}</div>
                    )}
                  </td>
                  <td>
                    <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: 'var(--text-secondary)' }}>
                      /reports/<wbr />{report.slug}
                    </span>
                  </td>
                  <td>
                    <span style={{ color: 'var(--text-secondary)', fontSize: 12 }}>
                      {new Date(report.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </span>
                  </td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{report.viewCount}</div>
                    {report.lastViewedAt && (
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace' }}>
                        {new Date(report.lastViewedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                      </div>
                    )}
                  </td>
                  <td>
                    <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12 }}>
                      {report._count.sections}s / {report._count.documents}d
                    </span>
                  </td>
                  <td>
                    <span className={`badge ${report.isActive ? 'badge-green' : 'badge-red'}`}>
                      <span className="badge-dot" />
                      {report.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td>
                    <DashboardActions
                      reportId={report.id}
                      reportSlug={report.slug}
                      isActive={report.isActive}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
