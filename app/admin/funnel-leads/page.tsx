'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

interface FunnelLead {
  id: string;
  name: string;
  email: string;
  storeUrl: string | null;
  revenue: string | null;
  readiness: string | null;
  financial: string | null;
  stage: string;
  status: string;
  createdAt: string;
  hasCallScript?: boolean;
  auditReports?: { id: string; status: string; token: string }[];
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  utmContent: string | null;
  videoWatch: { secondsWatched: number; maxPosition: number; duration: number } | null;
}

function watchPct(l: FunnelLead): number | null {
  if (!l.videoWatch || !l.videoWatch.duration) return null;
  return Math.min(100, Math.round((l.videoWatch.maxPosition / l.videoWatch.duration) * 100));
}

const LABELS: Record<string, string> = {
  under_5k: 'Under $5K', '5k_10k': '$5K–$10K', '10k_25k': '$10K–$25K', '25k_50k': '$25K–$50K', over_50k: '$50K+',
  right_now: '🚀 Right now', within_30_days: 'Within 30 days', later: '30+ days',
};

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

function sourceLabel(l: FunnelLead) {
  return l.utmSource || 'Organic / direct';
}

export default function FunnelLeadsPage() {
  const [leads, setLeads] = useState<FunnelLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [stageTab, setStageTab] = useState<StageTab>('all');
  const [sourceFilter, setSourceFilter] = useState('all');

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

  const stageFiltered = stageTab === 'all' ? leads : leads.filter((l) => l.stage === stageTab);
  const filtered = sourceFilter === 'all' ? stageFiltered : stageFiltered.filter((l) => sourceLabel(l) === sourceFilter);
  const applied = leads.filter((l) => l.stage === 'applied');
  const hot = applied.filter(isHot);
  const sources = ['all', ...Array.from(new Set(leads.map(sourceLabel))).sort()];

  if (loading) {
    return (
      <div className="admin-content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 200 }}>
        <span style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Loading funnel leads...</span>
      </div>
    );
  }

  return (
    <div className="admin-content">
      <style>{`
        @media (max-width: 767px) {
          .fl-col-source, .fl-col-revenue, .fl-col-readiness, .fl-col-applied { display: none; }
        }
      `}</style>
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

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, marginBottom: 20, borderBottom: '1px solid var(--border)', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 4 }}>
          {(['all', 'applied', 'optin'] as StageTab[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setStageTab(t)}
              style={{
                padding: '8px 14px', border: 'none', background: 'none', cursor: 'pointer',
                fontSize: 13, fontWeight: 500,
                color: stageTab === t ? 'var(--accent)' : 'var(--text-secondary)',
                borderBottom: stageTab === t ? '2px solid var(--accent)' : '2px solid transparent',
                marginBottom: -1,
              }}
            >
              {t === 'all' ? 'All' : t === 'applied' ? 'Applications' : 'Opt-ins only'}
            </button>
          ))}
        </div>
        {sources.length > 2 && (
          <select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
            style={{ marginBottom: 8, background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 8, padding: '7px 12px', color: 'var(--text)', fontSize: 12.5 }}
          >
            {sources.map((s) => (
              <option key={s} value={s}>{s === 'all' ? 'All sources' : s}</option>
            ))}
          </select>
        )}
      </div>

      <div className="admin-card" style={{ padding: 0, overflow: 'clip' }}>
        {filtered.length === 0 ? (
          <div className="admin-empty">
            <div style={{ marginBottom: 8, fontSize: 32 }}>🎯</div>
            <div style={{ fontWeight: 600, marginBottom: 4 }}>No funnel leads yet</div>
            <div>Leads from the /training VSL funnel will appear here.</div>
          </div>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Lead</th>
                  <th className="fl-col-source">Source</th>
                  <th className="fl-col-revenue">Revenue</th>
                  <th className="fl-col-readiness">Readiness</th>
                  <th>Assets</th>
                  <th>Status</th>
                  <th className="fl-col-applied">Applied</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((l) => {
                  const meta = STATUS_META[l.status] ?? STATUS_META.new;
                  const audit = l.auditReports?.[0];
                  return (
                    <tr key={l.id} style={{ cursor: 'pointer' }} onClick={() => { window.location.href = `/admin/funnel-leads/${l.id}`; }}>
                      <td>
                        <Link href={`/admin/funnel-leads/${l.id}`} style={{ color: 'inherit', textDecoration: 'none' }}>
                          <div style={{ fontWeight: 600, fontSize: 14 }}>
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
                          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{l.email}</div>
                        </Link>
                      </td>
                      <td className="fl-col-source" style={{ fontSize: 12.5 }}>
                        {l.utmSource ? (
                          <span title={[l.utmMedium, l.utmCampaign, l.utmContent].filter(Boolean).join(' / ') || undefined}>
                            <span style={{ fontWeight: 600, color: 'var(--text)' }}>{l.utmSource}</span>
                            {l.utmCampaign && <span style={{ color: 'var(--text-muted)' }}> · {l.utmCampaign}</span>}
                          </span>
                        ) : (
                          <span style={{ color: 'var(--text-muted)' }}>Organic / direct</span>
                        )}
                      </td>
                      <td className="fl-col-revenue" style={{ fontSize: 13 }}>{l.revenue ? LABELS[l.revenue] : '—'}</td>
                      <td className="fl-col-readiness" style={{ fontSize: 13 }}>{l.readiness ? LABELS[l.readiness] : '—'}</td>
                      <td style={{ fontSize: 12 }}>
                        {(() => {
                          const pct = watchPct(l);
                          return pct !== null && (
                            <span
                              title={`Watched ${Math.floor(l.videoWatch!.secondsWatched / 60)}m ${l.videoWatch!.secondsWatched % 60}s of the VSL — reached ${pct}%`}
                              style={{ marginRight: 6, fontWeight: 700, color: pct >= 75 ? '#06D6A0' : pct >= 25 ? '#FBBF24' : 'var(--text-muted)' }}
                            >
                              📺{pct}%
                            </span>
                          );
                        })()}
                        {audit && audit.status !== 'failed' && <span title="Audit generated" style={{ marginRight: 6 }}>⚡</span>}
                        {l.hasCallScript && <span title="Call script generated">📞</span>}
                        {!audit && !l.hasCallScript && watchPct(l) === null && <span style={{ color: 'var(--text-muted)' }}>—</span>}
                      </td>
                      <td>
                        <span style={{ fontSize: 11, fontWeight: 700, color: meta.color, background: `${meta.color}1f`, padding: '4px 10px', borderRadius: 100, whiteSpace: 'nowrap' }}>
                          {meta.label}
                        </span>
                      </td>
                      <td className="fl-col-applied" style={{ fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                        {new Date(l.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
