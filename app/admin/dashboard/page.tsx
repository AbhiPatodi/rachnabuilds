import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import DashboardActions from './DashboardActions';

export const dynamic = 'force-dynamic';

const STATUS_CFG: Record<string, { label: string; color: string; bg: string }> = {
  active:    { label: 'Active',    color: '#06D6A0', bg: 'rgba(6,214,160,0.12)'   },
  prospect:  { label: 'Prospect',  color: '#F59E0B', bg: 'rgba(245,158,11,0.12)'  },
  completed: { label: 'Completed', color: '#A78BFA', bg: 'rgba(167,139,250,0.12)' },
  inactive:  { label: 'Inactive',  color: '#FF6B6B', bg: 'rgba(255,107,107,0.12)' },
};

export default async function DashboardPage() {
  const [
    portfolioCount,
    testimonialCount,
    faqCount,
    blogCount,
    publishedBlogCount,
    socialCount,
    recentLeads,
    newLeadsCount,
    recentSigned,
    recentClients,
    clientCount,
    activeClientCount,
    reports,
  ] = await Promise.all([
    prisma.project.count({ where: { isVisible: true } }),
    prisma.testimonial.count({ where: { isVisible: true } }),
    prisma.faq.count({ where: { isVisible: true } }),
    prisma.blogPost.count(),
    prisma.blogPost.count({ where: { isPublished: true } }),
    prisma.socialLink.count({ where: { isVisible: true } }),
    prisma.contactLead.findMany({ orderBy: { createdAt: 'desc' }, take: 5 }),
    prisma.contactLead.count({ where: { status: 'new' } }),
    prisma.projectContract.findMany({
      where: { status: 'signed' },
      orderBy: { signedAt: 'desc' },
      take: 5,
      include: { project: { include: { client: true } } },
    }),
    prisma.client.findMany({
      orderBy: { updatedAt: 'desc' },
      take: 6,
      include: {
        _count: { select: { projects: true } },
        projects: {
          orderBy: { updatedAt: 'desc' },
          take: 1,
          select: { updatedAt: true, name: true, status: true, contracts: { select: { status: true } } },
        },
      },
    }),
    prisma.client.count(),
    prisma.client.count({ where: { isActive: true } }),
    // Keep old reports — Kruti + Amarja still use them
    prisma.report.findMany({
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { sections: true } } },
    }),
  ]);

  const totalReportViews = reports.reduce((s, r) => s + r.viewCount, 0);
  const activeReports = reports.filter(r => r.isActive).length;

  // Derive overallStatus for each recent client (same logic as API)
  const clientsWithStatus = recentClients.map(c => {
    const profile = c.clientProfile as Record<string, unknown> | null;
    const manualStatus = profile?.overallStatus as string | undefined;
    let overallStatus: string;
    if (manualStatus) {
      overallStatus = manualStatus;
    } else if (!c.isActive) {
      overallStatus = 'inactive';
    } else {
      const hasSignedContract = c.projects.some(p => p.contracts.some(con => con.status === 'signed'));
      const allCompleted = c.projects.length > 0 && c.projects.every(p => p.status === 'completed');
      overallStatus = allCompleted ? 'completed' : hasSignedContract ? 'active' : 'prospect';
    }
    return { ...c, overallStatus };
  });

  return (
    <div className="admin-content">
      <style>{`
        .dash-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 28px; }
        @media (max-width: 1100px) { .dash-grid { grid-template-columns: repeat(2, 1fr); } }
        .dash-stat { background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius); padding: 20px; }
        .dash-stat-label { font-family: 'JetBrains Mono', monospace; font-size: 10px; font-weight: 600; letter-spacing: .1em; text-transform: uppercase; color: var(--text-muted); margin-bottom: 10px; }
        .dash-stat-value { font-size: 32px; font-weight: 700; font-family: var(--heading); line-height: 1; color: var(--text); }
        .dash-stat-value.accent { color: var(--accent); }
        .dash-stat-value.coral { color: var(--coral); }
        .dash-stat-sub { font-size: 11px; color: var(--text-muted); margin-top: 6px; font-family: 'JetBrains Mono', monospace; }
        .dash-row { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 20px; margin-bottom: 28px; }
        @media (max-width: 1100px) { .dash-row { grid-template-columns: 1fr 1fr; } }
        @media (max-width: 700px) { .dash-row { grid-template-columns: 1fr; } }
        .dash-section-title { font-family: var(--heading); font-size: 15px; font-weight: 700; color: var(--text); margin-bottom: 14px; display: flex; align-items: center; justify-content: space-between; }
        .dash-section-title a { font-family: 'JetBrains Mono', monospace; font-size: 10px; font-weight: 600; color: var(--accent); letter-spacing: .06em; text-transform: uppercase; text-decoration: none; }
        .dash-section-title a:hover { text-decoration: underline; }
        .dash-quick-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
        @media (max-width: 700px) { .dash-quick-grid { grid-template-columns: repeat(2, 1fr); } }
        .dash-quick-link { display: flex; flex-direction: column; gap: 6px; padding: 14px 16px; background: var(--bg-elevated); border: 1px solid var(--border); border-radius: 10px; text-decoration: none; transition: all .2s; }
        .dash-quick-link:hover { border-color: var(--accent); background: var(--accent-dim); }
        .dash-quick-link-label { font-family: 'JetBrains Mono', monospace; font-size: 10px; font-weight: 600; letter-spacing: .08em; text-transform: uppercase; color: var(--text-muted); }
        .dash-quick-link:hover .dash-quick-link-label { color: var(--accent); }
        .dash-quick-link-title { font-size: 13px; font-weight: 600; color: var(--text); }
        .dash-lead-item { display: flex; align-items: flex-start; gap: 12px; padding: 12px 0; border-bottom: 1px solid var(--border); }
        .dash-lead-item:last-child { border-bottom: none; }
        .dash-lead-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--accent); flex-shrink: 0; margin-top: 5px; }
        .dash-lead-dot.read { background: var(--border); }
        .dash-lead-name { font-size: 13px; font-weight: 600; color: var(--text); margin-bottom: 2px; }
        .dash-lead-meta { font-size: 11px; color: var(--text-muted); font-family: 'JetBrains Mono', monospace; }
        .dash-lead-status { font-size: 10px; font-weight: 600; font-family: 'JetBrains Mono', monospace; letter-spacing: .06em; text-transform: uppercase; padding: 2px 8px; border-radius: 100px; margin-left: auto; flex-shrink: 0; }
        .dash-lead-status.new { background: rgba(6,214,160,.12); color: var(--accent); border: 1px solid rgba(6,214,160,.25); }
        .dash-lead-status.contacted { background: rgba(167,139,250,.12); color: #a78bfa; border: 1px solid rgba(167,139,250,.25); }
        .dash-lead-status.closed { background: var(--bg-elevated); color: var(--text-muted); border: 1px solid var(--border); }
        .dash-empty { text-align: center; padding: 32px; color: var(--text-muted); font-size: 13px; }
        .dash-notice { background: rgba(6,214,160,.06); border: 1px solid rgba(6,214,160,.2); border-radius: 10px; padding: 12px 16px; font-size: 12px; color: var(--text-secondary); margin-bottom: 20px; display: flex; align-items: center; gap: 10px; }
        .dash-notice strong { color: var(--accent); }
        .dash-notice.signed { background: rgba(167,139,250,.06); border-color: rgba(167,139,250,.25); }
        .dash-notice.signed strong { color: #a78bfa; }
        .signed-row { display: flex; align-items: center; gap: 12px; padding: 11px 0; border-bottom: 1px solid var(--border); }
        .signed-row:last-child { border-bottom: none; }
        .signed-badge { width: 8px; height: 8px; border-radius: 50%; background: #a78bfa; flex-shrink: 0; }
        .signed-name { font-size: 13px; font-weight: 600; color: var(--text-primary); }
        .signed-meta { font-size: 11px; color: var(--text-muted); font-family: 'JetBrains Mono', monospace; margin-top: 1px; }
        .signed-time { font-size: 11px; font-family: 'JetBrains Mono', monospace; color: var(--text-muted); margin-left: auto; flex-shrink: 0; }
        .client-dash-row { display: flex; align-items: center; gap: 12px; padding: 10px 0; border-bottom: 1px solid var(--border); text-decoration: none; }
        .client-dash-row:last-child { border-bottom: none; }
        .client-dash-row:hover .client-dash-name { color: var(--accent); }
        .client-dash-name { font-size: 13px; font-weight: 600; color: var(--text); transition: color .15s; margin-bottom: 2px; }
        .client-dash-meta { font-size: 11px; color: var(--text-muted); font-family: 'JetBrains Mono', monospace; }
      `}</style>

      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Dashboard</h1>
          <p className="admin-page-subtitle">Overview of your site and client portal</p>
        </div>
        <Link href="/admin/clients/new" className="admin-btn admin-btn-primary">
          <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}><path d="M12 5v14M5 12h14"/></svg>
          New Client →
        </Link>
      </div>

      {/* Signed contract alert — only if < 48h */}
      {recentSigned.length > 0 && (() => {
        const newest = recentSigned[0];
        const hoursAgo = newest.signedAt ? Math.floor((Date.now() - new Date(newest.signedAt).getTime()) / 3600000) : null;
        const isRecent = hoursAgo !== null && hoursAgo < 48;
        return isRecent ? (
          <div className="dash-notice signed">
            <svg width="14" height="14" fill="none" stroke="#a78bfa" viewBox="0 0 24 24" strokeWidth={2}><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
            <span><strong>{newest.project.client.name}</strong> just signed the contract for <strong>{newest.project.name}</strong> — {hoursAgo === 0 ? 'just now' : `${hoursAgo}h ago`}</span>
            <Link href={`/admin/projects/${newest.projectId}`} style={{ marginLeft: 'auto', fontFamily: 'JetBrains Mono, monospace', fontSize: 10, fontWeight: 600, color: '#a78bfa', textDecoration: 'none', letterSpacing: '.06em', textTransform: 'uppercase' }}>View →</Link>
          </div>
        ) : null;
      })()}

      {/* New leads alert */}
      {newLeadsCount > 0 && (
        <div className="dash-notice">
          <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0"/></svg>
          <span>You have <strong>{newLeadsCount} new lead{newLeadsCount > 1 ? 's' : ''}</strong> waiting in your inbox.</span>
          <Link href="/admin/leads" style={{ marginLeft: 'auto', fontFamily: 'JetBrains Mono, monospace', fontSize: 10, fontWeight: 600, color: 'var(--accent)', textDecoration: 'none', letterSpacing: '.06em', textTransform: 'uppercase' }}>View →</Link>
        </div>
      )}

      {/* Stats */}
      <div className="dash-grid">
        <div className="dash-stat">
          <div className="dash-stat-label">Clients</div>
          <div className="dash-stat-value accent">{clientCount}</div>
          <div className="dash-stat-sub">{activeClientCount} active</div>
        </div>
        <div className="dash-stat">
          <div className="dash-stat-label">Portfolio</div>
          <div className="dash-stat-value accent">{portfolioCount}</div>
          <div className="dash-stat-sub">visible on site</div>
        </div>
        <div className="dash-stat">
          <div className="dash-stat-label">Blog Posts</div>
          <div className="dash-stat-value">{publishedBlogCount}</div>
          <div className="dash-stat-sub">{blogCount - publishedBlogCount} draft{blogCount - publishedBlogCount !== 1 ? 's' : ''}</div>
        </div>
        <div className="dash-stat">
          <div className="dash-stat-label">New Leads</div>
          <div className="dash-stat-value coral">{newLeadsCount}</div>
          <div className="dash-stat-sub">unread in inbox</div>
        </div>
      </div>

      {/* Main row: Quick Actions + Signed Contracts + Recent Leads */}
      <div className="dash-row">
        {/* Quick Actions */}
        <div className="admin-card">
          <div className="dash-section-title">Quick Actions</div>
          <div className="dash-quick-grid">
            <Link href="/admin/clients/new" className="dash-quick-link">
              <div className="dash-quick-link-label">Portal</div>
              <div className="dash-quick-link-title">+ New Client</div>
            </Link>
            <Link href="/admin/clients" className="dash-quick-link">
              <div className="dash-quick-link-label">Portal</div>
              <div className="dash-quick-link-title">All Clients <span style={{color:'var(--text-muted)',fontWeight:400}}>{clientCount}</span></div>
            </Link>
            <Link href="/admin/portfolio" className="dash-quick-link">
              <div className="dash-quick-link-label">Content</div>
              <div className="dash-quick-link-title">Portfolio</div>
            </Link>
            <Link href="/admin/blog/new" className="dash-quick-link">
              <div className="dash-quick-link-label">Blog</div>
              <div className="dash-quick-link-title">+ New Post</div>
            </Link>
            <Link href="/admin/leads" className="dash-quick-link">
              <div className="dash-quick-link-label">Leads</div>
              <div className="dash-quick-link-title">Inbox{newLeadsCount > 0 ? <span style={{color:'var(--accent)',marginLeft:6}}>{newLeadsCount}</span> : ''}</div>
            </Link>
            <Link href="/admin/testimonials" className="dash-quick-link">
              <div className="dash-quick-link-label">Content</div>
              <div className="dash-quick-link-title">Testimonials</div>
            </Link>
            <Link href="/admin/faqs" className="dash-quick-link">
              <div className="dash-quick-link-label">Content</div>
              <div className="dash-quick-link-title">FAQs <span style={{color:'var(--text-muted)',fontWeight:400}}>{faqCount}</span></div>
            </Link>
            <Link href="/admin/social" className="dash-quick-link">
              <div className="dash-quick-link-label">Presence</div>
              <div className="dash-quick-link-title">Social Links <span style={{color:'var(--text-muted)',fontWeight:400}}>{socialCount}</span></div>
            </Link>
            <Link href="/admin/settings" className="dash-quick-link">
              <div className="dash-quick-link-label">Config</div>
              <div className="dash-quick-link-title">Site Settings</div>
            </Link>
          </div>
        </div>

        {/* Signed Contracts */}
        <div className="admin-card">
          <div className="dash-section-title">
            ✍️ Signed Contracts
          </div>
          {recentSigned.length === 0 ? (
            <div className="dash-empty">No signed contracts yet.</div>
          ) : (
            recentSigned.map(c => (
              <Link key={c.id} href={`/admin/projects/${c.projectId}`} style={{ textDecoration: 'none' }}>
                <div className="signed-row">
                  <div className="signed-badge" />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="signed-name">{c.project.client.name}</div>
                    <div className="signed-meta">{c.project.name}{c.phaseLabel ? ` · Phase ${c.phase} — ${c.phaseLabel}` : c.phase > 1 ? ` · Phase ${c.phase}` : ''}</div>
                  </div>
                  <div className="signed-time">{c.signedAt ? new Date(c.signedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' }) : '—'}</div>
                </div>
              </Link>
            ))
          )}
        </div>

        {/* Recent Leads */}
        <div className="admin-card">
          <div className="dash-section-title">
            Recent Leads
            <Link href="/admin/leads">View all →</Link>
          </div>
          {recentLeads.length === 0 ? (
            <div className="dash-empty">No leads yet — contact form submissions will appear here.</div>
          ) : (
            recentLeads.map(lead => (
              <div key={lead.id} className="dash-lead-item">
                <div className={`dash-lead-dot${lead.status !== 'new' ? ' read' : ''}`} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="dash-lead-name">{lead.name}</div>
                  <div className="dash-lead-meta">
                    {lead.email} · {new Date(lead.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                  </div>
                  {lead.message && (
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 240 }}>
                      {lead.message}
                    </div>
                  )}
                </div>
                <span className={`dash-lead-status ${lead.status}`}>{lead.status}</span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Recent Clients */}
      <div style={{ marginBottom: 8 }}>
        <div className="dash-section-title">
          Recent Clients
          <Link href="/admin/clients">View all →</Link>
        </div>
      </div>
      <div className="admin-card" style={{ padding: 0, overflow: 'hidden', marginBottom: 28 }}>
        {clientsWithStatus.length === 0 ? (
          <div className="admin-empty">
            No clients yet. <Link href="/admin/clients/new" style={{ color: 'var(--accent)' }}>Add your first client →</Link>
          </div>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>Client</th>
                <th>Latest Project</th>
                <th>Projects</th>
                <th>Status</th>
                <th>Last Activity</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {clientsWithStatus.map(client => {
                const cfg = STATUS_CFG[client.overallStatus] ?? STATUS_CFG['prospect'];
                const latestProject = client.projects[0];
                return (
                  <tr key={client.id}>
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--text)' }}>{client.name}</div>
                      {client.email && (
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace', marginTop: 1 }}>{client.email}</div>
                      )}
                    </td>
                    <td>
                      {latestProject
                        ? <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{latestProject.name}</span>
                        : <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>—</span>
                      }
                    </td>
                    <td>
                      <span style={{ fontWeight: 600 }}>{client._count.projects}</span>
                    </td>
                    <td>
                      <span style={{
                        fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase',
                        borderRadius: 6, padding: '2px 8px', display: 'inline-flex', alignItems: 'center', gap: 5,
                        color: cfg.color, background: cfg.bg, border: `1px solid ${cfg.color}44`,
                      }}>
                        <span style={{ width: 5, height: 5, borderRadius: '50%', background: cfg.color }} />
                        {cfg.label}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                        {new Date(client.updatedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </span>
                    </td>
                    <td>
                      <Link href={`/admin/clients/${client.id}`} className="admin-btn admin-btn-ghost admin-btn-icon" style={{ fontSize: 11 }}>
                        Manage →
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Legacy Reports — kept for Kruti + Amarja who use old /reports/[slug] system */}
      {reports.length > 0 && (
        <>
          <div style={{ marginBottom: 8 }}>
            <div className="dash-section-title">
              <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                Legacy Reports
                <span style={{ fontSize: 10, fontFamily: 'JetBrains Mono, monospace', color: 'var(--text-muted)', fontWeight: 400, background: 'var(--bg-elevated)', padding: '1px 8px', borderRadius: 100 }}>
                  old system
                </span>
              </span>
              <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: 'var(--text-muted)' }}>
                  {activeReports} active · {totalReportViews} total views
                </span>
              </div>
            </div>
          </div>
          <div className="admin-card" style={{ padding: 0, overflow: 'hidden' }}>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Client</th>
                  <th>Portal Link</th>
                  <th>Created</th>
                  <th>Views</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {reports.map(report => (
                  <tr key={report.id}>
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--text)' }}>{report.clientName}</div>
                      {report.clientEmail && (
                        <div style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace' }}>{report.clientEmail}</div>
                      )}
                    </td>
                    <td>
                      <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: 'var(--text-secondary)' }}>
                        /reports/{report.slug}
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
          </div>
        </>
      )}
    </div>
  );
}
