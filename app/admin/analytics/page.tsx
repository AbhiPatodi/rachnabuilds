'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

interface RecentEvent {
  id: string;
  projectId: string;
  eventType: string;
  meta: unknown;
  createdAt: string;
}

interface ProjectRow {
  id: string;
  name: string;
  clientName: string;
  clientSlug: string;
  status: string;
  viewCount: number;
  lastViewedAt: string | null;
  sessionCount: number;
  recentEvents: RecentEvent[];
}

interface Totals {
  totalProjects: number;
  totalSessions: number;
  totalViews: number;
}

interface AnalyticsData {
  projects: ProjectRow[];
  totals: Totals;
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

const STATUS_COLORS: Record<string, string> = {
  active: '#06D6A0',
  completed: '#A78BFA',
  draft: '#94A3B8',
};

interface GaSnapshot {
  propertyId: string;
  totals: { activeUsers: number; newUsers: number; sessions: number; pageViews: number };
  daily: Array<{ date: string; activeUsers: number; sessions: number }>;
  topPages: Array<{ path: string; views: number }>;
  topSources: Array<{ source: string; sessions: number }>;
}

type GaResult =
  | { ok: true; snapshot: GaSnapshot }
  | { ok: false; reason: 'not_connected' | 'property_missing' | 'reconnect_needed' | 'api_error'; detail?: string };

function GaTrafficSection() {
  const [result, setResult] = useState<GaResult | null>(null);
  const [propertyInput, setPropertyInput] = useState('');
  const [saving, setSaving] = useState(false);

  const load = () => {
    fetch('/api/admin/analytics/traffic')
      .then((r) => r.json())
      .then(setResult)
      .catch(() => setResult({ ok: false, reason: 'api_error' }));
  };
  useEffect(load, []);

  const saveProperty = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/admin/analytics/traffic', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ propertyId: propertyInput }),
      });
      if (res.ok) { setResult(null); load(); }
    } finally {
      setSaving(false);
    }
  };

  const card: React.CSSProperties = { background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 20px', minWidth: 140 };

  return (
    <div style={{ marginBottom: 36 }}>
      <h2 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 4px' }}>Website Traffic</h2>
      <p style={{ fontSize: 12.5, color: 'var(--text-secondary)', margin: '0 0 14px' }}>
        rachnabuilds.com · Google Analytics · last 28 days
      </p>

      {!result && <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Loading traffic…</div>}

      {result && !result.ok && (
        <div className="admin-card" style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7 }}>
          {result.reason === 'not_connected' && (
            <>Google account not connected — connect it in <a href="/admin/calendar" style={{ color: 'var(--accent)' }}>Calendar Sync</a> first.</>
          )}
          {result.reason === 'reconnect_needed' && (
            <>The Google connection needs the new Analytics permission — open <a href="/admin/calendar" style={{ color: 'var(--accent)' }}>Calendar Sync</a> and click <strong>Reconnect</strong> once, then reload this page.</>
          )}
          {result.reason === 'property_missing' && (
            <>
              Couldn&apos;t auto-detect the GA4 property. Paste its numeric Property ID
              (Google Analytics → Admin → Property settings → &quot;Property ID&quot;):
              <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                <input
                  value={propertyInput}
                  onChange={(e) => setPropertyInput(e.target.value)}
                  placeholder="e.g. 494812345"
                  style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px', color: 'var(--text)', fontSize: 13, width: 200 }}
                />
                <button type="button" className="admin-btn admin-btn-primary" style={{ fontSize: 12 }} disabled={saving || !propertyInput.trim()} onClick={saveProperty}>
                  {saving ? 'Saving…' : 'Save'}
                </button>
              </div>
            </>
          )}
          {result.reason === 'api_error' && (
            <>Couldn&apos;t load Google Analytics data{result.detail ? ` — ${result.detail}` : ''}. Try reloading; if it persists, check that the Analytics Data API is enabled.</>
          )}
        </div>
      )}

      {result && result.ok && (
        <>
          <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
            {[
              { label: '👤 Visitors', value: result.snapshot.totals.activeUsers },
              { label: '✨ New visitors', value: result.snapshot.totals.newUsers },
              { label: '🧭 Sessions', value: result.snapshot.totals.sessions },
              { label: '👁 Page views', value: result.snapshot.totals.pageViews },
            ].map((stat) => (
              <div key={stat.label} style={card}>
                <div style={{ fontSize: 26, fontWeight: 700, color: 'var(--text)', lineHeight: 1 }}>{stat.value.toLocaleString()}</div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 5 }}>{stat.label}</div>
              </div>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: 16 }}>
            <div className="admin-card" style={{ padding: '16px 20px' }}>
              <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 10 }}>Top pages</div>
              {result.snapshot.topPages.length === 0 && <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>No data yet — check back once traffic starts.</div>}
              {result.snapshot.topPages.map((p) => (
                <div key={p.path} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 13, padding: '5px 0', borderBottom: '1px solid var(--border)' }}>
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.path}</span>
                  <span style={{ color: 'var(--text-secondary)', flexShrink: 0 }}>{p.views.toLocaleString()}</span>
                </div>
              ))}
            </div>
            <div className="admin-card" style={{ padding: '16px 20px' }}>
              <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 10 }}>Traffic sources</div>
              {result.snapshot.topSources.length === 0 && <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>No data yet — check back once traffic starts.</div>}
              {result.snapshot.topSources.map((s) => (
                <div key={s.source} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 13, padding: '5px 0', borderBottom: '1px solid var(--border)' }}>
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.source}</span>
                  <span style={{ color: 'var(--text-secondary)', flexShrink: 0 }}>{s.sessions.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sortKey, setSortKey] = useState<'lastViewedAt' | 'viewCount' | 'sessionCount'>('lastViewedAt');

  useEffect(() => {
    fetch('/api/admin/analytics')
      .then(r => r.ok ? r.json() : Promise.reject('Failed'))
      .then((d: AnalyticsData) => setData(d))
      .catch(() => setError('Failed to load analytics'))
      .finally(() => setLoading(false));
  }, []);

  const sorted = data ? [...data.projects].sort((a, b) => {
    if (sortKey === 'lastViewedAt') {
      if (!a.lastViewedAt && !b.lastViewedAt) return 0;
      if (!a.lastViewedAt) return 1;
      if (!b.lastViewedAt) return -1;
      return new Date(b.lastViewedAt).getTime() - new Date(a.lastViewedAt).getTime();
    }
    return b[sortKey] - a[sortKey];
  }) : [];

  if (loading) {
    return (
      <div className="admin-content">
        <div className="admin-empty">Loading analytics…</div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="admin-content">
        <div className="admin-alert admin-alert-error">{error || 'No data'}</div>
      </div>
    );
  }

  const { totals } = data;

  return (
    <div className="admin-content">
      {/* Header */}
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Analytics</h1>
          <p className="admin-page-subtitle">Website traffic + portal engagement</p>
        </div>
      </div>

      {/* Google Analytics website traffic */}
      <GaTrafficSection />

      {/* Client portal engagement */}
      <h2 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 4px' }}>Client Portal Engagement</h2>
      <p style={{ fontSize: 12.5, color: 'var(--text-secondary)', margin: '0 0 14px' }}>Across all client projects</p>

      {/* Summary stats */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
        {[
          { label: '📁 Total Projects', value: totals.totalProjects },
          { label: '👤 Total Sessions', value: totals.totalSessions },
          { label: '👁 Total Views', value: totals.totalViews },
        ].map(stat => (
          <div
            key={stat.label}
            style={{
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border)',
              borderRadius: 12,
              padding: '14px 20px',
              minWidth: 140,
            }}
          >
            <div style={{ fontSize: 26, fontWeight: 700, color: 'var(--text)', lineHeight: 1 }}>{stat.value}</div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 5 }}>{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Sort controls */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, alignItems: 'center' }}>
        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Sort by:</span>
        {([
          { key: 'lastViewedAt', label: 'Last Active' },
          { key: 'viewCount', label: 'Views' },
          { key: 'sessionCount', label: 'Sessions' },
        ] as { key: typeof sortKey; label: string }[]).map(opt => (
          <button
            key={opt.key}
            onClick={() => setSortKey(opt.key)}
            style={{
              padding: '4px 12px',
              borderRadius: 100,
              border: `1.5px solid ${sortKey === opt.key ? 'var(--accent)' : 'var(--border)'}`,
              background: sortKey === opt.key ? 'rgba(6,214,160,0.08)' : 'transparent',
              color: sortKey === opt.key ? 'var(--accent)' : 'var(--text-secondary)',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Projects table */}
      <div className="admin-card" style={{ padding: 0, overflow: 'hidden' }}>
        {sorted.length === 0 ? (
          <div className="admin-empty" style={{ padding: '24px 20px' }}>No projects yet.</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  {['Client', 'Project', 'Views', 'Sessions', 'Last Active', 'Status'].map(h => (
                    <th
                      key={h}
                      style={{
                        padding: '12px 16px',
                        textAlign: 'left',
                        fontSize: 11,
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        letterSpacing: '0.06em',
                        color: 'var(--text-secondary)',
                        background: 'var(--bg-elevated)',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sorted.map((proj, idx) => (
                  <tr
                    key={proj.id}
                    style={{
                      borderBottom: idx < sorted.length - 1 ? '1px solid var(--border)' : 'none',
                    }}
                  >
                    <td style={{ padding: '12px 16px', fontSize: 13, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                      {proj.clientName}
                    </td>
                    <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                      <Link
                        href={`/admin/projects/${proj.id}`}
                        style={{ fontSize: 13, fontWeight: 600, color: 'var(--accent)', textDecoration: 'none' }}
                      >
                        {proj.name}
                      </Link>
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: 13, color: 'var(--text)', fontWeight: 600, whiteSpace: 'nowrap' }}>
                      {proj.viewCount}
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: 13, color: 'var(--text)', fontWeight: 600, whiteSpace: 'nowrap' }}>
                      {proj.sessionCount}
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: 13, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                      {proj.lastViewedAt ? timeAgo(proj.lastViewedAt) : '—'}
                    </td>
                    <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                      <span
                        style={{
                          display: 'inline-block',
                          fontSize: 11,
                          fontWeight: 600,
                          color: STATUS_COLORS[proj.status] ?? '#94A3B8',
                          background: `${STATUS_COLORS[proj.status] ?? '#94A3B8'}18`,
                          borderRadius: 100,
                          padding: '2px 10px',
                          textTransform: 'capitalize',
                        }}
                      >
                        {proj.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
