'use client';

// Cold-email prospects (Vela import). Quarantined from funnel leads — nothing
// here is emailed by the site; sending happens only via Instantly from the
// burner domains. A prospect graduates to Funnel Leads when they reply.
import { useState, useEffect, useCallback } from 'react';

interface ProspectRow {
  id: string;
  email: string;
  name: string | null;
  country: string | null;
  storeName: string | null;
  domain: string | null;
  firstSeenApp: string | null;
  tier: string;
  verifyStatus: string;
  scanStatus: string;
  finding: string | null;
  issueCount: number | null;
  stage: string;
  score: number | null;
}

const TIER_COLORS: Record<string, string> = { 'A+': '#06D6A0', A: '#38BDF8', B: '#FBBF24', C: '#6B7280' };
const STAGE_COLORS: Record<string, string> = {
  new: '#6B7280', queued: '#38BDF8', contacted: '#FBBF24',
  replied: '#06D6A0', promoted: '#A78BFA', suppressed: '#FF6B6B',
};

export default function ProspectsPage() {
  const [rows, setRows] = useState<ProspectRow[]>([]);
  const [total, setTotal] = useState(0);
  const [tierCounts, setTierCounts] = useState<Record<string, number>>({});
  const [stageCounts, setStageCounts] = useState<Record<string, number>>({});
  const [tier, setTier] = useState('');
  const [stage, setStage] = useState('');
  const [verify, setVerify] = useState('');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (tier) params.set('tier', tier);
      if (stage) params.set('stage', stage);
      if (verify) params.set('verify', verify);
      if (q) params.set('q', q);
      params.set('page', String(page));
      const res = await fetch(`/api/admin/prospects?${params}`);
      const data = await res.json();
      setRows(data.rows);
      setTotal(data.total);
      setTierCounts(data.tierCounts);
      setStageCounts(data.stageCounts);
    } finally {
      setLoading(false);
    }
  }, [tier, stage, verify, q, page]);

  useEffect(() => { load(); }, [load]);

  const pages = Math.max(1, Math.ceil(total / 50));

  return (
    <div className="admin-content">
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Prospects</h1>
          <p className="admin-page-subtitle">
            Cold-email pool from Vela ({Object.values(tierCounts).reduce((a, b) => a + b, 0).toLocaleString()} imported).
            Quarantined — the site never emails these; outreach runs only via Instantly. Replies graduate to Funnel Leads.
          </p>
        </div>
      </div>

      <div className="admin-stats" style={{ marginBottom: 18 }}>
        {['A+', 'A', 'B', 'C'].map((t) => (
          <button
            key={t}
            className="admin-stat-card"
            onClick={() => { setTier(tier === t ? '' : t); setPage(1); }}
            style={{ cursor: 'pointer', textAlign: 'left', border: tier === t ? `2px solid ${TIER_COLORS[t]}` : undefined }}
          >
            <div className="admin-stat-label" style={{ color: TIER_COLORS[t] }}>Tier {t}</div>
            <div className="admin-stat-value">{(tierCounts[t] || 0).toLocaleString()}</div>
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          placeholder="Search email / name / domain..."
          value={q}
          onChange={(e) => { setQ(e.target.value); setPage(1); }}
          style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 8, padding: '9px 14px', color: 'var(--text)', fontSize: 13, minWidth: 240 }}
        />
        <select value={stage} onChange={(e) => { setStage(e.target.value); setPage(1); }}
          style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 8, padding: '9px 12px', color: 'var(--text)', fontSize: 13 }}>
          <option value="">All stages</option>
          {Object.keys(STAGE_COLORS).map((s) => (
            <option key={s} value={s}>{s} ({stageCounts[s] || 0})</option>
          ))}
        </select>
        <select value={verify} onChange={(e) => { setVerify(e.target.value); setPage(1); }}
          style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 8, padding: '9px 12px', color: 'var(--text)', fontSize: 13 }}>
          <option value="">All verification</option>
          <option value="unverified">unverified</option>
          <option value="valid">valid</option>
          <option value="risky">risky</option>
          <option value="invalid">invalid</option>
        </select>
        <span style={{ marginLeft: 'auto', fontSize: 12.5, color: 'var(--text-muted)' }}>
          {total.toLocaleString()} matching
        </span>
      </div>

      <div className="admin-card" style={{ overflowX: 'auto', padding: 0 }}>
        <table style={{ width: '100%', fontSize: 13 }}>
          <thead>
            <tr>
              <th>Prospect</th>
              <th>Store</th>
              <th>Country</th>
              <th>Intent app</th>
              <th>Tier</th>
              <th>Verify</th>
              <th>Scan</th>
              <th>Stage</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} style={{ textAlign: 'center', padding: 30, color: 'var(--text-muted)' }}>Loading…</td></tr>
            ) : rows.map((r) => (
              <tr key={r.id}>
                <td>
                  <div style={{ fontWeight: 600 }}>{r.name || '—'}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{r.email}</div>
                </td>
                <td>
                  {r.domain ? (
                    <a href={`https://${r.domain}`} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)' }}>
                      {r.storeName || r.domain} ↗
                    </a>
                  ) : (r.storeName || '—')}
                </td>
                <td style={{ fontSize: 12.5 }}>{r.country || '—'}</td>
                <td style={{ fontSize: 12.5 }}>{r.firstSeenApp || '—'}</td>
                <td>
                  <span style={{ fontSize: 11, fontWeight: 800, color: TIER_COLORS[r.tier] || 'var(--text-muted)' }}>{r.tier}</span>
                </td>
                <td style={{ fontSize: 12 }}>{r.verifyStatus === 'unverified' ? '—' : r.verifyStatus}</td>
                <td style={{ fontSize: 12 }} title={r.finding || undefined}>
                  {r.scanStatus === 'scanned' ? `✓ ${r.issueCount ?? '?'} issues` : r.scanStatus === 'pending' ? '—' : r.scanStatus}
                </td>
                <td>
                  <span style={{ fontSize: 11, fontWeight: 700, color: STAGE_COLORS[r.stage], background: `${STAGE_COLORS[r.stage]}1f`, padding: '3px 9px', borderRadius: 100 }}>
                    {r.stage}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ display: 'flex', gap: 10, alignItems: 'center', justifyContent: 'center', marginTop: 16 }}>
        <button className="admin-btn admin-btn-secondary" style={{ fontSize: 12 }} disabled={page <= 1} onClick={() => setPage(page - 1)}>← Prev</button>
        <span style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>Page {page} / {pages}</span>
        <button className="admin-btn admin-btn-secondary" style={{ fontSize: 12 }} disabled={page >= pages} onClick={() => setPage(page + 1)}>Next →</button>
      </div>
    </div>
  );
}
