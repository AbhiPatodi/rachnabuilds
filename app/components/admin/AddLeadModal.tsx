'use client';

// Manual lead entry for the channels that don't have a webhook: Upwork,
// referrals, walk-ins on WhatsApp, LinkedIn. Same pipeline afterwards
// (audit → proposal → payments), so nothing else changes.
import { useState } from 'react';

export const MANUAL_SOURCES: { key: string; label: string; detailLabel: string; detailHint: string }[] = [
  { key: 'upwork', label: 'Upwork', detailLabel: 'Job link or title', detailHint: 'https://www.upwork.com/jobs/~…' },
  { key: 'referral', label: 'Referral', detailLabel: 'Referred by', detailHint: 'e.g. Kim (Nuwa)' },
  { key: 'direct', label: 'Direct / WhatsApp', detailLabel: 'How they found us', detailHint: 'e.g. saw a reel, old client' },
  { key: 'linkedin', label: 'LinkedIn', detailLabel: 'Profile link', detailHint: 'https://linkedin.com/in/…' },
  { key: 'instagram', label: 'Instagram DM', detailLabel: 'Handle', detailHint: '@…' },
  { key: 'other', label: 'Other', detailLabel: 'Where from', detailHint: '' },
];

export default function AddLeadModal({ onClose, onAdded }: { onClose: () => void; onAdded: (id: string) => void }) {
  const [f, setF] = useState({ name: '', email: '', phone: '', storeUrl: '', source: 'upwork', detail: '', notes: '' });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const src = MANUAL_SOURCES.find((s) => s.key === f.source) || MANUAL_SOURCES[0];
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.value });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!f.name.trim()) { setErr('Name is needed'); return; }
    if (!f.email.trim() && !f.phone.trim()) { setErr('Email or phone — at least one'); return; }
    setBusy(true); setErr('');
    try {
      const r = await fetch('/api/admin/funnel-leads', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(f) });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || 'Could not save');
      onAdded(j.id);
    } catch (e) { setErr(e instanceof Error ? e.message : 'Could not save'); setBusy(false); }
  };

  return (
    <div className="share-overlay" onClick={onClose}>
      <form className="share-modal" onClick={(e) => e.stopPropagation()} onSubmit={submit}>
        <div className="share-modal-header">
          <div className="share-modal-title">Add a lead</div>
          <button type="button" onClick={onClose} className="admin-btn admin-btn-secondary" style={{ padding: '4px 10px', fontSize: 12 }}>✕</button>
        </div>
        <div style={{ padding: 20, display: 'grid', gap: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <label className="admin-label">Source
              <select className="admin-input" value={f.source} onChange={set('source')}>
                {MANUAL_SOURCES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
              </select>
            </label>
            <label className="admin-label">{src.detailLabel}
              <input className="admin-input" value={f.detail} onChange={set('detail')} placeholder={src.detailHint} />
            </label>
          </div>
          <label className="admin-label">Name *
            <input className="admin-input" value={f.name} onChange={set('name')} autoFocus placeholder="Client or store owner" />
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <label className="admin-label">Email
              <input className="admin-input" type="email" value={f.email} onChange={set('email')} placeholder="optional if phone" />
            </label>
            <label className="admin-label">Phone / WhatsApp
              <input className="admin-input" value={f.phone} onChange={set('phone')} placeholder="+1 … / +91 …" />
            </label>
          </div>
          <label className="admin-label">Store URL
            <input className="admin-input" value={f.storeUrl} onChange={set('storeUrl')} placeholder="theirstore.com" />
          </label>
          <label className="admin-label">Notes
            <textarea className="admin-input" rows={3} value={f.notes} onChange={set('notes')} placeholder="What they asked for, budget, anything said so far" />
          </label>
          {err && <div className="admin-alert admin-alert-error">{err}</div>}
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button type="button" className="admin-btn admin-btn-secondary" onClick={onClose} disabled={busy}>Cancel</button>
            <button type="submit" className="admin-btn admin-btn-primary" disabled={busy}>{busy ? 'Saving…' : 'Add lead'}</button>
          </div>
        </div>
      </form>
    </div>
  );
}
