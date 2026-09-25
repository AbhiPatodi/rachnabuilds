'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import LeadsSubNav from '../LeadsSubNav';

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
  notes: string | null;
  formAnswers: Record<string, string> | null;
  videoWatch: { secondsWatched: number; maxPosition: number; duration: number } | null;
}

/** Compress the Instant Form qualifying answers for the table:
 *  "CVR <1% · Spend <$5k". */
function instantFormAnswers(l: FunnelLead): string | null {
  if (!l.formAnswers || !Object.keys(l.formAnswers).length) return null;
  const short = Object.entries(l.formAnswers).map(([q, raw]) => {
    const ql = q.toLowerCase();
    let v = raw.replace(/_/g, ' ');
    v = v.replace(/less than\s*/i, '<').replace(/more than\s*/i, '>').replace(/\s*conversion rate\s*/i, '');
    const label = ql.includes('conversion') ? 'CVR' : ql.includes('spend') ? 'Spend' : ql.split(' ').slice(-2).join(' ');
    return `${label} ${v}`.trim();
  });
  return short.join(' · ');
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
  showed: { label: 'Call Done ✓', color: '#A78BFA' },
  proposal_sent: { label: 'Proposal Sent', color: '#F472B6' },
  closed_won: { label: 'Closed Won 🎉', color: '#06D6A0' },
  closed_lost: { label: 'Closed Lost', color: '#FF6B6B' },
  disqualified: { label: 'Disqualified', color: '#6B7280' },
};

type StageTab = 'all' | 'applied' | 'optin';

function sourceLabel(l: FunnelLead) {
  return l.utmSource || 'Organic / direct';
}

// Segments: where the lead actually came from, as tabs with counts.
type Segment = 'all' | 'meta' | 'website' | 'cold';
function segmentOf(l: FunnelLead): Exclude<Segment, 'all'> {
  if (l.utmMedium === 'instant-form') return 'meta';
  if (l.utmSource === 'cold-email' || l.utmMedium === 'cold-email') return 'cold';
  return 'website'; // site funnels (/training, /free-audit) + organic
}
const SEGMENTS: { key: Segment; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'meta', label: 'Meta Ads' },
  { key: 'website', label: 'Website' },
  { key: 'cold', label: 'Cold Email' },
];

export default function FunnelLeadsPage() {
  const [leads, setLeads] = useState<FunnelLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [stageTab, setStageTab] = useState<StageTab>('all');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [segment, setSegment] = useState<Segment>('all');

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

  const segmented = segment === 'all' ? leads : leads.filter((l) => segmentOf(l) === segment);
  const stageFiltered = stageTab === 'all' ? segmented : segmented.filter((l) => l.stage === stageTab);
  const filtered = sourceFilter === 'all' ? stageFiltered : stageFiltered.filter((l) => sourceLabel(l) === sourceFilter);
  const applied = leads.filter((l) => l.stage === 'applied');
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
      <LeadsSubNav />
      <style>{`
        @media (max-width: 767px) {
          /* admin.css sets ".admin-card table td{display:table-cell}" inside this
             same breakpoint — match that specificity or the columns never hide. */
          .admin-card table th.fl-col-assets, .admin-card table td.fl-col-assets,
          .admin-card table th.fl-col-revenue, .admin-card table td.fl-col-revenue,
          .admin-card table th.fl-col-readiness, .admin-card table td.fl-col-readiness,
          .admin-card table th.fl-col-applied, .admin-card table td.fl-col-applied {
            display: none;
          }
          /* three stats fit across a phone; the global 2-col rule orphans the third */
          .fl-stats { grid-template-columns: repeat(3, 1fr) !important; gap: 8px }
          .fl-stats .admin-stat-card { padding: 12px 10px }
          .fl-stats .admin-stat-label { font-size: 9.5px; letter-spacing: .04em; line-height: 1.3 }
          .fl-stats .admin-stat-value { font-size: 24px }
        }
      `}</style>
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Funnel Leads</h1>
          <p className="admin-page-subtitle">Every inbound lead — Meta Instant Form, free-audit requests, website applications and cold-email replies</p>
        </div>
      </div>

      {error && <div className="admin-alert admin-alert-error" style={{ marginBottom: 20 }}>{error}</div>}

      <div className="admin-stats fl-stats">
        <div className="admin-stat-card">
          <div className="admin-stat-label">Total Leads</div>
          <div className="admin-stat-value">{leads.length}</div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-label">Applications</div>
          <div className="admin-stat-value accent">{applied.length}</div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-label">Not applied yet</div>
          <div className="admin-stat-value" style={{ color: '#FBBF24' }}>{leads.length - applied.length}</div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
        {SEGMENTS.map((s) => {
          const count = s.key === 'all' ? leads.length : leads.filter((l) => segmentOf(l) === s.key).length;
          const active = segment === s.key;
          return (
            <button
              key={s.key}
              type="button"
              onClick={() => setSegment(s.key)}
              style={{
                padding: '7px 14px', borderRadius: 100, cursor: 'pointer', fontSize: 12.5, fontWeight: 700,
                border: `1px solid ${active ? 'var(--accent)' : 'var(--border)'}`,
                background: active ? 'rgba(6,214,160,0.12)' : 'var(--bg-elevated)',
                color: active ? 'var(--accent)' : 'var(--text-secondary)',
              }}
            >
              {s.label} <span style={{ opacity: 0.7 }}>({count})</span>
            </button>
          );
        })}
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
              {t === 'all' ? 'All' : t === 'applied' ? 'Applications' : 'Not applied'}
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
            <div>Leads from Meta ads, the free-audit form and the website will appear here.</div>
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
                  <th className="fl-col-assets">Assets</th>
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
                            {l.name}
                            <span style={{
                              marginLeft: 8, fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase',
                              padding: '2px 8px', borderRadius: 100,
                              background: l.stage === 'applied' ? 'rgba(6,214,160,0.12)' : 'rgba(251,191,36,0.12)',
                              color: l.stage === 'applied' ? '#06D6A0' : '#FBBF24',
                            }}>
                              {l.stage === 'applied' ? 'Applied'
                                : l.utmMedium === 'instant-form' ? 'Meta form'
                                : l.utmMedium === 'free-audit' ? 'Audit req.'
                                : l.utmSource === 'cold-email' ? 'Cold reply'
                                : 'Opt-in'}
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
                        {(() => {
                          const a = instantFormAnswers(l);
                          return a && (
                            <div title="Answers from the Meta Instant Form" style={{ marginTop: 3, fontSize: 11.5, fontWeight: 600, color: '#06D6A0', whiteSpace: 'nowrap' }}>
                              {a}
                            </div>
                          );
                        })()}
                      </td>
                      <td className="fl-col-revenue" style={{ fontSize: 13 }}>{l.revenue ? LABELS[l.revenue] : '—'}</td>
                      <td className="fl-col-readiness" style={{ fontSize: 13 }}>{l.readiness ? LABELS[l.readiness] : '—'}</td>
                      <td className="fl-col-assets" style={{ fontSize: 12 }}>
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
