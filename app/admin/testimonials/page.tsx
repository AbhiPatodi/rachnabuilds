'use client';

import { useEffect, useState } from 'react';

interface Testimonial {
  id: string;
  clientName: string;
  role: string | null;
  company: string | null;
  quote: string;
  projectName: string | null;
  rating: number;
  isVisible: boolean;
  displayOrder: number;
  createdAt: string;
}

const emptyForm = {
  clientName: '',
  role: '',
  company: '',
  quote: '',
  projectName: '',
  rating: 5,
  isVisible: true,
  displayOrder: 0,
};

export default function TestimonialsPage() {
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
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

  async function loadTestimonials() {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/testimonials');
      if (!res.ok) throw new Error('Failed to load');
      setTestimonials(await res.json());
    } catch {
      setError('Failed to load testimonials');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadTestimonials(); }, []);

  async function handleAdd() {
    if (!addForm.clientName || !addForm.quote) {
      setError('Client name and quote are required');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/admin/testimonials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientName: addForm.clientName,
          role: addForm.role || null,
          company: addForm.company || null,
          quote: addForm.quote,
          projectName: addForm.projectName || null,
          rating: Number(addForm.rating),
          isVisible: addForm.isVisible,
          displayOrder: Number(addForm.displayOrder),
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || 'Failed to create');
      }
      setSuccess('Testimonial created');
      setAddForm({ ...emptyForm });
      setShowAddForm(false);
      loadTestimonials();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create testimonial');
    } finally {
      setSaving(false);
    }
  }

  function startEdit(t: Testimonial) {
    setEditId(t.id);
    setEditForm({
      clientName: t.clientName,
      role: t.role || '',
      company: t.company || '',
      quote: t.quote,
      projectName: t.projectName || '',
      rating: t.rating,
      isVisible: t.isVisible,
      displayOrder: t.displayOrder,
    });
  }

  async function handleEdit() {
    if (!editId) return;
    setEditSaving(true);
    setError('');
    try {
      const res = await fetch(`/api/admin/testimonials/${editId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientName: editForm.clientName,
          role: editForm.role || null,
          company: editForm.company || null,
          quote: editForm.quote,
          projectName: editForm.projectName || null,
          rating: Number(editForm.rating),
          isVisible: editForm.isVisible,
          displayOrder: Number(editForm.displayOrder),
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || 'Failed to update');
      }
      setSuccess('Testimonial updated');
      setEditId(null);
      loadTestimonials();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update testimonial');
    } finally {
      setEditSaving(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      const res = await fetch(`/api/admin/testimonials/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete');
      setDeleteConfirm(null);
      setSuccess('Testimonial deleted');
      loadTestimonials();
      setTimeout(() => setSuccess(''), 3000);
    } catch {
      setError('Failed to delete testimonial');
    }
  }

  function renderStars(n: number) {
    return Array.from({ length: 5 }).map((_, i) => (
      <span key={i} style={{ color: i < n ? '#FBBF24' : 'var(--border)', fontSize: 14 }}>★</span>
    ));
  }

  return (
    <div className="admin-content">
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Testimonials</h1>
          <p className="admin-page-subtitle">Manage client reviews and social proof</p>
        </div>
        <button
          className="admin-btn admin-btn-primary"
          onClick={() => { setShowAddForm(!showAddForm); setError(''); }}
        >
          <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
            <path d="M12 5v14M5 12h14"/>
          </svg>
          Add Testimonial
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
            New Testimonial
          </div>
          <TestimonialForm
            form={addForm}
            setForm={setAddForm as (f: typeof emptyForm) => void}
            onSave={handleAdd}
            onCancel={() => { setShowAddForm(false); setAddForm({ ...emptyForm }); }}
            saving={saving}
            submitLabel="Create Testimonial"
          />
        </div>
      )}

      <div className="admin-card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div className="admin-empty">Loading testimonials...</div>
        ) : testimonials.length === 0 ? (
          <div className="admin-empty">
            <div style={{ fontWeight: 600, marginBottom: 4 }}>No testimonials yet</div>
            <div>Add your first client testimonial above.</div>
          </div>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>Client</th>
                <th>Quote</th>
                <th>Rating</th>
                <th>Status</th>
                <th>Order</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {testimonials.map(t => (
                <>
                  <tr key={t.id}>
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--text)' }}>{t.clientName}</div>
                      {(t.role || t.company) && (
                        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                          {[t.role, t.company].filter(Boolean).join(' @ ')}
                        </div>
                      )}
                      {t.projectName && (
                        <div style={{ fontSize: 11, color: 'var(--accent)', fontFamily: 'JetBrains Mono, monospace', marginTop: 2 }}>
                          {t.projectName}
                        </div>
                      )}
                    </td>
                    <td>
                      <div style={{ fontSize: 13, color: 'var(--text-secondary)', maxWidth: 320, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        &ldquo;{t.quote}&rdquo;
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 2 }}>{renderStars(t.rating)}</div>
                    </td>
                    <td>
                      <span className={`badge ${t.isVisible ? 'badge-green' : 'badge-red'}`}>
                        <span className="badge-dot" />
                        {t.isVisible ? 'Visible' : 'Hidden'}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 13, color: 'var(--text-secondary)' }}>
                        {t.displayOrder}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button
                          className="admin-btn admin-btn-ghost admin-btn-icon"
                          onClick={() => editId === t.id ? setEditId(null) : startEdit(t)}
                        >
                          {editId === t.id ? 'Cancel' : 'Edit'}
                        </button>
                        {deleteConfirm === t.id ? (
                          <>
                            <button className="admin-btn admin-btn-danger admin-btn-icon" onClick={() => handleDelete(t.id)}>
                              Confirm
                            </button>
                            <button className="admin-btn admin-btn-ghost admin-btn-icon" onClick={() => setDeleteConfirm(null)}>
                              Cancel
                            </button>
                          </>
                        ) : (
                          <button
                            className="admin-btn admin-btn-danger admin-btn-icon"
                            onClick={() => setDeleteConfirm(t.id)}
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                  {editId === t.id && (
                    <tr key={`edit-${t.id}`}>
                      <td colSpan={6} style={{ padding: '16px 20px', background: 'var(--bg-elevated)' }}>
                        <div style={{ marginBottom: 12, fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>
                          Editing: {t.clientName}
                        </div>
                        <TestimonialForm
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

interface TestimonialFormProps {
  form: {
    clientName: string;
    role: string;
    company: string;
    quote: string;
    projectName: string;
    rating: number;
    isVisible: boolean;
    displayOrder: number;
  };
  setForm: (f: TestimonialFormProps['form']) => void;
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
  submitLabel: string;
}

function TestimonialForm({ form, setForm, onSave, onCancel, saving, submitLabel }: TestimonialFormProps) {
  const set = (key: string, value: unknown) => setForm({ ...form, [key]: value });

  return (
    <div className="admin-form">
      <div className="admin-form-row">
        <div className="admin-field">
          <label className="admin-label">Client Name *</label>
          <input className="admin-input" value={form.clientName} onChange={e => set('clientName', e.target.value)} placeholder="e.g. Sarah Johnson" />
        </div>
        <div className="admin-field">
          <label className="admin-label">Project Name</label>
          <input className="admin-input" value={form.projectName} onChange={e => set('projectName', e.target.value)} placeholder="e.g. Sage & Veda Shopify Store" />
        </div>
      </div>
      <div className="admin-form-row">
        <div className="admin-field">
          <label className="admin-label">Role</label>
          <input className="admin-input" value={form.role} onChange={e => set('role', e.target.value)} placeholder="e.g. Founder" />
        </div>
        <div className="admin-field">
          <label className="admin-label">Company</label>
          <input className="admin-input" value={form.company} onChange={e => set('company', e.target.value)} placeholder="e.g. Sage & Veda" />
        </div>
      </div>
      <div className="admin-field">
        <label className="admin-label">Quote *</label>
        <textarea className="admin-textarea" value={form.quote} onChange={e => set('quote', e.target.value)} placeholder="What did the client say?" style={{ minHeight: 80 }} />
      </div>
      <div className="admin-form-row">
        <div className="admin-field">
          <label className="admin-label">Rating (1-5)</label>
          <select className="admin-select" value={form.rating} onChange={e => set('rating', Number(e.target.value))}>
            <option value={5}>5 stars</option>
            <option value={4}>4 stars</option>
            <option value={3}>3 stars</option>
            <option value={2}>2 stars</option>
            <option value={1}>1 star</option>
          </select>
        </div>
        <div className="admin-field">
          <label className="admin-label">Display Order</label>
          <input className="admin-input" type="number" value={form.displayOrder} onChange={e => set('displayOrder', Number(e.target.value))} />
        </div>
      </div>
      <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
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
