'use client';

// Admin: published StoreProof Store Health Reports — assign to portal clients,
// preview, and watch client engagement (views feed follow-up priority).
import { useState, useEffect, useCallback } from 'react';

interface ReportRow {
  id: string;
  publicToken: string | null;
  host: string;
  runStamp: string;
  storeName: string;
  status: string;
  clientId: string | null;
  funnelLeadId: string | null;
  viewCount: number;
  firstViewedAt: string | null;
  lastViewedAt: string | null;
  createdAt: string;
  topFindings: string[];
  client: { id: string; name: string; slug: string } | null;
  views: { viewedAt: string; device: string | null }[];
}

interface ClientOption { id: string; name: string; slug: string }

function ago(iso: string | null): string {
  if (!iso) return '—';
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (days === 0) return 'today';
  if (days === 1) return 'yesterday';
  return `${days}d ago`;
}

export default function StoreProofAdminPage() {
  const [reports, setReports] = useState<ReportRow[]>([]);
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/storeproof');
      if (!res.ok) throw new Error('fail');
      const data = await res.json();
      setReports(data.reports);
      setClients(data.clients);
    } catch {
      setError('Failed to load StoreProof reports');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const assign = async (reportId: string, clientId: string) => {
    setBusy(reportId);
    try {
      await fetch('/api/admin/storeproof', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reportId, clientId: clientId || null }),
      });
      await load();
    } finally {
      setBusy(null);
    }
  };

  if (loading) {
    return (
      <div className="admin-content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 200 }}>
        <span style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Loading reports...</span>
      </div>
    );
  }

  return (
    <div className="admin-content">
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">StoreProof Reports</h1>
          <p className="admin-page-subtitle">
            Every audited store. "Full report" opens the complete Store Health Report; the teaser link
            is what leads receive (blurred top-3). Assigning to a client is only for AFTER they close —
            it unlocks the full report inside their client portal.
          </p>
        </div>
      </div>

      {error && <div className="admin-alert admin-alert-error" style={{ marginBottom: 20 }}>{error}</div>}

      {reports.length === 0 ? (
        <div className="admin-card" style={{ textAlign: 'center', padding: 40 }}>
          <p style={{ color: 'var(--text-muted)', fontSize: 14, margin: 0 }}>
            No reports published yet. Run <code>npm run publish -- &lt;host&gt;</code> in the StoreProof engine.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {reports.map((r) => (
            <div key={r.id} className="admin-card">
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' }}>
                <h3 style={{ fontSize: 16, fontWeight: 800, margin: 0 }}>{r.storeName}</h3>
                <span style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>{r.host} · run {r.runStamp}</span>
                <span style={{
                  marginLeft: 'auto', fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 100,
                  background: r.clientId ? 'rgba(6,214,160,0.12)' : 'rgba(251,191,36,0.12)',
                  color: r.clientId ? '#06D6A0' : '#FBBF24',
                }}>
                  {r.clientId ? `Assigned → ${r.client?.name}` : 'Unassigned'}
                </span>
              </div>

              {r.topFindings.length > 0 && (
                <ul style={{ margin: '10px 0 0', paddingLeft: 18, fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7 }}>
                  {r.topFindings.map((f, i) => <li key={i}>{f}</li>)}
                </ul>
              )}

              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 14, flexWrap: 'wrap' }}>
                <a
                  href={`/admin/storeproof/${r.id}`}
                  target="_blank" rel="noopener noreferrer"
                  className="admin-btn admin-btn-primary"
                  style={{ fontSize: 12 }}
                >
                  Full report ↗
                </a>

                {r.publicToken && (
                  <a
                    href={`/report/${r.publicToken}`}
                    target="_blank" rel="noopener noreferrer"
                    className="admin-btn admin-btn-secondary"
                    style={{ fontSize: 12 }}
                  >
                    Teaser (what the lead sees) ↗
                  </a>
                )}

                <select
                  value={r.clientId || ''}
                  disabled={busy === r.id}
                  onChange={(e) => assign(r.id, e.target.value)}
                  title="Only after they become a paying client — unlocks the full report in their portal"
                  style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px', color: 'var(--text)', fontSize: 13 }}
                >
                  <option value="">— portal unlock (after close) —</option>
                  {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>

                {r.client && (
                  <a
                    href={`/portal/${r.client.slug}/report/${r.id}`}
                    target="_blank" rel="noopener noreferrer"
                    className="admin-btn admin-btn-secondary"
                    style={{ fontSize: 12 }}
                  >
                    Portal copy ↗
                  </a>
                )}

                <span style={{ marginLeft: 'auto', fontSize: 12.5, color: r.viewCount > 0 ? '#06D6A0' : 'var(--text-muted)', fontWeight: r.viewCount > 0 ? 700 : 400 }}
                  title={r.views.map((v) => new Date(v.viewedAt).toLocaleString('en-IN')).join('\n') || undefined}
                >
                  {r.viewCount > 0
                    ? `👁 Viewed ${r.viewCount}× · last ${ago(r.lastViewedAt)}`
                    : 'Not viewed yet'}
                </span>
              </div>

              {r.client && (
                <p style={{ margin: '10px 0 0', fontSize: 12, color: 'var(--text-muted)' }}>
                  Client link: <code style={{ fontSize: 11.5 }}>{`rachnabuilds.com/portal/${r.client.slug}/report/${r.id}`}</code>
                  {' '}(their portal password unlocks it)
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
