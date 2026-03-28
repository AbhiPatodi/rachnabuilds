'use client';

import { useEffect, useState } from 'react';

interface Faq {
  id: string;
  question: string;
  answer: string;
  category: string | null;
  displayOrder: number;
  isVisible: boolean;
  createdAt: string;
}

const emptyForm = {
  question: '',
  answer: '',
  category: '',
  displayOrder: 0,
  isVisible: true,
};

export default function FaqsPage() {
  const [faqs, setFaqs] = useState<Faq[]>([]);
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

  async function loadFaqs() {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/faqs');
      if (!res.ok) throw new Error('Failed to load');
      setFaqs(await res.json());
    } catch {
      setError('Failed to load FAQs');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadFaqs(); }, []);

  async function handleAdd() {
    if (!addForm.question || !addForm.answer) {
      setError('Question and answer are required');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/admin/faqs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: addForm.question,
          answer: addForm.answer,
          category: addForm.category || null,
          displayOrder: Number(addForm.displayOrder),
          isVisible: addForm.isVisible,
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || 'Failed to create');
      }
      setSuccess('FAQ created');
      setAddForm({ ...emptyForm });
      setShowAddForm(false);
      loadFaqs();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create FAQ');
    } finally {
      setSaving(false);
    }
  }

  function startEdit(f: Faq) {
    setEditId(f.id);
    setEditForm({
      question: f.question,
      answer: f.answer,
      category: f.category || '',
      displayOrder: f.displayOrder,
      isVisible: f.isVisible,
    });
  }

  async function handleEdit() {
    if (!editId) return;
    setEditSaving(true);
    setError('');
    try {
      const res = await fetch(`/api/admin/faqs/${editId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: editForm.question,
          answer: editForm.answer,
          category: editForm.category || null,
          displayOrder: Number(editForm.displayOrder),
          isVisible: editForm.isVisible,
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || 'Failed to update');
      }
      setSuccess('FAQ updated');
      setEditId(null);
      loadFaqs();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update FAQ');
    } finally {
      setEditSaving(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      const res = await fetch(`/api/admin/faqs/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete');
      setDeleteConfirm(null);
      setSuccess('FAQ deleted');
      loadFaqs();
      setTimeout(() => setSuccess(''), 3000);
    } catch {
      setError('Failed to delete FAQ');
    }
  }

  // Group FAQs by category for display
  const categories = Array.from(new Set(faqs.map(f => f.category || 'General')));

  return (
    <div className="admin-content">
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">FAQs</h1>
          <p className="admin-page-subtitle">Manage frequently asked questions</p>
        </div>
        <button
          className="admin-btn admin-btn-primary"
          onClick={() => { setShowAddForm(!showAddForm); setError(''); }}
        >
          <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
            <path d="M12 5v14M5 12h14"/>
          </svg>
          Add FAQ
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
            New FAQ
          </div>
          <FaqForm
            form={addForm}
            setForm={setAddForm as (f: typeof emptyForm) => void}
            categories={categories}
            onSave={handleAdd}
            onCancel={() => { setShowAddForm(false); setAddForm({ ...emptyForm }); }}
            saving={saving}
            submitLabel="Create FAQ"
          />
        </div>
      )}

      <div className="admin-card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div className="admin-empty">Loading FAQs...</div>
        ) : faqs.length === 0 ? (
          <div className="admin-empty">
            <div style={{ fontWeight: 600, marginBottom: 4 }}>No FAQs yet</div>
            <div>Add your first FAQ above.</div>
          </div>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>Question</th>
                <th>Answer</th>
                <th>Category</th>
                <th>Status</th>
                <th>Order</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {faqs.map(f => (
                <>
                  <tr key={f.id}>
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--text)', maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {f.question}
                      </div>
                    </td>
                    <td>
                      <div style={{ fontSize: 13, color: 'var(--text-secondary)', maxWidth: 320, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {f.answer}
                      </div>
                    </td>
                    <td>
                      {f.category ? (
                        <span style={{
                          background: 'var(--bg-elevated)',
                          border: '1px solid var(--border)',
                          borderRadius: 6,
                          padding: '2px 10px',
                          fontSize: 11,
                          fontFamily: 'JetBrains Mono, monospace',
                          color: 'var(--text-secondary)',
                        }}>{f.category}</span>
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>—</span>
                      )}
                    </td>
                    <td>
                      <span className={`badge ${f.isVisible ? 'badge-green' : 'badge-red'}`}>
                        <span className="badge-dot" />
                        {f.isVisible ? 'Visible' : 'Hidden'}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 13, color: 'var(--text-secondary)' }}>
                        {f.displayOrder}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button
                          className="admin-btn admin-btn-ghost admin-btn-icon"
                          onClick={() => editId === f.id ? setEditId(null) : startEdit(f)}
                        >
                          {editId === f.id ? 'Cancel' : 'Edit'}
                        </button>
                        {deleteConfirm === f.id ? (
                          <>
                            <button className="admin-btn admin-btn-danger admin-btn-icon" onClick={() => handleDelete(f.id)}>
                              Confirm
                            </button>
                            <button className="admin-btn admin-btn-ghost admin-btn-icon" onClick={() => setDeleteConfirm(null)}>
                              Cancel
                            </button>
                          </>
                        ) : (
                          <button
                            className="admin-btn admin-btn-danger admin-btn-icon"
                            onClick={() => setDeleteConfirm(f.id)}
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                  {editId === f.id && (
                    <tr key={`edit-${f.id}`}>
                      <td colSpan={6} style={{ padding: '16px 20px', background: 'var(--bg-elevated)' }}>
                        <div style={{ marginBottom: 12, fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>
                          Editing FAQ
                        </div>
                        <FaqForm
                          form={editForm}
                          setForm={setEditForm as (f: typeof emptyForm) => void}
                          categories={categories}
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

interface FaqFormProps {
  form: {
    question: string;
    answer: string;
    category: string;
    displayOrder: number;
    isVisible: boolean;
  };
  setForm: (f: FaqFormProps['form']) => void;
  categories: string[];
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
  submitLabel: string;
}

function FaqForm({ form, setForm, categories, onSave, onCancel, saving, submitLabel }: FaqFormProps) {
  const set = (key: string, value: unknown) => setForm({ ...form, [key]: value });

  return (
    <div className="admin-form">
      <div className="admin-field">
        <label className="admin-label">Question *</label>
        <input className="admin-input" value={form.question} onChange={e => set('question', e.target.value)} placeholder="e.g. How long does a Shopify project take?" />
      </div>
      <div className="admin-field">
        <label className="admin-label">Answer *</label>
        <textarea className="admin-textarea" value={form.answer} onChange={e => set('answer', e.target.value)} placeholder="Provide a clear, helpful answer..." style={{ minHeight: 100 }} />
      </div>
      <div className="admin-form-row">
        <div className="admin-field">
          <label className="admin-label">Category</label>
          <input
            className="admin-input"
            value={form.category}
            onChange={e => set('category', e.target.value)}
            placeholder="e.g. Services, Pricing, Process"
            list="faq-categories"
          />
          <datalist id="faq-categories">
            {categories.filter(c => c !== 'General').map(c => (
              <option key={c} value={c} />
            ))}
          </datalist>
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
