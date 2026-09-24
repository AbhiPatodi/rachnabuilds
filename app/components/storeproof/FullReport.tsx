// The FULL Store Health Report — every finding unlocked, speed, competitor
// benchmark, screenshot gallery, technical-PDF link. Rendered from the
// report's stored payload (findingsJson). Used by both the admin viewer and
// the gated client-portal page; falls back to nothing gracefully when a
// section's data wasn't gathered for that run.
import React from 'react';

interface Finding { title?: string; merchant_copy?: string; effort?: string; severity?: string; fix_tier?: string; impact?: string | { assumption_note?: string; basis?: string } }
interface SpeedPage { label: string; score: number; lcpMs: number }
interface SpeedWin { title: string; savingsMs: number }
interface Shot { label: string; dataUri: string }
interface BenchRow {
  host: string; isClient: boolean; error: string | null;
  lcpMs: number | null; inpMs: number | null; cls: number | null; lcpGoodPct: number | null;
}

export interface FullReportPayload {
  findings?: Finding[];
  opener?: string;
  brand?: { logoUrl?: string };
  speed?: { pages: SpeedPage[]; wins: SpeedWin[] } | null;
  screenshots?: Shot[];
  benchmark?: BenchRow[];
  checkStats?: { run: number; failures: number; warnings: number; passing: number };
  healthByArea?: { area: string; fail: number; warn: number; total: number; verdict: string }[];
  design?: { notes: { title: string; note: string }[]; shots: Shot[] } | null;
}

const SEVERITY_STYLE: Record<string, { bg: string; color: string }> = {
  blocker: { bg: '#B42318', color: '#fff' },
  high: { bg: '#DC6803', color: '#fff' },
  medium: { bg: '#B54708', color: '#fff' },
  low: { bg: '#475467', color: '#fff' },
};

const FIX_TIER: Record<string, string> = {
  a: 'API fix — fast, reversible', b: 'Theme code fix', c: 'Settings/app change',
};

const EFFORT: Record<string, { label: string; cls: string }> = {
  s: { label: 'Quick fix · days', cls: 'quick' },
  m: { label: 'Small project · 1–2 weeks', cls: 'small' },
  l: { label: 'Larger project', cls: 'small' },
};

function effortOf(f: Finding) {
  return EFFORT[(f.effort || 'm').toLowerCase()] || EFFORT.m;
}

function scoreMeta(score: number) {
  if (score >= 90) return { word: 'Good', bg: '#D1FADF', color: '#067647' };
  if (score >= 50) return { word: 'Needs work', bg: '#FEF0C7', color: '#B54708' };
  return { word: 'Slow', bg: '#FEE4E2', color: '#B42318' };
}

function fmtS(ms: number | null) {
  return ms === null ? '—' : `${(ms / 1000).toFixed(1)}s`;
}

export default function FullReport({
  payload, storeName, host, pdfUrl,
}: {
  payload: FullReportPayload;
  storeName: string;
  host: string;
  pdfUrl?: string | null;
}) {
  const findings = payload.findings || [];
  const brand = payload.brand || {};
  const speed = payload.speed?.pages?.length ? payload.speed : null;
  const screenshots = payload.screenshots || [];
  const benchmark = (payload.benchmark || []).filter((b) => b.isClient || !b.error);
  const clientBench = payload.benchmark?.find((b) => b.isClient);
  const stats = payload.checkStats;
  const areas = payload.healthByArea || [];

  return (
    <div style={{ minHeight: '100vh', background: '#F6F8F7', color: '#1D2939', fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 15, lineHeight: 1.65 }}>
      <style>{`
        html, body { background: #F6F8F7 !important; }
        .fr-wrap { max-width: 800px; margin: 0 auto; padding: 40px 24px 80px; }
        .fr-masthead { display:flex; align-items:center; gap:16px; padding-bottom:20px; border-bottom:3px solid #171717; }
        .fr-logo { max-height:48px; max-width:180px; object-fit:contain; }
        .fr-storename { font-size:22px; font-weight:800; color:#171717; }
        .fr-meta { margin-left:auto; text-align:right; font-size:12px; color:#667085; }
        .fr-meta b { color:#0B3D2E; }
        .fr-h1 { font-size:26px; color:#0B3D2E; letter-spacing:-0.02em; margin:26px 0 6px; font-weight:800; }
        .fr-intro { color:#475467; font-size:14.5px; max-width:680px; }
        .fr-summary { background:#fff; border:1px solid #E4E7EC; border-left:4px solid #06D6A0; border-radius:12px; padding:16px 20px; margin:20px 0 0; font-size:14px; color:#344054; }
        .fr-h2 { font-size:19px; color:#0B3D2E; margin:34px 0 4px; font-weight:800; }
        .fr-h2sub { color:#667085; font-size:13px; margin:0 0 14px; }
        .fr-finding { display:flex; gap:14px; border:1px solid #E4E7EC; background:#fff; border-radius:14px; padding:16px 18px; margin-bottom:12px; }
        .fr-num { background:#06D6A0; color:#0B3D2E; font-weight:800; min-width:30px; height:30px; border-radius:9px; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
        .fr-fhead { display:flex; align-items:baseline; gap:10px; flex-wrap:wrap; margin-bottom:6px; }
        .fr-fhead h4 { font-size:15px; color:#0B3D2E; margin:0; flex:1; min-width:200px; font-weight:700; }
        .fr-effort { font-size:10.5px; font-weight:800; padding:3px 10px; border-radius:99px; white-space:nowrap; text-transform:uppercase; letter-spacing:0.04em; }
        .fr-effort.quick { background:#D1FADF; color:#067647; }
        .fr-effort.small { background:#FEF0C7; color:#B54708; }
        .fr-body { font-size:13.5px; color:#344054; margin:0; }
        .fr-card { background:#fff; border:1px solid #E4E7EC; border-radius:14px; padding:18px 20px; }
        .fr-chips { display:flex; gap:8px; flex-wrap:wrap; }
        .fr-chip { font-size:11.5px; font-weight:800; padding:5px 13px; border-radius:99px; }
        .fr-wins { margin:12px 0 0; font-size:13.5px; color:#344054; }
        .fr-table { width:100%; border-collapse:collapse; font-size:13px; }
        .fr-table th { text-align:left; font-size:11px; letter-spacing:0.06em; text-transform:uppercase; color:#667085; padding:8px 10px; border-bottom:2px solid #E4E7EC; }
        .fr-table td { padding:10px; border-bottom:1px solid #F2F4F7; }
        .fr-table tr.client { background:#F0FDF9; font-weight:700; }
        .fr-shots { display:grid; grid-template-columns:repeat(auto-fill,minmax(180px,1fr)); gap:16px; margin-top:14px; }
        .fr-shot img { width:100%; border-radius:14px; border:1px solid #E4E7EC; box-shadow:0 4px 18px rgba(16,24,40,0.08); }
        .fr-shot figcaption { font-size:12px; color:#667085; margin-top:6px; text-align:center; }
        .fr-pdf { display:inline-block; background:#0B3D2E; color:#fff; font-weight:800; font-size:13.5px; padding:12px 24px; border-radius:10px; text-decoration:none; }
        footer { margin-top:36px; color:#667085; font-size:12px; border-top:1px solid #E4E7EC; padding-top:14px; }
        @media print { .fr-pdf { display:none; } }
        .fr-stats { display:grid; grid-template-columns:repeat(auto-fit,minmax(130px,1fr)); gap:12px; margin:24px 0 0; }
        .fr-stat { background:#fff; border:1px solid #E4E7EC; border-radius:12px; padding:14px 16px; }
        .fr-stat b { display:block; font-size:26px; color:#0B3D2E; }
        .fr-stat.bad b { color:#B42318; }
        .fr-stat.warn b { color:#B54708; }
        .fr-stat.good b { color:#067647; }
        .fr-stat span { font-size:12px; color:#667085; }
        .fr-sev { font-size:10px; font-weight:800; padding:3px 9px; border-radius:99px; text-transform:uppercase; letter-spacing:0.05em; }
        .fr-tag { font-size:10.5px; font-weight:700; padding:3px 9px; border-radius:99px; background:#F2F4F7; color:#475467; }
        .fr-impact { font-size:12.5px; color:#667085; font-style:italic; margin:8px 0 0; }
        .fr-closer { background:#fff; border:2px solid #171717; border-radius:16px; padding:22px 24px; margin-top:34px; }
        .fr-closer h2 { color:#0B3D2E; font-size:17px; margin:0 0 6px; }
        .fr-closer p { font-size:14px; color:#344054; margin:0; }
        @media (max-width: 640px) {
          .fr-wrap { padding: 24px 14px 60px; }
          .fr-h1 { font-size: 21px; }
          .fr-masthead { gap: 10px; }
          .fr-logo { max-height: 38px; max-width: 130px; }
          .fr-meta { font-size: 10.5px; }
          .fr-finding { padding: 13px 13px; gap: 10px; }
          .fr-table th, .fr-table td { padding: 8px 6px; font-size: 12px; }
          .fr-shots { grid-template-columns: repeat(2, 1fr); gap: 10px; }
          .fr-stats { grid-template-columns: repeat(2, 1fr); }
        }
      `}</style>
      <div className="fr-wrap">
        <div className="fr-masthead">
          {brand.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img className="fr-logo" src={brand.logoUrl} alt={storeName} />
          ) : (
            <div className="fr-storename">{storeName}</div>
          )}
          <div className="fr-meta"><b>Store Health Report — Full</b><br />Prepared by Rachna Builds</div>
        </div>

        <h1 className="fr-h1">What&apos;s quietly costing {storeName} sales — the full picture</h1>
        <p className="fr-intro">
          We went through {host} the way a real shopper does — on a phone, from first visit to
          checkout — and the way Google and your ad platforms see it. Every finding below names
          your actual products and pages.
        </p>
        {payload.opener && <div className="fr-summary">{payload.opener}</div>}

        {stats && (
          <div className="fr-stats">
            <div className="fr-stat"><b>{stats.run}</b><span>automated checks run</span></div>
            <div className="fr-stat bad"><b>{stats.failures}</b><span>failures found</span></div>
            <div className="fr-stat warn"><b>{stats.warnings}</b><span>warnings</span></div>
            <div className="fr-stat good"><b>{stats.passing}</b><span>passing</span></div>
          </div>
        )}

        <h2 className="fr-h2">All {findings.length} findings, ranked by impact</h2>
        <p className="fr-h2sub">Top of the list = costing you the most, fix first.</p>
        {findings.map((f, i) => {
          const e = effortOf(f);
          return (
            <div className="fr-finding" key={i}>
              <span className="fr-num">{i + 1}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="fr-fhead">
                  <h4>{f.title}</h4>
                  {f.severity && (() => {
                    const sv = SEVERITY_STYLE[f.severity.toLowerCase()] || SEVERITY_STYLE.low;
                    return <span className="fr-sev" style={{ background: sv.bg, color: sv.color }}>{f.severity}</span>;
                  })()}
                  {f.fix_tier && <span className="fr-tag">{FIX_TIER[f.fix_tier.toLowerCase()] || f.fix_tier}</span>}
                  <span className={`fr-effort ${e.cls}`}>{e.label}</span>
                </div>
                <p className="fr-body">{f.merchant_copy}</p>
                {(() => {
                  const impactText = typeof f.impact === 'string' ? f.impact : f.impact?.assumption_note;
                  return impactText ? <p className="fr-impact">{impactText}</p> : null;
                })()}
              </div>
            </div>
          );
        })}

        {areas.length > 0 && (
          <>
            <h2 className="fr-h2">Health by area</h2>
            <p className="fr-h2sub">Every corner of the store we checked, at a glance.</p>
            <div className="fr-card" style={{ overflowX: 'auto', padding: 0 }}>
              <table className="fr-table">
                <thead><tr><th>Area</th><th>Verdict</th><th>Failures</th><th>Warnings</th><th>Checks</th></tr></thead>
                <tbody>
                  {areas.map((a, i) => (
                    <tr key={i}>
                      <td>{a.area}</td>
                      <td style={{ fontWeight: 800, color: a.verdict === 'Good' ? '#067647' : a.verdict === 'Fair' ? '#B54708' : '#B42318' }}>{a.verdict}</td>
                      <td>{a.fail}</td>
                      <td>{a.warn}</td>
                      <td>{a.total}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {speed && (
          <>
            <h2 className="fr-h2">Speed — measured with Google&apos;s own engine</h2>
            <p className="fr-h2sub">On a typical phone, the same test Google ranks you by.</p>
            <div className="fr-card">
              <div className="fr-chips">
                {speed.pages.map((p, i) => {
                  const m = scoreMeta(p.score);
                  return (
                    <span className="fr-chip" key={i} style={{ background: m.bg, color: m.color }}>
                      {p.label}: {m.word} ({p.score}/100)
                    </span>
                  );
                })}
              </div>
              {speed.wins.length > 0 && (
                <p className="fr-wins">
                  <b>Biggest speed wins:</b>{' '}
                  {speed.wins.map((w) => `${w.title} (saves ~${(w.savingsMs / 1000).toFixed(1)}s)`).join(' · ')}
                </p>
              )}
            </div>
          </>
        )}

        {benchmark.length > 0 && (
          <>
            <h2 className="fr-h2">You vs. your competitors — real shopper data</h2>
            <p className="fr-h2sub">
              Google&apos;s Chrome UX Report: what actual visitors experienced on each store over the
              last 28 days (mobile). Lower is faster.
            </p>
            <div className="fr-card" style={{ overflowX: 'auto', padding: 0 }}>
              <table className="fr-table">
                <thead>
                  <tr><th>Store</th><th>Load (LCP)</th><th>Responsiveness (INP)</th><th>Stability (CLS)</th><th>Fast loads</th></tr>
                </thead>
                <tbody>
                  {benchmark.map((b, i) => (
                    <tr key={i} className={b.isClient ? 'client' : undefined}>
                      <td>{b.host}{b.isClient ? ' (you)' : ''}</td>
                      {b.error ? (
                        <td colSpan={4} style={{ color: '#667085', fontSize: 12.5 }}>
                          Not enough real-user traffic for Google to report — lab scores above tell your story
                        </td>
                      ) : (
                        <>
                          <td>{fmtS(b.lcpMs)}</td>
                          <td>{b.inpMs === null ? '—' : `${b.inpMs}ms`}</td>
                          <td>{b.cls === null ? '—' : b.cls}</td>
                          <td>{b.lcpGoodPct === null ? '—' : `${b.lcpGoodPct}%`}</td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {clientBench?.error && (
              <p style={{ fontSize: 13, color: '#475467', marginTop: 10 }}>
                The upside: none of these competitors is truly fast on mobile — speed is an open
                advantage in your category, and it&apos;s buildable.
              </p>
            )}
          </>
        )}

        {payload.design?.notes?.length ? (
          <>
            <h2 className="fr-h2">Design review — how the store reads to a shopper</h2>
            <p className="fr-h2sub">Beyond the automated checks: an expert pass over the store&apos;s first impression, hierarchy, and trust signals.</p>
            {(payload.design.shots || []).length > 0 && (
              <div className="fr-shots" style={{ marginBottom: 14 }}>
                {payload.design.shots.map((s, i) => (
                  <figure className="fr-shot" key={i} style={{ margin: 0 }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={s.dataUri} alt={s.label} />
                    <figcaption>{s.label}</figcaption>
                  </figure>
                ))}
              </div>
            )}
            {payload.design.notes.map((n, i) => (
              <div className="fr-finding" key={i}>
                <span className="fr-num">✏️</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="fr-fhead"><h4>{n.title}</h4></div>
                  <p className="fr-body">{n.note}</p>
                </div>
              </div>
            ))}
          </>
        ) : null}

        {screenshots.length > 0 && (
          <>
            <h2 className="fr-h2">What we saw on your store</h2>
            <p className="fr-h2sub">Captured during the audit — including the cart and checkout walk a real buyer takes.</p>
            <div className="fr-shots">
              {screenshots.map((s, i) => (
                <figure className="fr-shot" key={i} style={{ margin: 0 }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={s.dataUri} alt={s.label} />
                  <figcaption>{s.label}</figcaption>
                </figure>
              ))}
            </div>
          </>
        )}

        {pdfUrl && (
          <>
            <h2 className="fr-h2">For your developer</h2>
            <p className="fr-h2sub">The complete technical report — every check, with evidence.</p>
            <a className="fr-pdf" href={pdfUrl}>Download Technical Report (PDF) ↓</a>
          </>
        )}

        <div className="fr-closer">
          <h2>The honest bottom line</h2>
          <p>
            None of this is unusual — most stores accumulate these issues as they grow. What matters
            is that every item above has a known fix, most are days not months, and each one is
            measurable: we re-test after every change so you see the before and after on your own
            store, not promises.
          </p>
        </div>

        <footer>
          Prepared by Rachna Builds using an automated public review of {host} — no store access
          was used. Impact statements reference industry benchmarks; we never estimate your
          private revenue.
        </footer>
      </div>
    </div>
  );
}
