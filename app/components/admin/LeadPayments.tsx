'use client';

// Payments for one lead: what's been received, what's still due, and a
// one-tap "Record payment" form. Feeds the Money page.
import { useCallback, useEffect, useState } from 'react';

interface Payment { id: string; amount: number; currency: string; method: string | null; fee: number | null; status: string; date: string; note: string | null }

const money = (n: number, c: string) => (c === 'USD' ? `$${n.toLocaleString('en-US', { maximumFractionDigits: 2 })}` : `₹${Math.round(n).toLocaleString('en-IN')}`);
const dmy = (d: string) => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', timeZone: 'UTC' });
const inp: React.CSSProperties = { width: '100%', boxSizing: 'border-box', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 10px', color: 'var(--text)', fontSize: 13.5, fontFamily: 'inherit' };
const lbl: React.CSSProperties = { fontSize: 10.5, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-muted)', margin: '8px 0 3px', display: 'block' };

export default function LeadPayments({ leadId, leadName, onChange }: { leadId: string; leadName: string; onChange?: () => void }) {
  const [rows, setRows] = useState<Payment[]>([]);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [f, setF] = useState({ amount: '', currency: 'USD', method: 'paypal', status: 'received', date: new Date().toISOString().slice(0, 10), note: '' });

  const load = useCallback(async () => {
    const res = await fetch(`/api/admin/money/payments?leadId=${leadId}`);
    if (res.ok) setRows((await res.json()).payments);
  }, [leadId]);
  useEffect(() => { load(); }, [load]);

  const save = async () => {
    setBusy(true);
    const res = await fetch('/api/admin/money/payments', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...f, amount: Number(f.amount), leadId, clientName: leadName }) }).catch(() => null);
    setBusy(false);
    if (!res?.ok) { alert((await res?.json().catch(() => ({})))?.error || 'Could not save'); return; }
    setOpen(false); setF({ ...f, amount: '', note: '' });
    await load(); onChange?.();
  };
  const markReceived = async (id: string) => {
    setBusy(true);
    await fetch(`/api/admin/money/payments/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'received', date: new Date().toISOString().slice(0, 10) }) });
    setBusy(false); await load(); onChange?.();
  };

  const byCur: Record<string, { got: number; due: number }> = {};
  for (const p of rows) { const b = (byCur[p.currency] ||= { got: 0, due: 0 }); if (p.status === 'received') b.got += p.amount; else b.due += p.amount; }

  return (
    <div className="admin-card" style={{ gridColumn: '1 / -1' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 10 }}>
        <h3 style={{ fontSize: 14, fontWeight: 700, margin: 0 }}>Payments</h3>
        {Object.entries(byCur).map(([c, b]) => (
          <span key={c} style={{ fontSize: 12.5, color: 'var(--text-secondary)' }}>
            <b style={{ color: 'var(--accent)' }}>{money(b.got, c)}</b> received{b.due > 0 && <> · <b style={{ color: '#FBBF24' }}>{money(b.due, c)}</b> due</>}
          </span>
        ))}
        <button type="button" className="admin-btn admin-btn-primary" style={{ marginLeft: 'auto', fontSize: 12.5 }} onClick={() => setOpen(!open)}>💰 Record payment</button>
      </div>

      {open && (
        <div style={{ border: '1px solid var(--border)', borderRadius: 10, padding: 12, marginBottom: 12 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 8 }}>
            <div><label style={lbl}>Amount</label><input style={inp} type="number" inputMode="decimal" value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} autoFocus /></div>
            <div><label style={lbl}>Currency</label><select style={inp} value={f.currency} onChange={(e) => setF({ ...f, currency: e.target.value })}><option>USD</option><option>INR</option></select></div>
            <div><label style={lbl}>Method</label><select style={inp} value={f.method} onChange={(e) => setF({ ...f, method: e.target.value })}><option value="paypal">PayPal</option><option value="upi">UPI</option><option value="bank">Bank</option><option value="razorpay">Razorpay</option><option value="cash">Cash</option></select></div>
            <div><label style={lbl}>Status</label><select style={inp} value={f.status} onChange={(e) => setF({ ...f, status: e.target.value })}><option value="received">Received</option><option value="expected">Expected (due)</option></select></div>
            <div><label style={lbl}>{f.status === 'expected' ? 'Due on' : 'Received on'}</label><input style={inp} type="date" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} /></div>
          </div>
          <label style={lbl}>Note</label><input style={inp} value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} placeholder="50% advance, Fix Sprint" />
          <button type="button" className="admin-btn admin-btn-primary" style={{ marginTop: 10, fontSize: 12.5 }} disabled={busy || !(Number(f.amount) > 0)} onClick={save}>Save</button>
        </div>
      )}

      {rows.length === 0 ? <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Nothing recorded yet.</div> : rows.map((p) => (
        <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, padding: '7px 0', borderTop: '1px solid var(--border)' }}>
          <span style={{ fontSize: 10.5, fontWeight: 800, textTransform: 'uppercase', padding: '2px 8px', borderRadius: 99, background: p.status === 'received' ? 'rgba(6,214,160,0.12)' : 'rgba(251,191,36,0.12)', color: p.status === 'received' ? 'var(--accent)' : '#FBBF24' }}>{p.status}</span>
          <b>{money(p.amount, p.currency)}</b>
          <span style={{ color: 'var(--text-muted)' }}>{p.method || ''} · {dmy(p.date)}{p.note ? ` · ${p.note}` : ''}</span>
          {p.status === 'expected' && <button type="button" className="admin-btn admin-btn-secondary" style={{ marginLeft: 'auto', fontSize: 11.5, padding: '3px 9px' }} disabled={busy} onClick={() => markReceived(p.id)}>Mark received</button>}
        </div>
      ))}
    </div>
  );
}
