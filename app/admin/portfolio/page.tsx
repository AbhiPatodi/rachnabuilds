'use client';

import { useEffect, useState } from 'react';

interface StatItem {
  label: string;
  value: string;
}

interface Project {
  id: string;
  title: string;
  description: string;
  tags: string[];
  imageUrl: string | null;
  liveUrl: string | null;
  stats: StatItem[] | null;
  featured: boolean;
  isVisible: boolean;
  displayOrder: number;
  createdAt: string;
}

const emptyForm = {
  title: '',
  description: '',
  tags: '',
  imageUrl: '',
  liveUrl: '',
  stats: '',
  featured: false,
  isVisible: true,
  displayOrder: 0,
};

export default function PortfolioPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [showAddForm, setShowAddForm] = useState(false);
  const [addForm, setAddForm] = useState({ ...emptyForm });
  const [saving, setSaving] = useState(false);

  const [editId, setEditId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ ...emptyForm });
  const [editSaving, setEditSaving] = useState(false);

  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  async function loadProjects() {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/portfolio');
      if (!res.ok) throw new Error('Failed to load');
      const data = await res.json();
      setProjects(data);
    } catch {
      setError('Failed to load projects');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadProjects(); }, []);

  function parseStats(raw: string): StatItem[] | null {
    if (!raw.trim()) return null;
    try {
      return JSON.parse(raw);
    } catch {
      // Try simple label:value pairs
      return raw.split(',').map(s => {
        const [label, ...rest] = s.split(':');
        return { label: label.trim(), value: rest.join(':').trim() };
      }).filter(s => s.label && s.value);
    }
  }

  async function handleAdd() {
    if (!addForm.title || !addForm.description) {
      setError('Title and description are required');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/admin/portfolio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: addForm.title,
          description: addForm.description,
          tags: addForm.tags ? addForm.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
          imageUrl: addForm.imageUrl || null,
          liveUrl: addForm.liveUrl || null,
          stats: parseStats(addForm.stats),
          featured: addForm.featured,
          isVisible: addForm.isVisible,
          displayOrder: Number(addForm.displayOrder),
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || 'Failed to create');
      }
      setSuccess('Project created successfully');
      setAddForm({ ...emptyForm });
      setShowAddForm(false);
      loadProjects();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create project');
    } finally {
      setSaving(false);
    }
  }

  function startEdit(p: Project) {
    setEditId(p.id);
    setEditForm({
      title: p.title,
      description: p.description,
      tags: p.tags.join(', '),
      imageUrl: p.imageUrl || '',
      liveUrl: p.liveUrl || '',
      stats: p.stats ? JSON.stringify(p.stats, null, 2) : '',
      featured: p.featured,
      isVisible: p.isVisible,
      displayOrder: p.displayOrder,
    });
  }

  async function handleEdit() {
    if (!editId) return;
    setEditSaving(true);
    setError('');
    try {
      const res = await fetch(`/api/admin/portfolio/${editId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: editForm.title,
          description: editForm.description,
          tags: editForm.tags ? editForm.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
          imageUrl: editForm.imageUrl || null,
          liveUrl: editForm.liveUrl || null,
          stats: parseStats(editForm.stats),
          featured: editForm.featured,
          isVisible: editForm.isVisible,
          displayOrder: Number(editForm.displayOrder),
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || 'Failed to update');
      }
      setSuccess('Project updated');
      setEditId(null);
      loadProjects();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update project');
    } finally {
      setEditSaving(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      const res = await fetch(`/api/admin/portfolio/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete');
      setDeleteConfirm(null);
      setSuccess('Project deleted');
      loadProjects();
      setTimeout(() => setSuccess(''), 3000);
    } catch {
      setError('Failed to delete project');
    }
  }

  return (
    <div className="admin-content">
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Portfolio</h1>
          <p className="admin-page-subtitle">Manage your case studies and projects</p>
        </div>
        <button
          className="admin-btn admin-btn-primary"
          onClick={() => { setShowAddForm(!showAddForm); setError(''); }}
        >
          <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
            <path d="M12 5v14M5 12h14"/>
          </svg>
          Add Project
        </button>
      </div>

      {error && <div className="admin-alert admin-alert-error">{error}</div>}
      {success && <div className="admin-alert admin-alert-success">{success}</div>}

      {/* Add Form */}
      {showAddForm && (
        <div className="admin-add-form-wrapper" style={{ marginBottom: 24 }}>
          <div className="admin-add-form-title">
            <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path d="M12 5v14M5 12h14"/>
            </svg>
            New Project
          </div>
          <ProjectForm
            form={addForm}
            setForm={setAddForm as (f: typeof emptyForm) => void}
            onSave={handleAdd}
            onCancel={() => { setShowAddForm(false); setAddForm({ ...emptyForm }); }}
            saving={saving}
            submitLabel="Create Project"
          />
        </div>
      )}

      {/* Table */}
      <div className="admin-card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div className="admin-empty">Loading projects...</div>
        ) : projects.length === 0 ? (
          <div className="admin-empty">
            <div style={{ fontWeight: 600, marginBottom: 4 }}>No projects yet</div>
            <div>Add your first portfolio project above.</div>
          </div>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>Project</th>
                <th>Tags</th>
                <th>Flags</th>
                <th>Order</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {projects.map(p => (
                <>
                  <tr key={p.id}>
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--text)', marginBottom: 2 }}>{p.title}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {p.description}
                      </div>
                      {p.liveUrl && (
                        <div style={{ fontSize: 11, fontFamily: 'JetBrains Mono, monospace', color: 'var(--accent)', marginTop: 2 }}>
                          {p.liveUrl}
                        </div>
                      )}
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                        {p.tags.map(tag => (
                          <span key={tag} style={{
                            background: 'var(--bg-elevated)',
                            border: '1px solid var(--border)',
                            borderRadius: 6,
                            padding: '2px 8px',
                            fontSize: 11,
                            fontFamily: 'JetBrains Mono, monospace',
                            color: 'var(--text-secondary)',
                          }}>{tag}</span>
                        ))}
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        {p.featured && (
                          <span className="badge badge-green">
                            <span className="badge-dot" />Featured
                          </span>
                        )}
                        <span className={`badge ${p.isVisible ? 'badge-green' : 'badge-red'}`}>
                          <span className="badge-dot" />
                          {p.isVisible ? 'Visible' : 'Hidden'}
                        </span>
                      </div>
                    </td>
                    <td>
                      <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 13, color: 'var(--text-secondary)' }}>
                        {p.displayOrder}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button
                          className="admin-btn admin-btn-ghost admin-btn-icon"
                          onClick={() => editId === p.id ? setEditId(null) : startEdit(p)}
                        >
                          {editId === p.id ? 'Cancel' : 'Edit'}
                        </button>
                        {deleteConfirm === p.id ? (
                          <>
                            <button className="admin-btn admin-btn-danger admin-btn-icon" onClick={() => handleDelete(p.id)}>
                              Confirm
                            </button>
                            <button className="admin-btn admin-btn-ghost admin-btn-icon" onClick={() => setDeleteConfirm(null)}>
                              Cancel
                            </button>
                          </>
                        ) : (
                          <button
                            className="admin-btn admin-btn-danger admin-btn-icon"
                            onClick={() => setDeleteConfirm(p.id)}
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                  {editId === p.id && (
                    <tr key={`edit-${p.id}`}>
                      <td colSpan={5} style={{ padding: '16px 20px', background: 'var(--bg-elevated)' }}>
                        <div style={{ marginBottom: 12, fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>
                          Editing: {p.title}
                        </div>
                        <ProjectForm
                          form={editForm}
                          setForm={setEditForm as (f: typeof emptyForm) => void}
                          onSave={handleEdit}
                          onCancel={() => setEditId(null)}
                          saving={editSaving}
                          submitLabel="Save Changes"
                        />
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

interface ProjectFormProps {
  form: {
    title: string;
    description: string;
    tags: string;
    imageUrl: string;
    liveUrl: string;
    stats: string;
    featured: boolean;
    isVisible: boolean;
    displayOrder: number;
  };
  setForm: (f: ProjectFormProps['form']) => void;
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
  submitLabel: string;
}

function ProjectForm({ form, setForm, onSave, onCancel, saving, submitLabel }: ProjectFormProps) {
  const set = (key: string, value: unknown) => setForm({ ...form, [key]: value });

  return (
    <div className="admin-form">
      <div className="admin-form-row">
        <div className="admin-field">
          <label className="admin-label">Title *</label>
          <input className="admin-input" value={form.title} onChange={e => set('title', e.target.value)} placeholder="e.g. Sage & Veda Shopify Store" />
        </div>
        <div className="admin-field">
          <label className="admin-label">Display Order</label>
          <input className="admin-input" type="number" value={form.displayOrder} onChange={e => set('displayOrder', Number(e.target.value))} />
        </div>
      </div>
      <div className="admin-field">
        <label className="admin-label">Description *</label>
        <textarea className="admin-textarea" value={form.description} onChange={e => set('description', e.target.value)} placeholder="Short description of the project" style={{ minHeight: 80 }} />
      </div>
      <div className="admin-form-row">
        <div className="admin-field">
          <label className="admin-label">Tags (comma-separated)</label>
          <input className="admin-input" value={form.tags} onChange={e => set('tags', e.target.value)} placeholder="Shopify, Liquid, Performance" />
        </div>
        <div className="admin-field">
          <label className="admin-label">Live URL</label>
          <input className="admin-input" value={form.liveUrl} onChange={e => set('liveUrl', e.target.value)} placeholder="https://example.com" />
        </div>
      </div>
      <div className="admin-form-row">
        <div className="admin-field">
          <label className="admin-label">Image URL</label>
          <input className="admin-input" value={form.imageUrl} onChange={e => set('imageUrl', e.target.value)} placeholder="https://cdn.example.com/image.jpg" />
        </div>
        <div className="admin-field">
          <label className="admin-label">Stats (JSON array)</label>
          <input
            className="admin-input"
            value={form.stats}
            onChange={e => set('stats', e.target.value)}
            placeholder='[{"label":"Load Time","value":"2.8s"}]'
            style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12 }}
          />
        </div>
      </div>
      <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
        <label className="admin-toggle">
          <input type="checkbox" checked={form.featured} onChange={e => set('featured', e.target.checked)} />
          <span className="admin-toggle-slider" />
          Featured
        </label>
        <label className="admin-toggle">
          <input type="checkbox" checked={form.isVisible} onChange={e => set('isVisible', e.target.checked)} />
          <span className="admin-toggle-slider" />
          Visible
        </label>
      </div>
      <div style={{ display: 'flex', gap: 10, paddingTop: 4 }}>
        <button className="admin-btn admin-btn-primary" onClick={onSave} disabled={saving}>
          {saving ? 'Saving...' : submitLabel}
        </button>
        <button className="admin-btn admin-btn-ghost" onClick={onCancel} disabled={saving}>
          Cancel
        </button>
      </div>
    </div>
  );
}
