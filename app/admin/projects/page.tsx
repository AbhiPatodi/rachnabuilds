'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

const CLIENT_TYPES: Record<string, string> = {
  new_build: 'New Build',
  existing_optimisation: 'Existing Optimisation',
  audit_only: 'Audit Only',
  retainer: 'Retainer',
  landing_page: 'Landing Page',
  migration: 'Migration',
};

interface Project {
  id: string;
  name: string;
  clientType: string;
  status: string;
  createdAt: string;
  client: {
    id: string;
    name: string;
  };
  _count?: {
    sections: number;
    documents: number;
  };
}

function formatDate(str: string) {
  return new Date(str).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function statusColor(status: string) {
  if (status === 'active') return 'badge-green';
  if (status === 'completed') return 'badge-green';
  return 'badge-red';
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/admin/projects')
      .then(r => {
        if (!r.ok) throw new Error('Failed');
        return r.json();
      })
      .then(setProjects)
      .catch(() => setError('Failed to load projects'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="admin-content">
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">All Projects</h1>
          <p className="admin-page-subtitle">All client projects across all clients</p>
        </div>
        <Link href="/admin/clients/new" className="admin-btn admin-btn-ghost">
          + New Client
        </Link>
      </div>

      {error && <div className="admin-alert admin-alert-error">{error}</div>}

      <div className="admin-card">
        {loading ? (
          <div className="admin-empty">Loading projects…</div>
        ) : projects.length === 0 ? (
          <div className="admin-empty">
            No projects yet. <Link href="/admin/clients/new" style={{ color: 'var(--accent)' }}>Create a client first →</Link>
          </div>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Client</th>
                  <th>Project</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Sections</th>
                  <th>Docs</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                {projects.map(project => (
                  <tr key={project.id}>
                    <td>
                      <Link
                        href={`/admin/clients/${project.client.id}`}
                        style={{ color: 'var(--accent)', textDecoration: 'none', fontSize: 13, fontWeight: 500 }}
                        onClick={e => e.stopPropagation()}
                      >
                        {project.client.name}
                      </Link>
                    </td>
                    <td>
                      <Link
                        href={`/admin/projects/${project.id}`}
                        style={{ color: 'var(--text)', textDecoration: 'none', fontWeight: 600, fontSize: 14 }}
                      >
                        {project.name}
                      </Link>
                    </td>
                    <td>
                      <span style={{
                        fontFamily: 'JetBrains Mono, monospace',
                        fontSize: 10,
                        padding: '3px 8px',
                        borderRadius: 100,
                        background: 'var(--bg-elevated)',
                        border: '1px solid var(--border)',
                        color: 'var(--text-secondary)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.06em',
                      }}>
                        {CLIENT_TYPES[project.clientType] ?? project.clientType}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${statusColor(project.status)}`}>
                        <span className="badge-dot" />
                        {project.status}
                      </span>
                    </td>
                    <td style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12 }}>
                      {project._count?.sections ?? 0}
                    </td>
                    <td style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12 }}>
                      {project._count?.documents ?? 0}
                    </td>
                    <td style={{ color: 'var(--text-secondary)', fontSize: 12 }}>
                      {formatDate(project.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
