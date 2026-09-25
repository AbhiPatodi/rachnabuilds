'use client';

// Admin: create / edit / send the lead's sales proposal and watch how they
// engage with it. The public page is /proposal/<token>.
import { useCallback, useEffect, useState } from 'react';
import type { ProposalContent, ProposalTier } from '@/lib/proposal';
import { placeWithFlag } from '@/lib/flag';

interface PView { id: string; viewedAt: string; country: string | null; city: string | null; os: string | null; browser: string | null; durationSec: number | null; scrollPct: number | null; clicks: string | null; sections?: Record<string, number> | null }
interface Proposal {
  id: string; token: string; title: string; content: ProposalContent; reportToken: string | null;
  validUntil: string | null; status: string; acceptedTier: string | null; acceptedNote: string | null;
  acceptedAt: string | null; sentAt: string | null; viewCount: number; lastViewedAt: string | null; createdAt: string;
  views: PView[];
}

const STATUS_COLOR: Record<string, string> = { draft: '#94A3B8', sent: '#F472B6', accepted: '#06D6A0', declined: '#FF6B6B' };
const CLICK_LABEL: Record<string, string> = { report: 'opened report 🔍', whatsapp: 'tapped WhatsApp 💬', pdf: 'PDF', choose_launch: 'tapped Launch-Ready 🎯', choose_fix: 'tapped Fix Sprint' };

const inp: React.CSSProperties = { width: '100%', boxSizing: 'border-box', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 11px', color: 'var(--text)', fontSize: 13.5, fontFamily: 'inherit' };
const lbl: React.CSSProperties = { fontSize: 11, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--text-muted)', margin: '14px 0 5px', display: 'block' };

const lines = (s: string) => s.split('\n').map((l) => l.trim()).filter(Boolean);
// "Label: value" per line
const recapToText = (r: ProposalContent['recap']) => r.map((x) => `${x.label}: ${x.value}`).join('\n');
const textToRecap = (s: string) => lines(s).map((l) => { const i = l.indexOf(':'); return i > 0 ? { label: l.slice(0, i).trim(), value: l.slice(i + 1).trim() } : { label: '', value: l }; });
// blocks separated by a blank line: first line = title, rest = body
const probsToText = (p: ProposalContent['problems']) => p.map((x) => `${x.title}\n${x.body}`).join('\n\n');
const textToProbs = (s: string) => s.split(/\n\s*\n/).map((b) => b.trim()).filter(Boolean).map((b) => { const [t, ...rest] = b.split('\n'); return { title: t.trim(), body: rest.join(' ').trim() }; });

const SECTION_LABEL: Record<string, string> = { recap: 'call recap', problems: 'problems', plan_launch: '$799 plan', plan_fix: '$299 plan', why_now: 'why now', terms: 'guarantees' };

function fmtDur(s: number | null) { if (!s) return null; return s >= 60 ? `${Math.floor(s / 60)}m ${s % 60}s` : `${s}s`; }

function Editor({ p, onSaved }: { p: Proposal; onSaved: () => void }) {
  const [title, setTitle] = useState(p.title);
  const [headline, setHeadline] = useState(p.content.headline);
  const [intro, setIntro] = useState(p.content.intro);
  const [recap, setRecap] = useState(recapToText(p.content.recap));
  const [problems, setProblems] = useState(probsToText(p.content.problems));
  const [tiers, setTiers] = useState<ProposalTier[]>(p.content.tiers);
  const [whyNow, setWhyNow] = useState(p.content.whyNow);
  const [terms, setTerms] = useState(p.content.terms.join('\n'));
  const [nextSteps, setNextSteps] = useState(p.content.nextSteps.join('\n'));
  const [validUntil, setValidUntil] = useState(p.validUntil ? p.validUntil.slice(0, 10) : '');
  const [reportToken, setReportToken] = useState(p.reportToken || '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const setTier = (i: number, patch: Partial<ProposalTier>) => setTiers((ts) => ts.map((t, j) => (j === i ? { ...t, ...patch } : t)));

  const save = async () => {
    setSaving(true);
    const content: ProposalContent = {
      headline, intro, recap: textToRecap(recap), problems: textToProbs(problems), whyNow,
      tiers: tiers.map((t) => ({ ...t, items: t.items.map((x) => x.trim()).filter(Boolean) })),
      terms: lines(terms), nextSteps: lines(nextSteps),
    };
    const res = await fetch(`/api/admin/proposals/${p.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, content, validUntil: validUntil ? `${validUntil}T23:59:59.000Z` : null, reportToken: reportToken || null }),
    });
    setSaving(false);
    if (res.ok) { setSaved(true); setTimeout(() => setSaved(false), 2000); onSaved(); }
    else alert((await res.json()).error || 'Save failed');
  };

  return (
    <div className="admin-card" style={{ padding: 20, marginTop: 14 }}>
      <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>Edit proposal</div>
      <div style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>Say what we&apos;ll achieve, never how to do it. Everything here shows on the public page.</div>

      <label style={lbl}>Internal title</label>
      <input style={inp} value={title} onChange={(e) => setTitle(e.target.value)} />
      <label style={lbl}>Headline</label>
      <input style={inp} value={headline} onChange={(e) => setHeadline(e.target.value)} />
      <label style={lbl}>Intro</label>
      <textarea style={inp} rows={3} value={intro} onChange={(e) => setIntro(e.target.value)} />
      <label style={lbl}>What we heard on the call (one per line, &quot;Label: value&quot;)</label>
      <textarea style={inp} rows={4} value={recap} onChange={(e) => setRecap(e.target.value)} />
      <label style={lbl}>Problems (blank line between; first line = title)</label>
      <textarea style={inp} rows={8} value={problems} onChange={(e) => setProblems(e.target.value)} />

      {tiers.map((t, i) => (
        <div key={t.id} style={{ border: '1px solid var(--border)', borderRadius: 10, padding: 14, marginTop: 16 }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <input style={{ ...inp, flex: 2, minWidth: 160 }} value={t.name} onChange={(e) => setTier(i, { name: e.target.value })} />
            <input style={{ ...inp, width: 90, flex: 'none' }} type="number" value={t.price} onChange={(e) => setTier(i, { price: Number(e.target.value) || 0 })} />
            <select style={{ ...inp, width: 80, flex: 'none' }} value={t.currency} onChange={(e) => setTier(i, { currency: e.target.value })}><option>USD</option><option>INR</option></select>
            <input style={{ ...inp, width: 100, flex: 'none' }} value={t.duration} onChange={(e) => setTier(i, { duration: e.target.value })} />
            <label style={{ fontSize: 12.5, display: 'flex', gap: 5, alignItems: 'center' }}>
              <input type="checkbox" checked={!!t.recommended} onChange={(e) => setTiers((ts) => ts.map((x, j) => ({ ...x, recommended: j === i ? e.target.checked : e.target.checked ? false : x.recommended })))} /> Recommended
            </label>
          </div>
          <label style={lbl}>Tagline</label>
          <input style={inp} value={t.tagline} onChange={(e) => setTier(i, { tagline: e.target.value })} />
          <label style={lbl}>Included (one per line)</label>
          <textarea style={inp} rows={6} value={t.items.join('\n')} onChange={(e) => setTier(i, { items: e.target.value.split('\n') })} />
          <label style={lbl}>What this plan doesn&apos;t get you (optional, shows in red)</label>
          <input style={inp} value={t.missing || ''} onChange={(e) => setTier(i, { missing: e.target.value || undefined })} />
          <label style={lbl}>Payment terms</label>
          <input style={inp} value={t.payment || ''} onChange={(e) => setTier(i, { payment: e.target.value || undefined })} />
        </div>
      ))}

      <label style={lbl}>Why now</label>
      <textarea style={inp} rows={3} value={whyNow} onChange={(e) => setWhyNow(e.target.value)} />
      <label style={lbl}>What you can count on (one per line)</label>
      <textarea style={inp} rows={3} value={terms} onChange={(e) => setTerms(e.target.value)} />
      <label style={lbl}>Next steps (one per line)</label>
      <textarea style={inp} rows={3} value={nextSteps} onChange={(e) => setNextSteps(e.target.value)} />
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 160 }}><label style={lbl}>Pricing held until</label><input style={inp} type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} /></div>
        <div style={{ flex: 2, minWidth: 200 }}><label style={lbl}>Linked report token</label><input style={inp} value={reportToken} onChange={(e) => setReportToken(e.target.value)} /></div>
      </div>
      <button type="button" className="admin-btn admin-btn-primary" style={{ marginTop: 16 }} disabled={saving} onClick={save}>
        {saving ? 'Saving…' : saved ? '✓ Saved' : 'Save proposal'}
      </button>
    </div>
  );
}

export default function ProposalTab({ leadId, leadName, onLeadChange }: { leadId: string; leadName: string; onLeadChange: () => void }) {
  const [proposals, setProposals] = useState<Proposal[] | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/admin/funnel-leads/${leadId}/proposals`);
    if (res.ok) setProposals((await res.json()).proposals);
  }, [leadId]);
  useEffect(() => { load(); }, [load]);

  const create = async () => {
    setBusy(true);
    const res = await fetch(`/api/admin/funnel-leads/${leadId}/proposals`, { method: 'POST' });
    setBusy(false);
    if (res.ok) { const { proposal } = await res.json(); await load(); setEditing(proposal.id); onLeadChange(); }
  };
  const markSent = async (id: string) => {
    setBusy(true);
    await fetch(`/api/admin/proposals/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'mark_sent' }) });
    setBusy(false);
    await load(); onLeadChange();
  };
  const remove = async (id: string) => {
    if (!confirm('Delete this proposal? The public link stops working.')) return;
    await fetch(`/api/admin/proposals/${id}`, { method: 'DELETE' });
    await load();
  };
  const copy = async (key: string, text: string) => {
    await navigator.clipboard.writeText(text).catch(() => {});
    setCopied(key); setTimeout(() => setCopied(null), 1800);
  };

  if (!proposals) return <div style={{ marginTop: 20, color: 'var(--text-muted)', fontSize: 13 }}>Loading proposals…</div>;

  if (!proposals.length) {
    return (
      <div className="admin-card admin-empty" style={{ marginTop: 20, maxWidth: 720 }}>
        <div style={{ marginBottom: 8, fontSize: 32 }}>📄</div>
        <div style={{ fontWeight: 600, marginBottom: 4 }}>No proposal yet</div>
        <div style={{ marginBottom: 16 }}>Starts from the two-plan template ($799 Launch-Ready recommended, $299 Fix Sprint) linked to their latest store report. Edit before sending.</div>
        <button type="button" onClick={create} disabled={busy} className="admin-btn admin-btn-primary">{busy ? 'Creating…' : '📄 Create proposal'}</button>
      </div>
    );
  }

  const origin = typeof window !== 'undefined' ? window.location.origin.replace('localhost:3090', 'rachnabuilds.com').replace(/^http:/, 'https:') : 'https://rachnabuilds.com';
  const first = leadName.split(' ')[0];

  return (
    <div style={{ marginTop: 20, maxWidth: 760 }}>
      {proposals.map((p) => {
        const url = `${origin}/proposal/${p.token}`;
        const tier = p.content.tiers.find((t) => t.id === p.acceptedTier);
        const reportUrl = p.reportToken ? `${origin}/report/${p.reportToken}` : null;
        const waMsg = `Hi ${first}, thanks again for the call today! As promised, here's the proposal with both options, plus the full store report:\n\n${url}\n\nHave a look when you get a moment and let me know what you think. Happy to answer anything here.`;
        return (
          <div key={p.id} style={{ marginBottom: 18 }}>
            <div className="admin-card" style={{ padding: 18 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 10.5, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', padding: '3px 10px', borderRadius: 99, background: `${STATUS_COLOR[p.status]}22`, color: STATUS_COLOR[p.status] }}>{p.status}</span>
                <b style={{ fontSize: 15 }}>{p.title}</b>
                <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--text-muted)' }}>
                  {p.viewCount ? `👁 ${p.viewCount} view${p.viewCount === 1 ? '' : 's'}` : 'Not opened yet'}
                  {p.validUntil && ` · held until ${new Date(p.validUntil).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`}
                </span>
              </div>

              {tier && (
                <div style={{ marginTop: 12, background: 'rgba(6,214,160,0.1)', border: '1px solid rgba(6,214,160,0.35)', borderRadius: 10, padding: '10px 12px', fontSize: 13.5 }}>
                  ✅ <b>Chose {tier.name} (${tier.price})</b>{p.acceptedAt && ` on ${new Date(p.acceptedAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}`}
                  {p.acceptedNote && <div style={{ marginTop: 4, color: 'var(--text-secondary)' }}>&quot;{p.acceptedNote}&quot;</div>}
                  <div style={{ marginTop: 4, color: 'var(--text-secondary)' }}>Next: send payment details on WhatsApp, then set the lead to Closed Won once paid.</div>
                </div>
              )}

              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 14 }}>
                <a href={`/proposal/${p.token}`} target="_blank" rel="noopener noreferrer" className="admin-btn admin-btn-secondary" style={{ fontSize: 12.5 }}>Preview ↗</a>
                <button type="button" className="admin-btn admin-btn-secondary" style={{ fontSize: 12.5 }} onClick={() => copy(`l${p.id}`, url)}>{copied === `l${p.id}` ? '✓ Copied' : '🔗 Copy link'}</button>
                <button type="button" className="admin-btn admin-btn-secondary" style={{ fontSize: 12.5 }} onClick={() => copy(`w${p.id}`, waMsg)}>{copied === `w${p.id}` ? '✓ Copied' : '💬 Copy WhatsApp message'}</button>
                {reportUrl && <a href={reportUrl} target="_blank" rel="noopener noreferrer" className="admin-btn admin-btn-secondary" style={{ fontSize: 12.5 }}>Report ↗</a>}
                <button type="button" className="admin-btn admin-btn-secondary" style={{ fontSize: 12.5 }} onClick={() => setEditing(editing === p.id ? null : p.id)}>{editing === p.id ? 'Close editor' : '✏️ Edit'}</button>
                {p.status === 'draft' && (
                  <button type="button" className="admin-btn admin-btn-primary" style={{ fontSize: 12.5 }} disabled={busy} onClick={() => markSent(p.id)}>📤 Mark as sent</button>
                )}
                <button type="button" onClick={() => remove(p.id)} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 12, cursor: 'pointer', textDecoration: 'underline' }}>Delete</button>
              </div>
              {p.sentAt && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }}>Sent {new Date(p.sentAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}</div>}

              {p.views.length > 0 && (
                <div style={{ marginTop: 14 }}>
                  <div style={lbl}>Who opened it</div>
                  {p.views.map((v, idx) => {
                    const visitNo = p.views.length - idx;
                    const secs = Object.entries(v.sections || {}).sort((a, b) => b[1] - a[1]);
                    const where = placeWithFlag(v.city, v.country);
                    const clicks = (v.clicks || '').split(',').filter(Boolean).map((c) => CLICK_LABEL[c] || c);
                    return (
                      <div key={v.id} style={{ fontSize: 12.5, color: 'var(--text-secondary)', padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
                        <b style={{ color: 'var(--text)' }}>{new Date(v.viewedAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}</b>
                        {where && ` · ${where}`}{(v.os || v.browser) && ` · ${[v.os, v.browser].filter(Boolean).join(' · ')}`}
                        {fmtDur(v.durationSec) && ` · read ${fmtDur(v.durationSec)}`}{v.scrollPct ? ` · scrolled ${v.scrollPct}%` : ''}
                        {clicks.length > 0 && <span style={{ color: '#06D6A0' }}> · {clicks.join(', ')}</span>}
                        {v.city === 'Indore' && <span style={{ color: 'var(--text-muted)' }}> (probably us)</span>}
                        {visitNo > 1 && <span style={{ color: '#F472B6', fontWeight: 700 }}> · ↩ visit {visitNo}</span>}
                        {secs.length > 0 && (
                          <div style={{ marginTop: 3, fontSize: 12 }}>
                            Read most: <b style={{ color: 'var(--text)' }}>{SECTION_LABEL[secs[0][0]] || secs[0][0]}</b>
                            {' · '}{secs.map(([k, s]) => `${SECTION_LABEL[k] || k} ${fmtDur(s)}`).join(' · ')}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            {editing === p.id && <Editor p={p} onSaved={load} />}
          </div>
        );
      })}
      <button type="button" onClick={create} disabled={busy} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 12.5, cursor: 'pointer', textDecoration: 'underline' }}>+ New proposal from template</button>
    </div>
  );
}
