'use client';
// Cold-email replies and the reports they are waiting for. Nothing reaches a
// prospect from here until it has been read: open the report, then approve.
import { useCallback, useEffect, useState } from 'react';

type Item = {
  id: string; email: string; name: string | null; storeName: string | null; domain: string | null;
  finding: string | null; issueCount: number | null; leadId: string | null;
  repliedAt: string | null; readyAt: string | null; sentAt: string | null;
  reportUrl: string | null; canSend: boolean; blocked: string | null;
};

const when = (iso: string | null) =>
  !iso ? '' : new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });

export default function PendingReports() {
  const [items, setItems] = useState<Item[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const r = await fetch('/api/admin/outreach/pending');
      const j = await r.json();
      setItems(j.items || []);
    } catch { setItems([]); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const approve = async (it: Item) => {
    if (!confirm(`Send the ${it.storeName || it.domain} report to ${it.email}?\n\nOnly do this once you have read it.`)) return;
    setBusy(it.id); setErr(null); setDone(null);
    try {
      const r = await fetch('/api/admin/outreach/pending', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ id: it.id }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || 'Could not send');
      setDone(`Sent to ${it.email}`);
      await load();
    } catch (e) { setErr((e as Error).message); }
    finally { setBusy(null); }
  };

  if (!items) return null;
  const waiting = items.filter((i) => !i.sentAt);
  const sent = items.filter((i) => i.sentAt).slice(0, 5);

  return (
    <div className="admin-card" style={{ padding: 18, marginBottom: 16 }}>
      <h2 className="admin-card-title" style={{ margin: 0 }}>Replies — reports waiting for you</h2>
      <div style={{ fontSize: 12.5, color: 'var(--text-muted)', margin: '6px 0 12px' }}>
        Nothing is sent automatically. Read the report, then approve it and it goes back in the
        prospect&apos;s own email thread.
      </div>

      {err && <div className="admin-alert admin-alert-error" style={{ marginBottom: 12 }}>{err}</div>}
      {done && <div className="admin-alert" style={{ marginBottom: 12 }}>{done}</div>}

      {waiting.length === 0 && (
        <p style={{ color: 'var(--text-muted)', fontSize: 13.5, margin: 0 }}>No replies waiting.</p>
      )}

      {waiting.map((it) => (
        <div key={it.id} style={{ borderTop: '1px solid var(--border)', padding: '11px 0', display: 'flex', gap: 12, alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 220 }}>
            <div style={{ fontWeight: 700, fontSize: 14 }}>
              {it.storeName || it.domain}
              {it.issueCount ? <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}> · {it.issueCount} findings</span> : null}
            </div>
            <div style={{ fontSize: 12.5, color: 'var(--text-muted)', marginTop: 2 }}>
              {it.name ? `${it.name} · ` : ''}{it.email}
              {it.repliedAt ? ` · replied ${when(it.repliedAt)}` : ''}
            </div>
            {it.finding && (
              <div style={{ fontSize: 12.5, color: 'var(--text-muted)', marginTop: 4, fontStyle: 'italic' }}>
                Email opened with: {it.finding}
              </div>
            )}
            {it.blocked && (
              <div style={{ fontSize: 12.5, color: 'var(--text-muted)', marginTop: 4 }}>⏳ {it.blocked}</div>
            )}
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {it.reportUrl && (
              <a className="admin-btn admin-btn-secondary" href={it.reportUrl} target="_blank" rel="noreferrer"
                style={{ fontSize: 12.5, padding: '6px 11px' }}>Read report</a>
            )}
            {it.leadId && (
              <a className="admin-btn admin-btn-secondary" href={`/admin/funnel-leads/${it.leadId}`}
                style={{ fontSize: 12.5, padding: '6px 11px' }}>Lead</a>
            )}
            <button type="button" className="admin-btn admin-btn-primary" style={{ fontSize: 12.5, padding: '6px 11px' }}
              disabled={!it.canSend || busy === it.id} onClick={() => approve(it)}>
              {busy === it.id ? 'Sending…' : 'Approve & send'}
            </button>
          </div>
        </div>
      ))}

      {sent.length > 0 && (
        <div style={{ marginTop: 14, paddingTop: 10, borderTop: '1px solid var(--border)' }}>
          <div style={{ fontSize: 11.5, textTransform: 'uppercase', letterSpacing: '.05em', color: 'var(--text-muted)', marginBottom: 6 }}>Recently sent</div>
          {sent.map((it) => (
            <div key={it.id} style={{ fontSize: 12.5, color: 'var(--text-muted)', padding: '3px 0' }}>
              ✅ {it.storeName || it.domain} → {it.email} · {when(it.sentAt)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
