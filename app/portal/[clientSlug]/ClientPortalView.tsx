'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import '../../reports/[slug]/portal.css';

const LogoSVG = () => (
  <svg viewBox="0 0 64 72" fill="none" width="28" height="32">
    <rect width="11" height="72" fill="currentColor" />
    <rect width="42" height="11" fill="currentColor" />
    <path d="M42 0Q64 0 64 16Q64 32 42 32" stroke="currentColor" strokeWidth="11" fill="none" />
    <rect y="27" width="38" height="11" fill="currentColor" />
    <path d="M36 38L64 72" stroke="currentColor" strokeWidth="11" strokeLinecap="square" />
  </svg>
);

interface ProjectSummary {
  id: string;
  name: string;
  clientType: string;
  status: string;
  displayOrder: number;
  sectionCount: number;
  documentCount: number;
  updatedAt: string;
}

interface ClientPortalViewProps {
  clientSlug: string;
  clientName: string;
  projects: ProjectSummary[];
}

const CLIENT_TYPE_LABELS: Record<string, string> = {
  new_build: 'New Build',
  existing_optimisation: 'Optimisation',
  audit_only: 'Audit',
  retainer: 'Retainer',
  landing_page: 'Landing Page',
  migration: 'Migration',
};

const STATUS_LABELS: Record<string, string> = {
  draft: 'Draft',
  active: 'Active',
  completed: 'Completed',
};

const STATUS_COLORS: Record<string, string> = {
  draft: '#8B95A8',
  active: '#06D6A0',
  completed: '#A78BFA',
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function ClientPortalView({ clientSlug, clientName, projects }: ClientPortalViewProps) {
  const router = useRouter();

  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    if (typeof window === 'undefined') return 'dark';
    const pt = localStorage.getItem('portal_theme');
    if (pt === 'dark' || pt === 'light') return pt;
    const gt = localStorage.getItem('rb_theme');
    if (gt === 'dark' || gt === 'light') return gt;
    const h = new Date().getHours();
    return h >= 6 && h < 20 ? 'light' : 'dark';
  });

  // If only one project, redirect directly to it
  useEffect(() => {
    if (projects.length === 1) {
      router.replace(`/portal/${clientSlug}/${projects[0].id}`);
    }
  }, [projects, clientSlug, router]);

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    localStorage.setItem('portal_theme', next);
  };

  const handleLogout = () => {
    window.location.href = `/api/portal/${clientSlug}/logout`;
  };

  // Show nothing while redirecting for single project
  if (projects.length === 1) {
    return (
      <div style={{ minHeight: '100vh', background: '#0B0F1A', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: '#8B95A8', fontSize: '14px' }}>Loading your project…</div>
      </div>
    );
  }

  return (
    <div className="portal-root" data-theme={theme} suppressHydrationWarning>

      {/* Header */}
      <header className="portal-header">
        <div className="portal-header-inner">
          <div className="portal-logo">
            <div className="portal-logo-mark"><LogoSVG /></div>
            <div className="portal-logo-text">
              <span className="ln">Rachna</span>
              <span className="lb"> Builds</span>
            </div>
          </div>
          <div className="portal-header-right">
            <span className="portal-client-name">{clientName}</span>
            <span className="portal-badge">Your Portal</span>
            <button className="portal-theme-btn" onClick={toggleTheme} aria-label="Toggle theme">
              {theme === 'dark' ? (
                <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="5"/>
                  <line x1="12" y1="1" x2="12" y2="3"/>
                  <line x1="12" y1="21" x2="12" y2="23"/>
                  <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
                  <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
                  <line x1="1" y1="12" x2="3" y2="12"/>
                  <line x1="21" y1="12" x2="23" y2="12"/>
                  <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
                  <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
                </svg>
              ) : (
                <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/>
                </svg>
              )}
            </button>
            <button className="portal-logout-btn" onClick={handleLogout} title="Sign out">
              <svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/>
                <polyline points="16,17 21,12 16,7"/>
                <line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
              <span>Sign out</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="portal-content">

        {/* Welcome heading */}
        <div style={{ marginBottom: '32px' }}>
          <h1 className="portal-tab-heading">Welcome back, {clientName}</h1>
          <p className="portal-tab-sub">
            {projects.length === 0
              ? 'Your projects will appear here once they are set up.'
              : `You have ${projects.length} project${projects.length !== 1 ? 's' : ''} — select one to view details.`}
          </p>
        </div>

        {/* Projects grid */}
        {projects.length === 0 ? (
          <div className="portal-empty">
            <div className="portal-empty-icon">📁</div>
            <p>No projects yet. Your project will appear here once it has been set up.</p>
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
            gap: '20px',
          }}>
            {projects.map(project => (
              <button
                key={project.id}
                onClick={() => router.push(`/portal/${clientSlug}/${project.id}`)}
                style={{
                  all: 'unset',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '14px',
                  padding: '24px',
                  borderRadius: '14px',
                  border: '1px solid var(--border)',
                  background: 'var(--bg-card)',
                  boxShadow: 'var(--shadow)',
                  transition: 'border-color 0.15s, transform 0.15s',
                  textAlign: 'left',
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--accent)';
                  (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border)';
                  (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)';
                }}
              >
                {/* Top row: type badge + status */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                  <span style={{
                    fontSize: '11px',
                    fontWeight: 600,
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                    color: 'var(--accent)',
                    background: 'var(--accent-bg)',
                    border: '1px solid var(--accent-border)',
                    borderRadius: '6px',
                    padding: '3px 8px',
                  }}>
                    {CLIENT_TYPE_LABELS[project.clientType] || project.clientType}
                  </span>
                  <span style={{
                    fontSize: '11px',
                    fontWeight: 600,
                    letterSpacing: '0.05em',
                    textTransform: 'uppercase',
                    color: STATUS_COLORS[project.status] || 'var(--text-muted)',
                    background: `${STATUS_COLORS[project.status] || '#8B95A8'}18`,
                    border: `1px solid ${STATUS_COLORS[project.status] || '#8B95A8'}30`,
                    borderRadius: '6px',
                    padding: '3px 8px',
                  }}>
                    {STATUS_LABELS[project.status] || project.status}
                  </span>
                </div>

                {/* Project name */}
                <div style={{
                  fontFamily: 'Space Grotesk, -apple-system, sans-serif',
                  fontSize: '17px',
                  fontWeight: 700,
                  color: 'var(--text-primary)',
                  lineHeight: 1.35,
                }}>
                  {project.name}
                </div>

                {/* Stats row */}
                <div style={{ display: 'flex', gap: '16px' }}>
                  <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                    <strong style={{ color: 'var(--text-secondary)' }}>{project.sectionCount}</strong> section{project.sectionCount !== 1 ? 's' : ''}
                  </span>
                  <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                    <strong style={{ color: 'var(--text-secondary)' }}>{project.documentCount}</strong> doc{project.documentCount !== 1 ? 's' : ''}
                  </span>
                </div>

                {/* Last updated + arrow */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto' }}>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    Updated {formatDate(project.updatedAt)}
                  </span>
                  <svg width="16" height="16" fill="none" stroke="var(--accent)" strokeWidth={2} viewBox="0 0 24 24">
                    <line x1="5" y1="12" x2="19" y2="12"/>
                    <polyline points="12,5 19,12 12,19"/>
                  </svg>
                </div>
              </button>
            ))}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="portal-footer">
        <div className="portal-footer-inner">
          <div className="portal-footer-credit">
            Prepared by <strong>Rachna Builds</strong> &middot;{' '}
            <a href="mailto:rachnajain2103@gmail.com">rachnajain2103@gmail.com</a> &middot;{' '}
            <a href="https://rachnabuilds.com" target="_blank" rel="noopener noreferrer">rachnabuilds.com</a>
          </div>
        </div>
      </footer>

    </div>
  );
}
