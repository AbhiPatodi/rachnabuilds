'use client';

// The full cold-email history, readable without logging into Instantly.
// Threads that need a human come first: real replies, then the ones an
// auto-reply silently killed (stop_on_auto_reply is on, so an out-of-office
// ends the sequence — those people never get a follow-up unless you send it).
import { useCallback, useEffect, useState } from 'react';

interface Msg {
  id: string; at: string | null; inbound: boolean; step: number | null;
  subject: string; body: string; inbox: string; auto: boolean;
}
interface Thread {
  email: string; storeName: string; prospectId: string | null; stage: string | null;
  finding: string | null; issueCount: number | null; leadId: string | null;
  sentCount: number; lastStep: number | null; lastAt: string | null;
  replied: boolean; autoReplied: boolean; stopped: boolean; messages: Msg[];
}
interface Data {
  campaignId: string; truncated: boolean;
  totals: { threads: number; emails: number; replied: number; autoStopped: number; byStep: Record<string, number> };
  threads: Thread[];
}

const STEP_NAME: Record<number, string> = { 0: 'First touch', 1: 'Follow-up', 2: 'Closed out' };

function when(iso: string | null) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' }) + ' ' +
    d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}

function Tag({ children, tone }: { children: React.ReactNode; tone: 'good' | 'warn' | 'muted' }) {
  const bg = tone === 'good' ? 'var(--accent)' : tone === 'warn' ? 'var(--warn)' : 'var(--surface-2)';
  const fg = tone === 'muted' ? 'var(--text-secondary)' : '#fff';
  return (
    <span style={{ background: bg, color: fg, fontSize: 11, fontWeight: 600, padding: '2px 7px', borderRadius: 4, whiteSpace: 'nowrap' }}>
      {children}
    </span>
  );
}

export default function Threads() {
  const [d, setD] = useState<Data | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'replied' | 'stopped' | 'nofollow'>('all');

  const load = useCallback(async () => {
    setErr(null);
    const r = await fetch('/api/admin/outreach/threads');
    if (r.ok) setD(await r.json());
    else setErr((await r.json().catch(() => ({}))).error || `HTTP ${r.status}`);
  }, []);
  useEffect(() => { load(); }, [load]);

  if (err) {
    return (
      <div className="admin-card">
        <h2 className="admin-card-title">Email history</h2>
        <div style={{ color: 'var(--danger)', fontSize: 13 }}>{err}</div>
      </div>
    );
  }
  if (!d) {
    return (
      <div className="admin-card">
        <h2 className="admin-card-title">Email history</h2>
        <div style={{ color: 'var(--text-secondary)', fontSize: 13 }}>Loading threads…</div>
      </div>
    );
  }

  const shown = d.threads.filter((t) => {
    if (filter === 'replied') return t.replied;
    if (filter === 'stopped') return t.stopped;
    if (filter === 'nofollow') return t.lastStep === 0 && !t.replied && !t.stopped;
    return true;
  });

  const tabs: { k: typeof filter; label: string; n: number }[] = [
    { k: 'all', label: 'All', n: d.totals.threads },
    { k: 'replied', label: 'Replied', n: d.totals.replied },
    { k: 'stopped', label: 'Auto-reply stopped', n: d.totals.autoStopped },
    { k: 'nofollow', label: 'Awaiting follow-up', n: d.threads.filter((t) => t.lastStep === 0 && !t.replied && !t.stopped).length },
  ];

  return (
    <div className="admin-card">
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <h2 className="admin-card-title">Email history</h2>
        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
          {d.totals.emails} emails to {d.totals.threads} people
          {d.truncated && ' · older emails not loaded'}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', margin: '10px 0 14px' }}>
        {tabs.map((t) => (
          <button
            key={t.k}
            onClick={() => setFilter(t.k)}
            style={{
              fontSize: 12, padding: '5px 10px', borderRadius: 6, cursor: 'pointer',
              border: '1px solid var(--border)',
              background: filter === t.k ? 'var(--surface-2)' : 'transparent',
              color: filter === t.k ? 'var(--text-primary)' : 'var(--text-secondary)',
              fontWeight: filter === t.k ? 600 : 400,
            }}
          >
            {t.label} ({t.n})
          </button>
        ))}
      </div>

      {shown.length === 0 && (
        <div style={{ fontSize: 13, color: 'var(--text-secondary)', padding: '12px 0' }}>Nothing in this view.</div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {shown.map((t) => {
          const isOpen = open === t.email;
          return (
            <div key={t.email} style={{ border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
              <button
                onClick={() => setOpen(isOpen ? null : t.email)}
                style={{
                  width: '100%', textAlign: 'left', background: 'transparent', border: 'none',
                  cursor: 'pointer', padding: '10px 12px', display: 'flex', gap: 10,
                  alignItems: 'center', flexWrap: 'wrap', color: 'var(--text-primary)',
                }}
              >
                <span style={{ fontWeight: 600, fontSize: 14, flex: '1 1 180px', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {t.storeName}
                </span>
                {t.replied && <Tag tone="good">Replied</Tag>}
                {t.stopped && <Tag tone="warn">Auto-reply · sequence stopped</Tag>}
                <Tag tone="muted">
                  {t.lastStep !== null ? (STEP_NAME[t.lastStep] ?? `Step ${t.lastStep + 1}`) : 'Not sent'}
                </Tag>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  {t.sentCount} sent · {when(t.lastAt)}
                </span>
              </button>

              {isOpen && (
                <div style={{ borderTop: '1px solid var(--border)', padding: 12, background: 'var(--surface-2)' }}>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 10, lineHeight: 1.6 }}>
                    <div><strong>{t.email}</strong></div>
                    {t.finding && <div style={{ marginTop: 4 }}>Quoted finding: {t.finding}{t.issueCount != null && ` (${t.issueCount} total)`}</div>}
                    {t.leadId && <div style={{ marginTop: 4 }}><a href={`/admin/funnel-leads/${t.leadId}`} style={{ color: 'var(--accent)' }}>Open CRM lead →</a></div>}
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {t.messages.map((m) => (
                      <div
                        key={m.id}
                        style={{
                          border: '1px solid var(--border)', borderRadius: 6, padding: 10,
                          background: m.inbound ? 'var(--surface)' : 'transparent',
                          borderLeft: `3px solid ${m.inbound ? (m.auto ? 'var(--warn)' : 'var(--accent)') : 'var(--border)'}`,
                        }}
                      >
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 5, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                          <span style={{ fontWeight: 600, color: m.inbound ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                            {m.inbound ? (m.auto ? 'Auto-reply from them' : 'Reply from them') : `Sent — ${STEP_NAME[m.step ?? -1] ?? `step ${(m.step ?? 0) + 1}`}`}
                          </span>
                          <span>{when(m.at)}</span>
                          {m.inbox && <span>via {m.inbox}</span>}
                        </div>
                        {m.subject && <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>{m.subject}</div>}
                        <div style={{ fontSize: 13, color: 'var(--text-secondary)', whiteSpace: 'pre-wrap', lineHeight: 1.55 }}>
                          {m.body || '(no text body)'}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
