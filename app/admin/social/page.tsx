'use client';

import React, { useEffect, useState } from 'react';

interface SocialLink {
  id: string;
  platform: string;
  url: string;
  handle: string | null;
  isVisible: boolean;
  displayOrder: number;
}

const emptyForm = {
  platform: '',
  url: '',
  handle: '',
  isVisible: true,
  displayOrder: 0,
};

const PLATFORMS = [
  'instagram',
  'linkedin',
  'twitter',
  'youtube',
  'pinterest',
  'tiktok',
  'facebook',
  'whatsapp',
];

const PLATFORM_COLORS: Record<string, string> = {
  instagram: '#E1306C',
  linkedin: '#0A66C2',
  twitter: '#1DA1F2',
  youtube: '#FF0000',
  pinterest: '#E60023',
  tiktok: '#010101',
  facebook: '#1877F2',
  whatsapp: '#25D366',
};

const PLATFORM_ICONS: Record<string, React.ReactElement> = {
  instagram: (
    <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <rect x="2" y="2" width="20" height="20" rx="5"/>
      <circle cx="12" cy="12" r="4"/>
      <circle cx="17.5" cy="6.5" r="0.5" fill="currentColor"/>
    </svg>
  ),
  linkedin: (
    <svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24">
      <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6zM2 9h4v12H2z"/>
      <circle cx="4" cy="4" r="2"/>
    </svg>
  ),
  twitter: (
    <svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
    </svg>
  ),
  youtube: (
    <svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24">
      <path d="M22.54 6.42a2.78 2.78 0 0 0-1.95-1.97C18.88 4 12 4 12 4s-6.88 0-8.59.46A2.78 2.78 0 0 0 1.46 6.42 29 29 0 0 0 1 12a29 29 0 0 0 .46 5.58 2.78 2.78 0 0 0 1.95 1.97C5.12 20 12 20 12 20s6.88 0 8.59-.46a2.78 2.78 0 0 0 1.96-1.97A29 29 0 0 0 23 12a29 29 0 0 0-.46-5.58z"/>
      <polygon points="9.75 15.02 15.5 12 9.75 8.98 9.75 15.02" fill="white"/>
    </svg>
  ),
  pinterest: (
    <svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 0C5.373 0 0 5.373 0 12c0 5.084 3.163 9.426 7.627 11.174-.105-.949-.2-2.405.042-3.441.218-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738a.36.36 0 0 1 .083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.632-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0z"/>
    </svg>
  ),
  tiktok: (
    <svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24">
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.91a8.16 8.16 0 0 0 4.77 1.52V7A4.85 4.85 0 0 1 19.59 6.69z"/>
    </svg>
  ),
  facebook: (
    <svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24">
      <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>
    </svg>
  ),
  whatsapp: (
    <svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/>
    </svg>
  ),
};

export default function SocialLinksPage() {
  const [links, setLinks] = useState<SocialLink[]>([]);
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

  async function loadLinks() {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/social');
      if (!res.ok) throw new Error('Failed to load');
      setLinks(await res.json());
    } catch {
      setError('Failed to load social links');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadLinks(); }, []);

  async function handleAdd() {
    if (!addForm.platform || !addForm.url) {
      setError('Platform and URL are required');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/admin/social', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          platform: addForm.platform,
          url: addForm.url,
          handle: addForm.handle || null,
          isVisible: addForm.isVisible,
          displayOrder: Number(addForm.displayOrder),
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || 'Failed to create');
      }
      setSuccess('Social link created');
      setAddForm({ ...emptyForm });
      setShowAddForm(false);
      loadLinks();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create social link');
    } finally {
      setSaving(false);
    }
  }

  function startEdit(l: SocialLink) {
    setEditId(l.id);
    setEditForm({
      platform: l.platform,
      url: l.url,
      handle: l.handle || '',
      isVisible: l.isVisible,
      displayOrder: l.displayOrder,
    });
  }

  async function handleEdit() {
    if (!editId) return;
    setEditSaving(true);
    setError('');
    try {
      const res = await fetch(`/api/admin/social/${editId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          platform: editForm.platform,
          url: editForm.url,
          handle: editForm.handle || null,
          isVisible: editForm.isVisible,
          displayOrder: Number(editForm.displayOrder),
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || 'Failed to update');
      }
      setSuccess('Social link updated');
      setEditId(null);
      loadLinks();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update social link');
    } finally {
      setEditSaving(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      const res = await fetch(`/api/admin/social/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete');
      setDeleteConfirm(null);
      setSuccess('Social link deleted');
      loadLinks();
      setTimeout(() => setSuccess(''), 3000);
    } catch {
      setError('Failed to delete social link');
    }
  }

  function PlatformBadge({ platform }: { platform: string }) {
    const color = PLATFORM_COLORS[platform.toLowerCase()] || 'var(--text-secondary)';
    const icon = PLATFORM_ICONS[platform.toLowerCase()];
    return (
      <span style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '3px 10px',
        borderRadius: 20,
        fontSize: 12,
        fontWeight: 600,
        fontFamily: 'JetBrains Mono, monospace',
        textTransform: 'capitalize',
        background: `${color}18`,
        color,
        border: `1px solid ${color}30`,
      }}>
        {icon}
        {platform}
      </span>
    );
  }

  return (
    <div className="admin-content">
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Social Links</h1>
          <p className="admin-page-subtitle">Manage your social media presence</p>
        </div>
        <button
          className="admin-btn admin-btn-primary"
          onClick={() => { setShowAddForm(!showAddForm); setError(''); }}
        >
          <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
            <path d="M12 5v14M5 12h14"/>
          </svg>
          Add Link
        </button>
      </div>

      {error && <div className="admin-alert admin-alert-error">{error}</div>}
      {success && <div className="admin-alert admin-alert-success">{success}</div>}

      {showAddForm && (
        <div className="admin-add-form-wrapper" style={{ marginBottom: 24 }}>
          <div className="admin-add-form-title">
            <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path d="M12 5v14M5 12h14"/>
            </svg>
            New Social Link
          </div>
          <SocialForm
            form={addForm}
            setForm={setAddForm as (f: typeof emptyForm) => void}
            onSave={handleAdd}
            onCancel={() => { setShowAddForm(false); setAddForm({ ...emptyForm }); }}
            saving={saving}
            submitLabel="Create Link"
          />
        </div>
      )}

      <div className="admin-card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div className="admin-empty">Loading social links...</div>
        ) : links.length === 0 ? (
          <div className="admin-empty">
            <div style={{ fontWeight: 600, marginBottom: 4 }}>No social links yet</div>
            <div>Add your first social media link above.</div>
          </div>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>Platform</th>
                <th>Handle</th>
                <th>URL</th>
                <th>Status</th>
                <th>Order</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {links.map(l => (
                <>
                  <tr key={l.id}>
                    <td>
                      <PlatformBadge platform={l.platform} />
                    </td>
                    <td>
                      <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 13, color: 'var(--text-secondary)' }}>
                        {l.handle || '—'}
                      </span>
                    </td>
                    <td>
                      <a
                        href={l.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ fontSize: 12, fontFamily: 'JetBrains Mono, monospace', color: 'var(--accent)', textDecoration: 'none', maxWidth: 280, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                      >
                        {l.url}
                      </a>
                    </td>
                    <td>
                      <span className={`badge ${l.isVisible ? 'badge-green' : 'badge-red'}`}>
                        <span className="badge-dot" />
                        {l.isVisible ? 'Visible' : 'Hidden'}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 13, color: 'var(--text-secondary)' }}>
                        {l.displayOrder}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button
                          className="admin-btn admin-btn-ghost admin-btn-icon"
                          onClick={() => editId === l.id ? setEditId(null) : startEdit(l)}
                        >
                          {editId === l.id ? 'Cancel' : 'Edit'}
                        </button>
                        {deleteConfirm === l.id ? (
                          <>
                            <button className="admin-btn admin-btn-danger admin-btn-icon" onClick={() => handleDelete(l.id)}>
                              Confirm
                            </button>
                            <button className="admin-btn admin-btn-ghost admin-btn-icon" onClick={() => setDeleteConfirm(null)}>
                              Cancel
                            </button>
                          </>
                        ) : (
                          <button
                            className="admin-btn admin-btn-danger admin-btn-icon"
                            onClick={() => setDeleteConfirm(l.id)}
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                  {editId === l.id && (
                    <tr key={`edit-${l.id}`}>
                      <td colSpan={6} style={{ padding: '16px 20px', background: 'var(--bg-elevated)' }}>
                        <div style={{ marginBottom: 12, fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>
                          Editing: {l.platform}
                        </div>
                        <SocialForm
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

interface SocialFormProps {
  form: {
    platform: string;
    url: string;
    handle: string;
    isVisible: boolean;
    displayOrder: number;
  };
  setForm: (f: SocialFormProps['form']) => void;
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
  submitLabel: string;
}

function SocialForm({ form, setForm, onSave, onCancel, saving, submitLabel }: SocialFormProps) {
  const set = (key: string, value: unknown) => setForm({ ...form, [key]: value });

  return (
    <div className="admin-form">
      <div className="admin-form-row">
        <div className="admin-field">
          <label className="admin-label">Platform *</label>
          <select className="admin-select" value={form.platform} onChange={e => set('platform', e.target.value)}>
            <option value="">Select platform...</option>
            {PLATFORMS.map(p => (
              <option key={p} value={p} style={{ textTransform: 'capitalize' }}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
            ))}
          </select>
        </div>
        <div className="admin-field">
          <label className="admin-label">Handle</label>
          <input className="admin-input" value={form.handle} onChange={e => set('handle', e.target.value)} placeholder="e.g. @rachnabuilds" />
        </div>
      </div>
      <div className="admin-field">
        <label className="admin-label">URL *</label>
        <input className="admin-input" value={form.url} onChange={e => set('url', e.target.value)} placeholder="https://instagram.com/rachnabuilds" />
      </div>
      <div className="admin-form-row">
        <div className="admin-field">
          <label className="admin-label">Display Order</label>
          <input className="admin-input" type="number" value={form.displayOrder} onChange={e => set('displayOrder', Number(e.target.value))} />
        </div>
        <div className="admin-field" style={{ justifyContent: 'flex-end' }}>
          <label className="admin-toggle" style={{ marginTop: 24 }}>
            <input type="checkbox" checked={form.isVisible} onChange={e => set('isVisible', e.target.checked)} />
            <span className="admin-toggle-slider" />
            Visible
          </label>
        </div>
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
