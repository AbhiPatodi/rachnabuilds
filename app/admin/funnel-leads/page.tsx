'use client';

import { useState, useEffect, useCallback } from 'react';

interface FunnelLead {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  profession: string | null;
  whatsapp: string | null;
  storeUrl: string | null;
  role: string | null;
  challenge: string | null;
  revenue: string | null;
  blocker: string | null;
  financial: string | null;
  readiness: string | null;
  stage: string;
  status: string;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  utmContent: string | null;
  notes: string | null;
  appliedAt: string | null;
  createdAt: string;
}

const LABELS: Record<string, string> = {
  traffic_no_sales: 'Traffic but no sales',
  low_conversion: 'Low conversion rate',
  poor_roas: 'Poor ROAS',
  cart_abandonment: 'High cart abandonment',
  brand_mismatch: "Store doesn't reflect brand",
  other: 'Other',
  under_5k: 'Under $5K',
  '5k_10k': '$5K–$10K',
  '10k_25k': '$10K–$25K',
  '25k_50k': '$25K–$50K',
  over_50k: '$50K+',
  ready_now: '💰 Has budget now',
  can_invest: 'Can invest if it makes sense',
  budget_challenge: '⚠️ Budget is a challenge',
  right_now: '🚀 Right now',
  within_30_days: 'Within 30 days',
  later: '30+ days',
};

const STATUSES = ['new', 'confirmed', 'call_booked', 'showed', 'closed_won', 'closed_lost', 'disqualified'];

const STATUS_META: Record<string, { label: string; color: string }> = {
  new: { label: 'New', color: '#06D6A0' },
  confirmed: { label: 'Confirmed', color: '#38BDF8' },
  call_booked: { label: 'Call Booked', color: '#FBBF24' },
  showed: { label: 'Showed', color: '#A78BFA' },
  closed_won: { label: 'Closed Won 🎉', color: '#06D6A0' },
  closed_lost: { label: 'Closed Lost', color: '#FF6B6B' },
  disqualified: { label: 'Disqualified', color: '#6B7280' },
};

type StageTab = 'all' | 'applied' | 'optin';

function isHot(l: FunnelLead) {
  return l.readiness === 'right_now' && l.financial === 'ready_now';
}

export default function FunnelLeadsPage() {
  const [leads, setLeads] = useState<FunnelLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [stageTab, setStageTab] = useState<StageTab>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const fetchLeads = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/funnel-leads');
      if (!res.ok) throw new Error('fail');
      setLeads(await res.json());
    } catch {
      setError('Failed to load funnel leads');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchLeads(); }, [fetchLeads]);

  const updateStatus = async (id: string, status: string) => {
    setBusyId(id);
    try {
      const res = await fetch(`/api/admin/funnel-leads/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        const updated = await res.json();
        setLeads((ls) => ls.map((l) => (l.id === id ? { ...l, ...updated } : l)));
      }
    } finally {
      setBusyId(null);
    }
  };

  const deleteLead = async (id: string) => {
    if (!confirm('Delete this lead permanently?')) return;
    setBusyId(id);
    try {
      const res = await fetch(`/api/admin/funnel-leads/${id}`, { method: 'DELETE' });
      if (res.ok) setLeads((ls) => ls.filter((l) => l.id !== id));
    } finally {
      setBusyId(null);
    }
  };

  const filtered = stageTab === 'all' ? leads : leads.filter((l) => l.stage === stageTab);
  const applied = leads.filter((l) => l.stage === 'applied');
  const hot = applied.filter(isHot);

  if (loading) {
    return (
      <div className="admin-content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 200 }}>
        <span style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Loading funnel leads...</span>
      </div>
    );
  }

  return (
    <div className="admin-content">
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Funnel Leads</h1>
          <p className="admin-page-subtitle">VSL training funnel — opt-ins &amp; applications (/training)</p>
        </div>
      </div>

      {error && <div className="admin-alert admin-alert-error" style={{ marginBottom: 20 }}>{error}</div>}

      <div className="admin-stats">
        <div className="admin-stat-card">
          <div className="admin-stat-label">Total Leads</div>
          <div className="admin-stat-value">{leads.length}</div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-label">Applications</div>
          <div className="admin-stat-value accent">{applied.length}</div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-label">Opt-in Only (follow up!)</div>
          <div className="admin-stat-value" style={{ color: '#FBBF24' }}>{leads.length - applied.length}</div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-label">🔥 Hot (now + budget)</div>
          <div className="admin-stat-value" style={{ color: '#FF6B6B' }}>{hot.length}</div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 4, marginBottom: 20, borderBottom: '1px solid var(--border)' }}>
        {(['all', 'applied', 'optin'] as StageTab[]).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setStageTab(tab)}
            style={{
              padding: '8px 14px', border: 'none', background: 'none', cursor: 'pointer',
              fontSize: 13, fontWeight: 500,
              color: stageTab === tab ? 'var(--accent)' : 'var(--text-secondary)',
              borderBottom: stageTab === tab ? '2px solid var(--accent)' : '2px solid transparent',
              marginBottom: -1,
            }}
          >
            {tab === 'all' ? 'All' : tab === 'applied' ? 'Applications' : 'Opt-ins only'}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {filtered.length === 0 && (
          <div className="admin-card admin-empty">
            <div style={{ marginBottom: 8, fontSize: 32 }}>🎯</div>
            <div style={{ fontWeight: 600, marginBottom: 4 }}>No funnel leads yet</div>
            <div>Leads from the /training VSL funnel will appear here.</div>
          </div>
        )}

        {filtered.map((l) => {
          const meta = STATUS_META[l.status] ?? STATUS_META.new;
          const open = expandedId === l.id;
          return (
            <div key={l.id} className="admin-card" style={{ padding: '16px 20px', borderLeft: isHot(l) ? '3px solid #FF6B6B' : undefined }}>
              <div
                style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', cursor: 'pointer' }}
                onClick={() => setExpandedId(open ? null : l.id)}
              >
                <div style={{ flex: 1, minWidth: 180 }}>
                  <div style={{ fontWeight: 600, fontSize: 15 }}>
                    {isHot(l) && '🔥 '}{l.name}
                    <span style={{
                      marginLeft: 8, fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase',
                      padding: '2px 8px', borderRadius: 100,
                      background: l.stage === 'applied' ? 'rgba(6,214,160,0.12)' : 'rgba(251,191,36,0.12)',
                      color: l.stage === 'applied' ? '#06D6A0' : '#FBBF24',
                    }}>
                      {l.stage === 'applied' ? 'Applied' : 'Opt-in'}
                    </span>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                    {l.email}{l.revenue ? ` · ${LABELS[l.revenue]}` : ''}{l.readiness ? ` · ${LABELS[l.readiness]}` : ''}
                  </div>
                </div>
                <span style={{ fontSize: 11, fontWeight: 700, color: meta.color, background: `${meta.color}1f`, padding: '4px 10px', borderRadius: 100 }}>
                  {meta.label}
                </span>
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                  {new Date(l.createdAt).toLocaleDateString()}
                </span>
              </div>

              {open && (
                <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border)', display: 'grid', gap: 10, fontSize: 13.5 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 8 }}>
                    {l.whatsapp && (
                      <div>
                        <strong>WhatsApp:</strong>{' '}
                        <a href={`https://wa.me/${l.whatsapp.replace(/[^0-9]/g, '')}`} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)' }}>
                          {l.whatsapp} ↗
                        </a>
                      </div>
                    )}
                    {l.phone && !l.whatsapp && <div><strong>Phone:</strong> {l.phone}</div>}
                    {l.storeUrl && (
                      <div>
                        <strong>Store:</strong>{' '}
                        <a href={l.storeUrl.startsWith('http') ? l.storeUrl : `https://${l.storeUrl}`} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)' }}>
                          {l.storeUrl} ↗
                        </a>
                      </div>
                    )}
                    {(l.role || l.profession) && <div><strong>Role:</strong> {l.role || l.profession}</div>}
                    {l.challenge && <div><strong>Challenge:</strong> {LABELS[l.challenge]}</div>}
                    {l.financial && <div><strong>Financial:</strong> {LABELS[l.financial]}</div>}
                    {l.utmSource && <div><strong>Source:</strong> {l.utmSource}{l.utmCampaign ? ` / ${l.utmCampaign}` : ''}{l.utmContent ? ` / ${l.utmContent}` : ''}</div>}
                  </div>

                  {l.blocker && (
                    <div style={{ background: 'var(--bg-elevated)', borderRadius: 8, padding: '10px 14px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                      <strong style={{ color: 'var(--text)' }}>What&apos;s stopping them:</strong> {l.blocker}
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                    <select
                      value={l.status}
                      disabled={busyId === l.id}
                      onChange={(e) => updateStatus(l.id, e.target.value)}
                      style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 8, padding: '7px 10px', color: 'var(--text)', fontSize: 13 }}
                    >
                      {STATUSES.map((s) => <option key={s} value={s}>{STATUS_META[s].label}</option>)}
                    </select>
                    <a href={`mailto:${l.email}`} className="admin-btn admin-btn-secondary" style={{ fontSize: 12, padding: '7px 12px' }}>Email</a>
                    <button
                      type="button"
                      disabled={busyId === l.id}
                      onClick={() => deleteLead(l.id)}
                      style={{ marginLeft: 'auto', background: 'none', border: '1px solid rgba(255,107,107,0.3)', color: '#FF6B6B', borderRadius: 8, padding: '7px 12px', fontSize: 12, cursor: 'pointer' }}
                    >
                      Delete
                    </button>
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
