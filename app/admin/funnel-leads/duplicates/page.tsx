'use client';

// Leads that look like the same person (same phone, store or name). Pick the
// one to keep; the other's notes, calls, proposals, payments and reports move
// onto it and the duplicate is deleted.
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import LeadsSubNav from '../../LeadsSubNav';

interface DupLead {
  id: string; name: string; email: string; phone: string | null; whatsapp: string | null; storeUrl: string | null;
  status: string; utmSource: string | null; utmMedium: string | null; createdAt: string;
  _count: { activities: number; bookings: number; proposals: number; payments: number };
}

const hideEmail = (e: string) => e.endsWith('@no-email.local');

export default function DuplicatesPage() {
  const [groups, setGroups] = useState<{ reason: string; leads: DupLead[] }[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    const res = await fetch('/api/admin/funnel-leads/duplicates');
    if (res.ok) setGroups((await res.json()).groups);
  }, []);
  useEffect(() => { load(); }, [load]);

  const merge = async (keep: DupLead, dup: DupLead) => {
    if (!confirm(`Merge "${dup.name}" (${dup.email}) INTO "${keep.name}"?\n\nIts notes, calls, proposals, payments and reports move to "${keep.name}", then the duplicate is deleted. This can't be undone.`)) return;
    setBusy(true);
    try {
      const res = await fetch('/api/admin/funnel-leads/duplicates', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ keepId: keep.id, mergeId: dup.id }),
      });
      if (!res.ok) alert((await res.json()).error || 'Merge failed');
      await load();
    } finally { setBusy(false); }
  };

  const visible = (groups || []).filter((g) => !dismissed.has(g.leads.map((l) => l.id).sort().join(',')));

  return (
    <div className="admin-content">
      <LeadsSubNav />
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Possible duplicates</h1>
          <p className="admin-page-subtitle">Same phone number, same store or same name. Keep one, merge the other into it.</p>
        </div>
      </div>
      {groups === null ? (
        <div className="admin-card admin-empty">Checking…</div>
      ) : visible.length === 0 ? (
        <div className="admin-card admin-empty">
          <div style={{ fontSize: 32, marginBottom: 8 }}>✅</div>
          <div style={{ fontWeight: 600 }}>No duplicates found</div>
          <div>New Meta form submissions with a known phone number are already attached to the existing lead automatically.</div>
        </div>
      ) : visible.map((g) => {
        const key = g.leads.map((l) => l.id).sort().join(',');
        return (
          <div key={key} className="admin-card" style={{ marginBottom: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, gap: 10 }}>
              <span style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--warn)' }}>{g.reason}</span>
              <button type="button" onClick={() => setDismissed(new Set([...dismissed, key]))} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 12, cursor: 'pointer', textDecoration: 'underline' }}>Not the same person — hide</button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: 12 }}>
              {g.leads.map((l) => (
                <div key={l.id} style={{ border: '1px solid var(--border)', borderRadius: 10, padding: 12, background: 'var(--bg-elevated)' }}>
                  <Link href={`/admin/funnel-leads/${l.id}`} style={{ fontWeight: 700, fontSize: 14, color: 'var(--text)', textDecoration: 'none' }}>{l.name} ↗</Link>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4, lineHeight: 1.6 }}>
                    {!hideEmail(l.email) && <div>{l.email}</div>}
                    {(l.phone || l.whatsapp) && <div>{l.phone || l.whatsapp}</div>}
                    {l.storeUrl && <div>{l.storeUrl.replace(/^https?:\/\/(www\.)?/, '')}</div>}
                    <div>{l.status.replace(/_/g, ' ')} · {l.utmMedium || l.utmSource || 'direct'} · {new Date(l.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' })}</div>
                    <div style={{ color: 'var(--text-muted)' }}>{l._count.activities} notes · {l._count.bookings} calls · {l._count.proposals} proposals · {l._count.payments} payments</div>
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 10 }}>
                    {g.leads.filter((o) => o.id !== l.id).map((o) => (
                      <button key={o.id} type="button" disabled={busy} className="admin-btn admin-btn-secondary" style={{ fontSize: 11.5, padding: '5px 10px' }} onClick={() => merge(l, o)}>
                        Keep this, merge {g.leads.length > 2 ? `"${o.name.split(' ')[0]}"` : 'the other'} in
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
