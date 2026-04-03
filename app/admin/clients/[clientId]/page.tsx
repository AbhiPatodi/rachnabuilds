'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

const CLIENT_TYPES = [
  { value: 'new_build', label: 'New Build' },
  { value: 'existing_optimisation', label: 'Existing Optimisation' },
  { value: 'audit_only', label: 'Audit Only' },
  { value: 'retainer', label: 'Retainer' },
  { value: 'landing_page', label: 'Landing Page' },
  { value: 'migration', label: 'Migration' },
];

const PROJECT_STATUSES = [
  { value: 'draft', label: 'Draft' },
  { value: 'active', label: 'Active' },
  { value: 'completed', label: 'Completed' },
];

interface Project {
  id: string;
  name: string;
  clientType: string;
  status: string;
  createdAt: string;
  _count?: { sections: number; documents: number };
}

interface Client {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  slug: string;
  password?: string | null;
  isActive: boolean;
  createdAt: string;
  projects: Project[];
}

function formatDate(str: string) {
  return new Date(str).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function typeLabel(val: string) {
  return CLIENT_TYPES.find(t => t.value === val)?.label ?? val;
}

function statusColor(status: string) {
  if (status === 'active') return 'badge-green';
  if (status === 'completed') return 'badge-green';
  return 'badge-red';
}

export default function ClientDetailPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const clientId = params.clientId as string;

  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'overview' | 'projects'>('overview');

  // Overview edit state
  const [editingInfo, setEditingInfo] = useState(!!searchParams.get('edit'));
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [infoSaving, setInfoSaving] = useState(false);
  const [copiedPw, setCopiedPw] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);

  // Add project form
  const [showProjectForm, setShowProjectForm] = useState(false);
  const [projectName, setProjectName] = useState('');
  const [projectType, setProjectType] = useState('new_build');
  const [projectStatus, setProjectStatus] = useState('draft');
  const [projectLoading, setProjectLoading] = useState(false);
  const [projectError, setProjectError] = useState('');

  const fetchClient = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/clients/${clientId}`);
      if (!res.ok) { setError('Client not found'); return; }
      const data = await res.json();
      setClient(data);
      setEditName(data.name);
      setEditEmail(data.email ?? '');
      setEditPhone(data.phone ?? '');
    } catch {
      setError('Failed to load client');
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => { fetchClient(); }, [fetchClient]);

  const saveInfo = async () => {
    if (!client) return;
    setInfoSaving(true);
    try {
      const res = await fetch(`/api/admin/clients/${clientId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editName, email: editEmail, phone: editPhone }),
      });
      if (res.ok) {
        const data = await res.json();
        setClient(c => c ? { ...c, name: data.name, email: data.email, phone: data.phone } : c);
        setEditingInfo(false);
      }
    } catch {
      // silently fail
    } finally {
      setInfoSaving(false);
    }
  };

  const toggleActive = async () => {
    if (!client) return;
    const res = await fetch(`/api/admin/clients/${clientId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !client.isActive }),
    });
    if (res.ok) {
      setClient(c => c ? { ...c, isActive: !c.isActive } : c);
    }
  };

  const handleAddProject = async (e: React.FormEvent) => {
    e.preventDefault();
    setProjectError('');
    setProjectLoading(true);
    try {
      const res = await fetch(`/api/admin/clients/${clientId}/projects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: projectName, clientType: projectType, status: projectStatus }),
      });
      if (!res.ok) {
        setProjectError('Failed to create project');
        return;
      }
      const data = await res.json();
      setClient(c => c ? { ...c, projects: [...c.projects, data] } : c);
      setProjectName('');
      setProjectType('new_build');
      setProjectStatus('draft');
      setShowProjectForm(false);
      router.push(`/admin/projects/${data.id}`);
    } catch {
      setProjectError('Something went wrong');
    } finally {
      setProjectLoading(false);
    }
  };

  if (loading) return <div className="admin-content"><div className="admin-empty">Loading…</div></div>;
  if (error || !client) return <div className="admin-content"><div className="admin-alert admin-alert-error">{error || 'Not found'}</div></div>;

  const portalUrl = `rachnabuilds.com/portal/${client.slug}`;

  return (
    <div className="admin-content">
      <div className="admin-breadcrumb">
        <Link href="/admin/dashboard">Dashboard</Link>
        <span>/</span>
        <Link href="/admin/clients">Clients</Link>
        <span>/</span>
        <span className="current">{client.name}</span>
      </div>

      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">{client.name}</h1>
          <p className="admin-page-subtitle">{client.projects.length} project{client.projects.length !== 1 ? 's' : ''}</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <a
            href={`/portal/${client.slug}?preview=1`}
            target="_blank"
            rel="noopener noreferrer"
            className="admin-btn admin-btn-ghost"
            style={{ fontSize: 13, textDecoration: 'none' }}
          >
            Preview Portal
          </a>
          <button
            className={`admin-btn admin-btn-icon ${client.isActive ? 'admin-btn-danger' : 'admin-btn-ghost'}`}
            onClick={toggleActive}
            style={{ fontSize: 13 }}
          >
            {client.isActive ? 'Deactivate' : 'Activate'}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="settings-tabs">
        <button
          className={`settings-tab${activeTab === 'overview' ? ' active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          Overview
        </button>
        <button
          className={`settings-tab${activeTab === 'projects' ? ' active' : ''}`}
          onClick={() => setActiveTab('projects')}
        >
          Projects ({client.projects.length})
        </button>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Client Info */}
          <div className="admin-card">
            <div className="admin-card-title">
              Client Info
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  className="admin-btn admin-btn-ghost admin-btn-icon"
                  onClick={() => editingInfo ? setEditingInfo(false) : setEditingInfo(true)}
                  style={{ fontSize: 12 }}
                >
                  {editingInfo ? '✕ Cancel' : 'Edit'}
                </button>
              </div>
            </div>

            {editingInfo ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div className="admin-form-row">
                  <div className="admin-field">
                    <label className="admin-label">Name *</label>
                    <input className="admin-input" value={editName} onChange={e => setEditName(e.target.value)} />
                  </div>
                  <div className="admin-field">
                    <label className="admin-label">Email</label>
                    <input className="admin-input" type="email" value={editEmail} onChange={e => setEditEmail(e.target.value)} placeholder="client@example.com" />
                  </div>
                </div>
                <div className="admin-field" style={{ maxWidth: 300 }}>
                  <label className="admin-label">Phone</label>
                  <input className="admin-input" value={editPhone} onChange={e => setEditPhone(e.target.value)} placeholder="+91 98765 43210" />
                </div>
                <div>
                  <button className="admin-btn admin-btn-primary" onClick={saveInfo} disabled={infoSaving || !editName.trim()} style={{ fontSize: 13 }}>
                    {infoSaving ? 'Saving…' : 'Save Changes'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="admin-info-grid">
                <div className="admin-info-item">
                  <label>Name</label>
                  <span>{client.name}</span>
                </div>
                <div className="admin-info-item">
                  <label>Email</label>
                  <span>{client.email || '—'}</span>
                </div>
                <div className="admin-info-item">
                  <label>Phone</label>
                  <span>{client.phone || '—'}</span>
                </div>
                <div className="admin-info-item">
                  <label>Status</label>
                  <span>
                    <span className={`badge ${client.isActive ? 'badge-green' : 'badge-red'}`}>
                      <span className="badge-dot" />
                      {client.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </span>
                </div>
                <div className="admin-info-item">
                  <label>Created</label>
                  <span>{formatDate(client.createdAt)}</span>
                </div>
              </div>
            )}
          </div>

          {/* Portal Access */}
          <div className="admin-card">
            <div className="admin-card-title">Portal Access</div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="admin-field">
                <label className="admin-label">Portal URL</label>
                <div className="admin-link-row">
                  <span>{portalUrl}</span>
                  <button
                    className="admin-btn admin-btn-ghost admin-btn-icon"
                    style={{ fontSize: 11, flexShrink: 0 }}
                    onClick={() => {
                      navigator.clipboard.writeText(`https://${portalUrl}`);
                      setCopiedUrl(true);
                      setTimeout(() => setCopiedUrl(false), 2000);
                    }}
                  >
                    {copiedUrl ? '✓ Copied' : 'Copy'}
                  </button>
                </div>
              </div>

              <div className="admin-field">
                <label className="admin-label">Portal Password</label>
                <div className="admin-link-row">
                  <span style={{ fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.5px' }}>
                    {client.password || '—'}
                  </span>
                  {client.password && (
                    <button
                      className="admin-btn admin-btn-ghost admin-btn-icon"
                      style={{ fontSize: 11, flexShrink: 0 }}
                      onClick={() => {
                        navigator.clipboard.writeText(client.password!);
                        setCopiedPw(true);
                        setTimeout(() => setCopiedPw(false), 2000);
                      }}
                    >
                      {copiedPw ? '✓ Copied' : 'Copy'}
                    </button>
                  )}
                </div>
              </div>

              <div className="admin-field">
                <label className="admin-label">Slug</label>
                <div className="admin-slug-hint" style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                  {client.slug}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Projects Tab */}
      {activeTab === 'projects' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="admin-card">
            <div className="admin-card-title">
              Projects
              <button
                className="admin-btn admin-btn-primary admin-btn-icon"
                onClick={() => setShowProjectForm(!showProjectForm)}
                style={{ fontSize: 12 }}
              >
                {showProjectForm ? '✕ Cancel' : '+ Add Project'}
              </button>
            </div>

            {/* Add project inline form */}
            {showProjectForm && (
              <div className="admin-add-form-wrapper" style={{ marginBottom: 20 }}>
                <div className="admin-add-form-title">New Project</div>
                {projectError && <div className="admin-alert admin-alert-error" style={{ marginBottom: 12 }}>{projectError}</div>}
                <form onSubmit={handleAddProject} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div className="admin-field">
                    <label className="admin-label">Project Name *</label>
                    <input
                      className="admin-input"
                      placeholder="e.g. Shopify Store Redesign"
                      value={projectName}
                      onChange={e => setProjectName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="admin-form-row">
                    <div className="admin-field">
                      <label className="admin-label">Type</label>
                      <select className="admin-select" value={projectType} onChange={e => setProjectType(e.target.value)}>
                        {CLIENT_TYPES.map(t => (
                          <option key={t.value} value={t.value}>{t.label}</option>
                        ))}
                      </select>
                    </div>
                    <div className="admin-field">
                      <label className="admin-label">Status</label>
                      <select className="admin-select" value={projectStatus} onChange={e => setProjectStatus(e.target.value)}>
                        {PROJECT_STATUSES.map(s => (
                          <option key={s.value} value={s.value}>{s.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div>
                    <button type="submit" className="admin-btn admin-btn-primary" disabled={projectLoading} style={{ fontSize: 13 }}>
                      {projectLoading ? 'Creating…' : 'Create Project →'}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {client.projects.length === 0 ? (
              <div className="admin-empty">No projects yet. Click "Add Project" to get started.</div>
            ) : (
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Project Name</th>
                      <th>Type</th>
                      <th>Status</th>
                      <th>Sections</th>
                      <th>Docs</th>
                      <th>Created</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {client.projects.map(project => (
                      <tr
                        key={project.id}
                        style={{ cursor: 'pointer' }}
                        onClick={() => router.push(`/admin/projects/${project.id}`)}
                      >
                        <td style={{ fontWeight: 600, color: 'var(--text)' }}>{project.name}</td>
                        <td>
                          <span className="badge badge-green" style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>
                            {typeLabel(project.clientType)}
                          </span>
                        </td>
                        <td>
                          <span className={`badge ${statusColor(project.status)}`}>
                            <span className="badge-dot" />
                            {project.status}
                          </span>
                        </td>
                        <td style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12 }}>{project._count?.sections ?? 0}</td>
                        <td style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12 }}>{project._count?.documents ?? 0}</td>
                        <td style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{formatDate(project.createdAt)}</td>
                        <td onClick={e => e.stopPropagation()}>
                          <Link href={`/admin/projects/${project.id}`} className="admin-btn admin-btn-ghost admin-btn-icon" style={{ fontSize: 12 }}>
                            Manage →
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
