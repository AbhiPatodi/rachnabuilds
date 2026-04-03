'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

const CLIENT_TYPE_LABELS: Record<string, string> = {
  new_build: 'New Build',
  existing_optimisation: 'Optimisation',
  audit_only: 'Audit',
  retainer: 'Retainer',
  landing_page: 'Landing Page',
  migration: 'Migration',
};

const STATUS_COLORS: Record<string, string> = {
  draft: '#8B95A8',
  active: '#06D6A0',
  completed: '#A78BFA',
};

interface Project {
  id: string;
  name: string;
  clientType: string;
  status: string;
  updatedAt: string;
  _count?: { sections: number; documents: number };
}

interface Client {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  slug: string;
  isActive: boolean;
  createdAt: string;
  projectCount: number;
  lastActivity: string;
  projects?: Project[];
}

function formatDate(str: string) {
  return new Date(str).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function ClientsPage() {
  const router = useRouter();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [projectsCache, setProjectsCache] = useState<Record<string, Project[]>>({});
  const [projectsLoading, setProjectsLoading] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/admin/clients')
      .then(r => { if (!r.ok) throw new Error(); return r.json(); })
      .then(setClients)
      .catch(() => setError('Failed to load clients'))
      .finally(() => setLoading(false));
  }, []);

  const toggleExpand = async (clientId: string) => {
    if (expanded === clientId) { setExpanded(null); return; }
    setExpanded(clientId);
    if (projectsCache[clientId]) return;
    setProjectsLoading(clientId);
    try {
      const res = await fetch(`/api/admin/clients/${clientId}`);
      const data = await res.json();
      setProjectsCache(c => ({ ...c, [clientId]: data.projects ?? [] }));
    } catch {
      setProjectsCache(c => ({ ...c, [clientId]: [] }));
    } finally {
      setProjectsLoading(null);
    }
  };

  return (
    <div className="admin-content">
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Clients</h1>
          <p className="admin-page-subtitle">Click a client to see their projects</p>
        </div>
        <Link href="/admin/clients/new" className="admin-btn admin-btn-primary">
          + New Client
        </Link>
      </div>

      {error && <div className="admin-alert admin-alert-error">{error}</div>}

      <div className="admin-card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div className="admin-empty">Loading clients…</div>
        ) : clients.length === 0 ? (
          <div className="admin-empty">
            No clients yet. <Link href="/admin/clients/new" style={{ color: 'var(--accent)' }}>Create your first client →</Link>
          </div>
        ) : (
          <div>
            {clients.map((client, i) => {
              const isExpanded = expanded === client.id;
              const projects = projectsCache[client.id] ?? [];
              const isLoadingProjects = projectsLoading === client.id;

              return (
                <div
                  key={client.id}
                  style={{ borderBottom: i < clients.length - 1 ? '1px solid var(--border)' : 'none' }}
                >
                  {/* Client row */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 16,
                      padding: '16px 20px',
                      cursor: 'pointer',
                      background: isExpanded ? 'var(--bg-elevated)' : 'transparent',
                      transition: 'background 0.15s',
                    }}
                    onClick={() => toggleExpand(client.id)}
                  >
                    {/* Expand arrow */}
                    <svg
                      width="14" height="14" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"
                      style={{ flexShrink: 0, color: 'var(--text-muted)', transition: 'transform 0.15s', transform: isExpanded ? 'rotate(90deg)' : 'none' }}
                    >
                      <polyline points="9,18 15,12 9,6" />
                    </svg>

                    {/* Client name + email */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, color: 'var(--text)', fontSize: 15 }}>{client.name}</div>
                      {client.email && (
                        <div style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace', marginTop: 1 }}>
                          {client.email}
                        </div>
                      )}
                    </div>

                    {/* Project count */}
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)', flexShrink: 0 }}>
                      <span style={{ fontWeight: 600, color: 'var(--text)' }}>{client.projectCount}</span> project{client.projectCount !== 1 ? 's' : ''}
                    </div>

                    {/* Portal URL */}
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace', flexShrink: 0, display: 'none' as const }}>
                      /portal/{client.slug}
                    </div>

                    {/* Status */}
                    <span className={`badge ${client.isActive ? 'badge-green' : 'badge-red'}`} style={{ flexShrink: 0 }}>
                      <span className="badge-dot" />
                      {client.isActive ? 'Active' : 'Inactive'}
                    </span>

                    {/* Last activity */}
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', flexShrink: 0 }}>
                      {formatDate(client.lastActivity)}
                    </div>

                    {/* Actions — stop propagation */}
                    <div style={{ display: 'flex', gap: 6, flexShrink: 0 }} onClick={e => e.stopPropagation()}>
                      <Link
                        href={`/admin/clients/${client.id}?edit=1`}
                        className="admin-btn admin-btn-ghost admin-btn-icon"
                        style={{ fontSize: 11 }}
                      >
                        Edit
                      </Link>
                    </div>
                  </div>

                  {/* Expanded projects */}
                  {isExpanded && (
                    <div style={{ background: 'var(--bg-elevated)', borderTop: '1px solid var(--border)', padding: '12px 20px 12px 52px' }}>
                      {isLoadingProjects ? (
                        <div style={{ fontSize: 13, color: 'var(--text-muted)', padding: '8px 0' }}>Loading projects…</div>
                      ) : projects.length === 0 ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>No projects yet.</span>
                          <Link
                            href={`/admin/clients/${client.id}`}
                            className="admin-btn admin-btn-ghost admin-btn-icon"
                            style={{ fontSize: 11 }}
                          >
                            + Add Project
                          </Link>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          {projects.map(p => (
                            <div
                              key={p.id}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 12,
                                padding: '10px 14px',
                                borderRadius: 10,
                                border: '1px solid var(--border)',
                                background: 'var(--bg)',
                                cursor: 'pointer',
                                transition: 'border-color 0.15s',
                              }}
                              onClick={() => router.push(`/admin/projects/${p.id}`)}
                              onMouseEnter={e => (e.currentTarget.style.borderColor = '#06D6A0')}
                              onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
                            >
                              {/* Status dot */}
                              <div style={{ width: 8, height: 8, borderRadius: '50%', background: STATUS_COLORS[p.status] || '#8B95A8', flexShrink: 0 }} />

                              {/* Project name */}
                              <div style={{ flex: 1, fontWeight: 600, fontSize: 14, color: 'var(--text)' }}>{p.name}</div>

                              {/* Type badge */}
                              <span style={{
                                fontSize: 10, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase',
                                color: '#06D6A0', background: 'rgba(6,214,160,0.1)', border: '1px solid rgba(6,214,160,0.2)',
                                borderRadius: 6, padding: '2px 7px', flexShrink: 0,
                              }}>
                                {CLIENT_TYPE_LABELS[p.clientType] || p.clientType}
                              </span>

                              {/* Sections/docs count */}
                              {p._count && (
                                <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace', flexShrink: 0 }}>
                                  {p._count.sections}s / {p._count.documents}d
                                </div>
                              )}

                              {/* Open arrow */}
                              <svg width="14" height="14" fill="none" stroke="#06D6A0" strokeWidth={2} viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
                                <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12,5 19,12 12,19"/>
                              </svg>
                            </div>
                          ))}

                          <div style={{ marginTop: 4 }}>
                            <Link
                              href={`/admin/clients/${client.id}`}
                              className="admin-btn admin-btn-ghost admin-btn-icon"
                              style={{ fontSize: 11 }}
                              onClick={e => e.stopPropagation()}
                            >
                              + Add Project
                            </Link>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
