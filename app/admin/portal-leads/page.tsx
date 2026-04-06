'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

interface PortalLead {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  businessName: string | null;
  website: string | null;
  clientType: string;
  platform: string | null;
  message: string | null;
  status: string;
  convertedClientId: string | null;
  createdAt: string;
}

const CT_LABELS: Record<string, string> = {
  new_build: 'New Build',
  existing_optimisation: 'Optimisation',
  audit_only: 'Audit',
  landing_page: 'Landing Page',
  retainer: 'Retainer',
  migration: 'Migration',
};

const STATUS_STYLE: Record<string, { label: string; color: string; bg: string }> = {
  new:       { label: 'New',       color: '#06D6A0', bg: 'rgba(6,214,160,.12)' },
  contacted: { label: 'Contacted', color: '#F59E0B', bg: 'rgba(245,158,11,.12)' },
  converted: { label: 'Converted', color: '#A78BFA', bg: 'rgba(167,139,250,.12)' },
  archived:  { label: 'Archived',  color: '#6B7280', bg: 'rgba(107,114,128,.12)' },
};

type Tab = 'new' | 'contacted' | 'converted' | 'archived' | 'all';

function fmtDate(s: string) {
  return new Date(s).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}
function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9\s-]/g, '').trim().replace(/\s+/g, '-').slice(0, 50);
}

export default function PortalLeadsPage() {
  const [leads, setLeads] = useState<PortalLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('new');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // Convert modal state
  const [convertLead, setConvertLead] = useState<PortalLead | null>(null);
  const [convPassword, setConvPassword] = useState('');
  const [convSlug, setConvSlug] = useState('');
  const [convProjectName, setConvProjectName] = useState('');
  const [converting, setConverting] = useState(false);
  const [convResult, setConvResult] = useState<{ portalUrl: string; password: string } | null>(null);
  const [convError, setConvError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/portal-leads');
      if (res.ok) setLeads(await res.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = leads.filter(l => tab === 'all' || l.status === tab);

  async function updateStatus(id: string, status: string) {
    setUpdatingId(id);
    await fetch(`/api/admin/portal-leads/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    setLeads(ls => ls.map(l => l.id === id ? { ...l, status } : l));
    setUpdatingId(null);
  }

  function openConvert(lead: PortalLead) {
    setConvertLead(lead);
    setConvSlug(slugify(lead.businessName || lead.name));
    setConvProjectName(lead.businessName ? `${lead.businessName} — ${CT_LABELS[lead.clientType] || lead.clientType}` : `${lead.name} — Project`);
    setConvPassword('');
    setConvResult(null);
    setConvError('');
  }

  async function handleConvert() {
    if (!convertLead) return;
    if (convPassword.length < 6) { setConvError('Password must be at least 6 characters'); return; }
    setConverting(true);
    setConvError('');
    try {
      const res = await fetch(`/api/admin/portal-leads/${convertLead.id}/convert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: convPassword, slug: convSlug, projectName: convProjectName }),
      });
      const data = await res.json();
      if (!res.ok) { setConvError(data.error || 'Conversion failed'); return; }
      setConvResult({ portalUrl: data.portalUrl, password: data.password });
      setLeads(ls => ls.map(l => l.id === convertLead.id ? { ...l, status: 'converted', convertedClientId: data.clientId } : l));
    } catch {
      setConvError('Network error');
    } finally {
      setConverting(false);
    }
  }

  const counts = { new: 0, contacted: 0, converted: 0, archived: 0, all: leads.length };
  for (const l of leads) if (l.status in counts) (counts as Record<string,number>)[l.status]++;

  return (
    <div className="admin-content">
      <style>{`
        .pl-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px; flex-wrap: wrap; gap: 12px; }
        .pl-tabs { display: flex; gap: 4px; background: var(--bg-elevated); border: 1px solid var(--border); border-radius: 10px; padding: 4px; }
        .pl-tab { padding: 6px 14px; border-radius: 7px; font-size: 12px; font-weight: 600; font-family: 'JetBrains Mono', monospace; cursor: pointer; border: none; background: none; color: var(--text-muted); letter-spacing: .04em; transition: all .15s; }
        .pl-tab.active { background: var(--bg-card); color: var(--text); box-shadow: 0 1px 3px rgba(0,0,0,.3); }
        .pl-tab .cnt { background: rgba(6,214,160,.15); color: var(--accent); border-radius: 100px; padding: 1px 6px; margin-left: 5px; font-size: 10px; }
        .pl-list { display: flex; flex-direction: column; gap: 8px; }
        .pl-card { background: var(--bg-card); border: 1px solid var(--border); border-radius: 12px; overflow: hidden; }
        .pl-card-head { display: flex; align-items: center; gap: 14px; padding: 16px 20px; cursor: pointer; }
        .pl-card-head:hover { background: var(--bg-elevated); }
        .pl-name { font-size: 14px; font-weight: 700; color: var(--text); margin-bottom: 2px; }
        .pl-meta { font-size: 11px; color: var(--text-muted); font-family: 'JetBrains Mono', monospace; }
        .pl-badge { font-size: 10px; font-weight: 700; padding: 3px 9px; border-radius: 100px; font-family: 'JetBrains Mono', monospace; letter-spacing: .04em; white-space: nowrap; }
        .pl-type-badge { font-size: 10px; font-weight: 600; padding: 3px 9px; border-radius: 100px; background: rgba(255,255,255,.06); color: var(--text-muted); font-family: 'JetBrains Mono', monospace; white-space: nowrap; }
        .pl-actions { display: flex; gap: 8px; align-items: center; margin-left: auto; flex-shrink: 0; flex-wrap: wrap; justify-content: flex-end; }
        .pl-btn { padding: 6px 14px; border-radius: 7px; font-size: 11px; font-weight: 700; border: 1px solid var(--border); background: var(--bg-elevated); color: var(--text-muted); cursor: pointer; font-family: 'JetBrains Mono', monospace; letter-spacing: .04em; transition: all .15s; white-space: nowrap; }
        .pl-btn:hover { border-color: var(--accent); color: var(--accent); }
        .pl-btn.primary { background: #06D6A0; color: #0B0F1A; border-color: #06D6A0; font-size: 11px; }
        .pl-btn.primary:hover { background: #04c090; opacity: 1; }
        .pl-btn.danger { border-color: rgba(255,107,107,.3); color: #FF6B6B; }
        .pl-detail { padding: 0 20px 20px; border-top: 1px solid var(--border); }
        .pl-detail-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 16px; }
        @media (max-width: 600px) { .pl-detail-grid { grid-template-columns: 1fr; } }
        .pl-detail-field label { font-size: 10px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; color: var(--text-muted); display: block; margin-bottom: 4px; }
        .pl-detail-field span { font-size: 13px; color: var(--text); }
        .pl-message-box { background: var(--bg-elevated); border: 1px solid var(--border); border-radius: 8px; padding: 12px 14px; font-size: 13px; color: var(--text-secondary); line-height: 1.6; margin-top: 12px; }
        /* Convert modal */
        .pl-modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,.75); z-index: 100; display: flex; align-items: center; justify-content: center; padding: 20px; }
        .pl-modal { background: var(--bg-card); border: 1px solid var(--border); border-radius: 16px; width: 100%; max-width: 480px; padding: 28px; }
        .pl-modal-title { font-size: 17px; font-weight: 800; color: var(--text); margin-bottom: 6px; }
        .pl-modal-sub { font-size: 13px; color: var(--text-muted); margin-bottom: 22px; }
        .pl-field { margin-bottom: 16px; }
        .pl-field label { display: block; font-size: 10px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; color: var(--text-muted); margin-bottom: 6px; }
        .pl-field input { width: 100%; background: var(--bg-elevated); border: 1px solid var(--border); border-radius: 8px; padding: 10px 13px; font-size: 13px; color: var(--text); outline: none; box-sizing: border-box; }
        .pl-field input:focus { border-color: var(--accent); }
        .pl-modal-actions { display: flex; gap: 10px; margin-top: 22px; }
        .pl-modal-actions button { flex: 1; }
        .pl-success { background: rgba(6,214,160,.08); border: 1px solid rgba(6,214,160,.25); border-radius: 10px; padding: 16px; margin-top: 16px; }
        .pl-success-title { font-size: 13px; font-weight: 700; color: #06D6A0; margin-bottom: 10px; }
        .pl-success-row { display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px; }
        .pl-success-label { font-size: 11px; color: var(--text-muted); }
        .pl-success-val { font-size: 13px; font-weight: 700; color: var(--text); font-family: 'JetBrains Mono', monospace; }
        .pl-empty { text-align: center; padding: 48px 20px; color: var(--text-muted); font-size: 14px; }
      `}</style>

      <div className="pl-header">
        <div>
          <h1 className="admin-page-title">Portal Leads</h1>
          <p className="admin-page-subtitle">Enquiries from <a href="/start" target="_blank" style={{ color: 'var(--accent)', textDecoration: 'none' }}>rachnabuilds.com/start</a></p>
        </div>
        <a href="/start" target="_blank" className="admin-btn admin-btn-secondary" style={{ fontSize: 12 }}>
          View Form ↗
        </a>
      </div>

      {/* Tabs */}
      <div className="pl-tabs" style={{ marginBottom: 20 }}>
        {(['new', 'contacted', 'converted', 'archived', 'all'] as Tab[]).map(t => (
          <button key={t} className={`pl-tab${tab === t ? ' active' : ''}`} onClick={() => setTab(t)}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
            {(counts as Record<string,number>)[t] > 0 && <span className="cnt">{(counts as Record<string,number>)[t]}</span>}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="pl-empty">Loading…</div>
      ) : filtered.length === 0 ? (
        <div className="pl-empty">
          {tab === 'new' ? 'No new leads yet. Share rachnabuilds.com/start to start getting enquiries.' : `No ${tab} leads.`}
        </div>
      ) : (
        <div className="pl-list">
          {filtered.map(lead => {
            const ss = STATUS_STYLE[lead.status] || STATUS_STYLE['new'];
            const expanded = expandedId === lead.id;
            return (
              <div key={lead.id} className="pl-card">
                <div className="pl-card-head" onClick={() => setExpandedId(expanded ? null : lead.id)}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="pl-name">{lead.businessName || lead.name}</div>
                    <div className="pl-meta">
                      {lead.name}{lead.businessName ? ` · ${lead.name}` : ''} · {lead.email} · {fmtDate(lead.createdAt)}
                    </div>
                  </div>
                  <span className="pl-type-badge">{CT_LABELS[lead.clientType] || lead.clientType}{lead.platform ? ` / ${lead.platform}` : ''}</span>
                  <span className="pl-badge" style={{ color: ss.color, background: ss.bg, border: `1px solid ${ss.color}33` }}>{ss.label}</span>
                  <div className="pl-actions" onClick={e => e.stopPropagation()}>
                    {lead.status === 'new' && (
                      <button className="pl-btn" disabled={updatingId === lead.id} onClick={() => updateStatus(lead.id, 'contacted')}>
                        Mark Contacted
                      </button>
                    )}
                    {lead.status === 'contacted' && !lead.convertedClientId && (
                      <button className="pl-btn primary" onClick={() => openConvert(lead)}>
                        Convert to Client →
                      </button>
                    )}
                    {lead.status === 'converted' && lead.convertedClientId && (
                      <Link href={`/admin/clients/${lead.convertedClientId}`} className="pl-btn" style={{ textDecoration: 'none', fontSize: 11 }}>
                        View Client →
                      </Link>
                    )}
                    {lead.status !== 'archived' && lead.status !== 'converted' && (
                      <button className="pl-btn danger" disabled={updatingId === lead.id} onClick={() => updateStatus(lead.id, 'archived')}>
                        Archive
                      </button>
                    )}
                  </div>
                </div>

                {expanded && (
                  <div className="pl-detail">
                    <div className="pl-detail-grid">
                      <div className="pl-detail-field"><label>Email</label><span>{lead.email}</span></div>
                      {lead.phone && <div className="pl-detail-field"><label>Phone</label><span>{lead.phone}</span></div>}
                      {lead.website && <div className="pl-detail-field"><label>Current Website</label><span><a href={lead.website} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)' }}>{lead.website}</a></span></div>}
                      <div className="pl-detail-field"><label>Project Type</label><span>{CT_LABELS[lead.clientType] || lead.clientType}{lead.platform ? ` — ${lead.platform}` : ''}</span></div>
                      <div className="pl-detail-field"><label>Submitted</label><span>{fmtDate(lead.createdAt)}</span></div>
                    </div>
                    {lead.message && (
                      <div>
                        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--text-muted)', margin: '14px 0 6px' }}>Their Message</div>
                        <div className="pl-message-box">{lead.message}</div>
                      </div>
                    )}
                    {lead.status === 'new' && (
                      <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
                        <button className="pl-btn" onClick={() => updateStatus(lead.id, 'contacted')}>Mark Contacted</button>
                        <button className="pl-btn danger" onClick={() => updateStatus(lead.id, 'archived')}>Archive</button>
                      </div>
                    )}
                    {lead.status === 'contacted' && !lead.convertedClientId && (
                      <div style={{ marginTop: 16 }}>
                        <button className="pl-btn primary" style={{ width: '100%' }} onClick={() => openConvert(lead)}>
                          Convert to Client & Create Portal →
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Convert Modal */}
      {convertLead && (
        <div className="pl-modal-overlay" onClick={e => { if (e.target === e.currentTarget && !converting) setConvertLead(null); }}>
          <div className="pl-modal">
            {convResult ? (
              <>
                <div className="pl-modal-title">Client Created! 🎉</div>
                <div className="pl-modal-sub">Portal is live. Share these credentials with the client.</div>
                <div className="pl-success">
                  <div className="pl-success-title">Portal Access Details</div>
                  <div className="pl-success-row">
                    <span className="pl-success-label">Portal URL</span>
                    <span className="pl-success-val">rachnabuilds.com{convResult.portalUrl}</span>
                  </div>
                  <div className="pl-success-row">
                    <span className="pl-success-label">Password</span>
                    <span className="pl-success-val">{convResult.password}</span>
                  </div>
                </div>
                <div className="pl-modal-actions">
                  <button className="pl-btn primary" onClick={() => setConvertLead(null)}>Done</button>
                  <Link href={`/admin/clients`} className="pl-btn" style={{ textDecoration: 'none', textAlign: 'center' }} onClick={() => setConvertLead(null)}>View All Clients</Link>
                </div>
              </>
            ) : (
              <>
                <div className="pl-modal-title">Convert to Client</div>
                <div className="pl-modal-sub">
                  This will create a client account and project for <strong>{convertLead.businessName || convertLead.name}</strong>.
                </div>
                <div className="pl-field">
                  <label>Portal Slug (URL)</label>
                  <input value={convSlug} onChange={e => setConvSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))} placeholder="brand-name-2026" />
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>rachnabuilds.com/portal/{convSlug || '...'}</div>
                </div>
                <div className="pl-field">
                  <label>Project Name</label>
                  <input value={convProjectName} onChange={e => setConvProjectName(e.target.value)} placeholder="Brand Shopify Build" />
                </div>
                <div className="pl-field">
                  <label>Client Password *</label>
                  <input type="password" value={convPassword} onChange={e => setConvPassword(e.target.value)} placeholder="Min 6 characters" />
                </div>
                {convError && <div style={{ fontSize: 12, color: '#FF6B6B', marginBottom: 12 }}>{convError}</div>}
                <div className="pl-modal-actions">
                  <button className="pl-btn" onClick={() => setConvertLead(null)} disabled={converting}>Cancel</button>
                  <button className="pl-btn primary" onClick={handleConvert} disabled={converting}>
                    {converting ? 'Creating…' : 'Create Portal →'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
