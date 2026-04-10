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

const OVERALL_STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  active:    { label: 'Active',    color: '#06D6A0', bg: 'rgba(6,214,160,0.12)'    },
  prospect:  { label: 'Prospect',  color: '#F59E0B', bg: 'rgba(245,158,11,0.12)'   },
  completed: { label: 'Completed', color: '#A78BFA', bg: 'rgba(167,139,250,0.12)'  },
  draft:     { label: 'Draft',     color: '#8B95A8', bg: 'rgba(139,149,168,0.12)'  },
  inactive:  { label: 'Inactive',  color: '#FF6B6B', bg: 'rgba(255,107,107,0.12)'  },
};

type FilterKey = 'all' | 'active' | 'prospect' | 'completed' | 'inactive';
const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'all',       label: 'All' },
  { key: 'active',    label: 'Active' },
  { key: 'prospect',  label: 'Prospects' },
  { key: 'completed', label: 'Completed' },
  { key: 'inactive',  label: 'Inactive' },
];

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
  overallStatus: string;
  statusIsManual: boolean;
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
  const [filter, setFilter] = useState<FilterKey>('all');
  const [statusChanging, setStatusChanging] = useState<string | null>(null);
  const [statusOpen, setStatusOpen] = useState<string | null>(null);

  const changeStatus = async (clientId: string, newStatus: string) => {
    setStatusChanging(clientId);
    setStatusOpen(null);
    try {
      const res = await fetch(`/api/admin/clients/${clientId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ overallStatus: newStatus }),
      });
      if (res.ok) {
        setClients(prev => prev.map(c =>
          c.id === clientId
            ? { ...c, overallStatus: newStatus || c.overallStatus, statusIsManual: !!newStatus }
            : c
        ));
      }
    } catch { /* silent */ }
    finally { setStatusChanging(null); }
  };

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

  const filteredClients = filter === 'all' ? clients : clients.filter(c => c.overallStatus === filter);

  // Count per filter for badges
  const counts = FILTERS.reduce((acc, f) => {
    acc[f.key] = f.key === 'all' ? clients.length : clients.filter(c => c.overallStatus === f.key).length;
    return acc;
  }, {} as Record<FilterKey, number>);

  return (
    <div className="admin-content">
      <style>{`
        @media (max-width: 600px) {
          .client-col-date { display: none; }
          .client-col-count { display: none; }
          .client-row { gap: 10px !important; padding: 14px 14px !important; }
        }
      `}</style>
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Clients</h1>
          <p className="admin-page-subtitle">Click a client to see their projects</p>
        </div>
        <Link href="/admin/clients/new" className="admin-btn admin-btn-primary">
          + New Client
        </Link>
      </div>

      {/* Filter bar */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {FILTERS.map(f => {
          const isActive = filter === f.key;
          const cfg = f.key !== 'all' ? OVERALL_STATUS_CONFIG[f.key] : null;
          return (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              style={{
                padding: '6px 14px',
                borderRadius: 8,
                border: isActive ? `1px solid ${cfg?.color ?? 'var(--accent)'}` : '1px solid var(--border)',
                background: isActive ? (cfg?.bg ?? 'rgba(6,214,160,0.12)') : 'var(--bg-card)',
                color: isActive ? (cfg?.color ?? 'var(--accent)') : 'var(--text-secondary)',
                fontSize: 13, fontWeight: isActive ? 700 : 400,
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
                transition: 'all 0.15s',
              }}
            >
              {f.label}
              {counts[f.key] > 0 && (
                <span style={{
                  background: isActive ? (cfg?.color ?? 'var(--accent)') : 'var(--bg-elevated)',
                  color: isActive ? '#0B0F1A' : 'var(--text-muted)',
                  borderRadius: 100, padding: '1px 7px', fontSize: 11, fontWeight: 700,
                }}>
                  {counts[f.key]}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {error && <div className="admin-alert admin-alert-error">{error}</div>}

      <div className="admin-card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div className="admin-empty">Loading clients…</div>
        ) : filteredClients.length === 0 ? (
          <div className="admin-empty">
            {filter === 'all'
              ? <><span>No clients yet. </span><Link href="/admin/clients/new" style={{ color: 'var(--accent)' }}>Create your first client →</Link></>
              : `No ${FILTERS.find(f => f.key === filter)?.label.toLowerCase()} clients.`
            }
          </div>
        ) : (
          <div>
            {filteredClients.map((client, i) => {
              const isExpanded = expanded === client.id;
              const projects = projectsCache[client.id] ?? [];
              const isLoadingProjects = projectsLoading === client.id;
              const statusCfg = OVERALL_STATUS_CONFIG[client.overallStatus] ?? OVERALL_STATUS_CONFIG['draft'];

              return (
                <div
                  key={client.id}
                  style={{ borderBottom: i < clients.length - 1 ? '1px solid var(--border)' : 'none' }}
                >
                  {/* Client row */}
                  <div
                    className="client-row"
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
                    <div className="client-col-count" style={{ fontSize: 12, color: 'var(--text-secondary)', flexShrink: 0 }}>
                      <span style={{ fontWeight: 600, color: 'var(--text)' }}>{client.projectCount}</span> project{client.projectCount !== 1 ? 's' : ''}
                    </div>

                    {/* Portal URL */}
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace', flexShrink: 0, display: 'none' as const }}>
                      /portal/{client.slug}
                    </div>

                    {/* Status — clickable dropdown */}
                    <div style={{ position: 'relative', flexShrink: 0 }} onClick={e => e.stopPropagation()}>
                      <button
                        onClick={() => setStatusOpen(statusOpen === client.id ? null : client.id)}
                        disabled={statusChanging === client.id}
                        style={{
                          fontSize: 11, fontWeight: 700, letterSpacing: '0.06em',
                          textTransform: 'uppercase', borderRadius: 6, padding: '3px 9px',
                          color: statusCfg.color, background: statusCfg.bg,
                          border: `1px solid ${statusCfg.color}44`,
                          display: 'flex', alignItems: 'center', gap: 5,
                          cursor: 'pointer',
                        }}
                      >
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: statusCfg.color, flexShrink: 0 }} />
                        {statusChanging === client.id ? '…' : statusCfg.label}
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><polyline points="6 9 12 15 18 9"/></svg>
                      </button>
                      {statusOpen === client.id && (
                        <div style={{
                          position: 'absolute', top: '110%', right: 0, zIndex: 50,
                          background: 'var(--bg-card)', border: '1px solid var(--border)',
                          borderRadius: 10, overflow: 'hidden', minWidth: 140,
                          boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
                        }}>
                          {(['prospect', 'active', 'completed', 'inactive'] as const).map(s => {
                            const cfg = OVERALL_STATUS_CONFIG[s];
                            const isCurrent = client.overallStatus === s;
                            return (
                              <button
                                key={s}
                                onClick={() => changeStatus(client.id, s)}
                                style={{
                                  width: '100%', textAlign: 'left', padding: '9px 14px',
                                  background: isCurrent ? 'var(--bg-elevated)' : 'transparent',
                                  border: 'none', cursor: 'pointer',
                                  display: 'flex', alignItems: 'center', gap: 8,
                                  color: isCurrent ? cfg.color : 'var(--text-secondary)',
                                  fontSize: 12, fontWeight: isCurrent ? 700 : 400,
                                }}
                              >
                                <span style={{ width: 8, height: 8, borderRadius: '50%', background: cfg.color, flexShrink: 0 }} />
                                {cfg.label}
                                {isCurrent && <span style={{ marginLeft: 'auto', fontSize: 10, opacity: 0.6 }}>current</span>}
                              </button>
                            );
                          })}
                          {client.statusIsManual && (
                            <button
                              onClick={() => changeStatus(client.id, '')}
                              style={{
                                width: '100%', textAlign: 'left', padding: '7px 14px',
                                background: 'transparent', border: 'none', borderTop: '1px solid var(--border)',
                                cursor: 'pointer', color: 'var(--text-muted)', fontSize: 11,
                              }}
                            >
                              ↺ Reset to auto-detect
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Last activity */}
                    <div className="client-col-date" style={{ fontSize: 12, color: 'var(--text-muted)', flexShrink: 0 }}>
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
