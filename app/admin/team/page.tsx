'use client';

// Team & pipeline: who can log in, who gets new leads (and how they're
// shared out), moving leads between people, and the sub-stage lists.
import { useState, useEffect, useCallback } from 'react';

interface Member {
  id: string; name: string; email: string; role: string; active: boolean; receivesLeads: boolean;
  lastAssignedAt: string | null; createdAt: string; _count: { leads: number; pushSubs: number };
}

const STATUS_LABELS: Record<string, string> = {
  new: 'New', contacted: 'Contacted', no_reply: 'No reply yet', confirmed: 'Confirmed', call_booked: 'Call booked',
  showed: 'Call done', proposal_sent: 'Proposal sent', closed_won: 'Closed won', closed_lost: 'Closed lost', disqualified: 'Disqualified',
};
const input: React.CSSProperties = { background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 8, padding: '9px 12px', color: 'var(--text)', fontSize: 13 };

export default function TeamPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [unassigned, setUnassigned] = useState(0);
  const [method, setMethod] = useState('off');
  const [subDraft, setSubDraft] = useState<Record<string, string>>({});
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'rep' });
  const [move, setMove] = useState({ from: '', to: '' });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  const load = useCallback(async () => {
    const [t, p] = await Promise.all([fetch('/api/admin/team').then((r) => r.json()), fetch('/api/admin/pipeline-settings').then((r) => r.json())]);
    setMembers(t.members || []);
    setUnassigned(t.unassigned || 0);
    setMethod(p.assignMethod);
    setSubDraft(Object.fromEntries(Object.entries(p.subStatus || {}).map(([k, v]) => [k, (v as string[]).join('\n')])));
  }, []);
  useEffect(() => { load(); }, [load]);

  const call = async (url: string, method: string, body: unknown, ok: string) => {
    setBusy(true); setMsg('');
    try {
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setMsg(`⚠️ ${data.error || 'Failed'}`); return null; }
      setMsg(ok); await load(); return data;
    } finally { setBusy(false); }
  };

  const active = members.filter((m) => m.active);
  const inRotation = active.filter((m) => m.receivesLeads);

  return (
    <div className="admin-content" style={{ maxWidth: 900 }}>
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Team &amp; pipeline</h1>
          <p className="admin-page-subtitle">Logins for people who help with leads, how new leads are shared out, and your sub-stages</p>
        </div>
      </div>
      {msg && <div className={`admin-alert ${msg.startsWith('⚠️') ? 'admin-alert-error' : 'admin-alert-success'}`} style={{ marginBottom: 16 }}>{msg}</div>}

      {/* ── Members ── */}
      <div className="admin-card" style={{ marginBottom: 16 }}>
        <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>People</h3>
        <p style={{ fontSize: 12.5, color: 'var(--text-muted)', margin: '0 0 14px' }}>
          The owner password always works and sees everything. <b>Rep</b> = sees only the leads assigned to them (no money, proposals or settings). <b>Admin</b> = sees everything, like the owner.
          Each person logs in at /admin-login with their email + password and turns on alerts on their own phone.
        </p>
        {members.length === 0 && <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Nobody yet — just you. New leads stay with you until you add someone.</p>}
        {members.map((m) => (
          <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', padding: '10px 0', borderTop: '1px solid var(--border)', opacity: m.active ? 1 : 0.55 }}>
            <div style={{ flex: 1, minWidth: 180 }}>
              <div style={{ fontWeight: 700, fontSize: 13.5 }}>{m.name} {!m.active && <span style={{ fontSize: 11, color: 'var(--danger)' }}>· deactivated</span>}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{m.email} · {m._count.leads} open lead{m._count.leads === 1 ? '' : 's'} · {m._count.pushSubs ? `alerts on ${m._count.pushSubs} device${m._count.pushSubs === 1 ? '' : 's'}` : 'alerts not turned on yet'}</div>
            </div>
            <select value={m.role} disabled={busy} style={{ ...input, padding: '6px 8px', fontSize: 12 }} onChange={(e) => call(`/api/admin/team/${m.id}`, 'PATCH', { role: e.target.value }, `${m.name} is now ${e.target.value}`)}>
              <option value="rep">Rep</option><option value="admin">Admin</option>
            </select>
            <label style={{ fontSize: 12, display: 'flex', gap: 5, alignItems: 'center', color: 'var(--text-secondary)' }}>
              <input type="checkbox" checked={m.receivesLeads} disabled={busy || !m.active} onChange={(e) => call(`/api/admin/team/${m.id}`, 'PATCH', { receivesLeads: e.target.checked }, e.target.checked ? `${m.name} gets new leads` : `${m.name} won't get new leads`)} />
              gets new leads
            </label>
            <button type="button" disabled={busy} className="admin-btn admin-btn-secondary" style={{ fontSize: 11.5, padding: '5px 10px' }}
              onClick={() => { const pw = prompt(`New password for ${m.name} (8+ characters). They'll be logged out everywhere.`); if (pw) call(`/api/admin/team/${m.id}`, 'PATCH', { password: pw }, `Password changed for ${m.name}`); }}>
              Reset password
            </button>
            <button type="button" disabled={busy} className="admin-btn admin-btn-secondary" style={{ fontSize: 11.5, padding: '5px 10px' }}
              onClick={() => { if (m.active && !confirm(`Deactivate ${m.name}? They're logged out and stop getting leads. Move their ${m._count.leads} open leads first (below).`)) return; call(`/api/admin/team/${m.id}`, 'PATCH', { active: !m.active }, m.active ? `${m.name} deactivated` : `${m.name} reactivated`); }}>
              {m.active ? 'Deactivate' : 'Reactivate'}
            </button>
          </div>
        ))}
        <form
          onSubmit={async (e) => { e.preventDefault(); if (await call('/api/admin/team', 'POST', form, `Added ${form.name} — share their email and password with them`)) setForm({ name: '', email: '', password: '', role: 'rep' }); }}
          style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--border)' }}
        >
          <input required placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} style={{ ...input, flex: '1 1 140px' }} />
          <input required type="email" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} style={{ ...input, flex: '1 1 180px' }} />
          <input required type="text" minLength={8} placeholder="Password (8+)" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} style={{ ...input, flex: '1 1 140px' }} autoComplete="new-password" />
          <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} style={input}><option value="rep">Rep</option><option value="admin">Admin</option></select>
          <button type="submit" disabled={busy} className="admin-btn admin-btn-primary" style={{ fontSize: 13 }}>+ Add person</button>
        </form>
      </div>

      {/* ── Lead rotation ── */}
      <div className="admin-card" style={{ marginBottom: 16 }}>
        <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 10 }}>Who gets new leads</h3>
        {[
          ['off', 'Off — every new lead stays with me', 'You get the alert and work it yourself; assign by hand from the lead page.'],
          ['round_robin', 'Take turns', 'Each new lead goes to the next person in the rotation.'],
          ['fewest_open', 'Whoever has the fewest open leads', 'Keeps workloads even when someone is slower to close.'],
        ].map(([v, l, d]) => (
          <label key={v} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '7px 0', cursor: 'pointer' }}>
            <input type="radio" name="method" checked={method === v} disabled={busy} onChange={() => call('/api/admin/pipeline-settings', 'PUT', { assignMethod: v }, 'Saved')} style={{ marginTop: 3 }} />
            <span><span style={{ fontSize: 13.5, fontWeight: 600 }}>{l}</span><br /><span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{d}</span></span>
          </label>
        ))}
        {method !== 'off' && inRotation.length === 0 && (
          <p style={{ fontSize: 12.5, color: 'var(--warn)', margin: '6px 0 0' }}>Nobody is in the rotation yet, so new leads still stay with you.</p>
        )}
        <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '10px 0 0' }}>
          The assigned person gets the new-lead alert, the 15-minute “still not contacted” alarm and their own morning list. If a lead is still untouched after an hour, you get the alarm too.
        </p>
      </div>

      {/* ── Bulk move ── */}
      <div className="admin-card" style={{ marginBottom: 16 }}>
        <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 10 }}>Move open leads</h3>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <select value={move.from} onChange={(e) => setMove({ ...move, from: e.target.value })} style={input}>
            <option value="">From: unassigned ({unassigned})</option>
            {members.map((m) => <option key={m.id} value={m.id}>From: {m.name} ({m._count.leads})</option>)}
          </select>
          <span style={{ color: 'var(--text-muted)' }}>→</span>
          <select value={move.to} onChange={(e) => setMove({ ...move, to: e.target.value })} style={input}>
            <option value="">To: unassigned (me)</option>
            {active.map((m) => <option key={m.id} value={m.id}>To: {m.name}</option>)}
          </select>
          <button type="button" disabled={busy || move.from === move.to} className="admin-btn admin-btn-secondary" style={{ fontSize: 12.5 }}
            onClick={async () => { const r = await call('/api/admin/team/reassign', 'POST', { from: move.from || null, to: move.to || null }, 'Moved'); if (r) setMsg(`Moved ${r.moved} open lead${r.moved === 1 ? '' : 's'}`); }}>
            Move all
          </button>
        </div>
      </div>

      {/* ── Sub-stages ── */}
      <div className="admin-card">
        <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>Sub-stages</h3>
        <p style={{ fontSize: 12.5, color: 'var(--text-muted)', margin: '0 0 14px' }}>
          Your own labels under each status, one per line: lost reasons, “asked to call back in January”, anything. The main statuses stay fixed because Meta’s quality signal and the reminders depend on them. Lost reasons show up in the Ad report.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: 12 }}>
          {Object.keys(STATUS_LABELS).map((st) => (
            <label key={st} style={{ display: 'block' }}>
              <span style={{ fontSize: 11.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>{STATUS_LABELS[st]}</span>
              <textarea value={subDraft[st] ?? ''} onChange={(e) => setSubDraft({ ...subDraft, [st]: e.target.value })} rows={4}
                style={{ ...input, width: '100%', marginTop: 4, fontFamily: 'inherit', resize: 'vertical' }} placeholder="(none)" />
            </label>
          ))}
        </div>
        <button type="button" disabled={busy} className="admin-btn admin-btn-primary" style={{ marginTop: 12, fontSize: 13 }}
          onClick={() => call('/api/admin/pipeline-settings', 'PUT', { subStatus: Object.fromEntries(Object.entries(subDraft).map(([k, v]) => [k, v.split('\n').map((x) => x.trim()).filter(Boolean)]).filter(([, v]) => (v as string[]).length)) }, 'Sub-stages saved')}>
          Save sub-stages
        </button>
      </div>
    </div>
  );
}
