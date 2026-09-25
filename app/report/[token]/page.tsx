// PUBLIC blurred Store Health Report — the scorecard funnel page.
//
// Reached only via the unguessable token emailed after a free-audit run (or
// shared in cold-email follow-ups). Branded with the STORE's own logo. Shows
// two real findings in full plus speed scores and crawl screenshots as proof
// of substance; the top three findings stay locked — their text is replaced
// SERVER-SIDE with dummy blurred lines, so DevTools reveals nothing.
// CTA: WhatsApp Rachna, or book the free walkthrough call.
import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { sendPushToAll } from '@/lib/webpush';
import CompetitorAsk from './CompetitorAsk';
import EngagementPing from './EngagementPing';
import FullReport, { FullReportPayload } from '@/app/components/storeproof/FullReport';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Your Store Health Report | Rachna Builds',
  robots: { index: false, follow: false },
};

const WHATSAPP = '919404643510';

interface Finding {
  title?: string;
  merchant_copy?: string;
  effort?: string;
}
interface SpeedPage { label: string; score: number; lcpMs: number }
interface SpeedWin { title: string; savingsMs: number }
interface Shot { label: string; dataUri: string }

const EFFORT_LABEL: Record<string, string> = {
  quick: 'Quick fix · days',
  small: 'Small project · 1–2 weeks',
  big: 'Larger project',
};

function effortMeta(f: Finding): { label: string; cls: 'quick' | 'small' } {
  // StoreProof effort scale: S = days, M = 1-2 weeks, L = larger
  const e = (f.effort || '').toLowerCase();
  if (e === 's' || e.includes('quick')) return { label: EFFORT_LABEL.quick, cls: 'quick' };
  if (e === 'l') return { label: EFFORT_LABEL.big, cls: 'small' };
  return { label: EFFORT_LABEL.small, cls: 'small' };
}

function scoreMeta(score: number): { word: string; bg: string; color: string } {
  if (score >= 90) return { word: 'Good', bg: '#D1FADF', color: '#067647' };
  if (score >= 50) return { word: 'Needs work', bg: '#FEF0C7', color: '#B54708' };
  return { word: 'Slow', bg: '#FEE4E2', color: '#B42318' };
}

export default async function PublicReportPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const report = await prisma.storeProofReport.findUnique({
    where: { publicToken: token },
    select: { id: true, storeName: true, host: true, findingsJson: true, funnelLeadId: true, clientId: true, firstViewedAt: true, publicFull: true },
  });
  if (!report) notFound();

  let findings: Finding[] = [];
  let opener = '';
  let brand: { logoUrl?: string; themeColor?: string } = {};
  let speed: { pages: SpeedPage[]; wins: SpeedWin[] } | null = null;
  let screenshots: Shot[] = [];
  let design: { notes: { title: string; note: string }[]; shots: Shot[] } | null = null;
  try {
    const parsed = JSON.parse(report.findingsJson);
    findings = parsed.findings || [];
    opener = parsed.opener || '';
    brand = parsed.brand || {};
    speed = parsed.speed?.pages?.length ? parsed.speed : null;
    screenshots = parsed.screenshots || [];
    design = parsed.design?.notes?.length ? parsed.design : null;
  } catch { /* malformed findings — render the shell */ }

  // Top 3 locked with blur; next 2 fully visible as proof; the rest are
  // locked title-only rows so the count on the page matches "N issues found".
  const locked = findings.slice(0, 3);
  const visible = findings.slice(3, 5);
  const rest = findings.slice(5);
  const total = findings.length;

  // Visit context: geo from Vercel's edge headers, device from the UA string —
  // free per-open behaviour data for the lead's activity card.
  const h = await headers();
  const ua = h.get('user-agent') || '';
  const os =
    /iPhone|iPad/.test(ua) ? 'iPhone' : /Android/.test(ua) ? 'Android'
    : /Macintosh/.test(ua) ? 'Mac' : /Windows/.test(ua) ? 'Windows' : /Linux/.test(ua) ? 'Linux' : null;
  const browser =
    /Instagram/.test(ua) ? 'Instagram in-app' : /FBAN|FBAV/.test(ua) ? 'Facebook in-app'
    : /Edg\//.test(ua) ? 'Edge' : /SamsungBrowser/.test(ua) ? 'Samsung Internet'
    : /Chrome|CriOS/.test(ua) ? 'Chrome' : /Firefox|FxiOS/.test(ua) ? 'Firefox' : /Safari/.test(ua) ? 'Safari' : null;
  const view = await prisma.storeProofReportView.create({
    data: {
      reportId: report.id,
      device: 'public',
      ip: (h.get('x-forwarded-for') || '').split(',')[0].trim() || null,
      country: h.get('x-vercel-ip-country') || null,
      city: h.get('x-vercel-ip-city') ? decodeURIComponent(h.get('x-vercel-ip-city')!) : null,
      timezone: h.get('x-vercel-ip-timezone') || null,
      os, browser,
      referrer: h.get('referer')?.slice(0, 200) || null,
    },
  }).catch(() => null);
  const wasFirstView = !report.firstViewedAt;
  await prisma.storeProofReport.update({
    where: { id: report.id },
    data: {
      viewCount: { increment: 1 },
      lastViewedAt: new Date(),
      ...(report.firstViewedAt ? {} : { firstViewedAt: new Date() }),
    },
  }).catch(() => {});
  if (wasFirstView) {
    // The lead is looking at their report RIGHT NOW — best follow-up moment.
    const where = [view?.city, view?.country].filter(Boolean).join(', ');
    const on = [view?.os, view?.browser].filter(Boolean).join(' · ');
    sendPushToAll(
      '👁 Report opened!',
      `${report.storeName} — reading it now${where ? ` from ${where}` : ''}${on ? ` (${on})` : ''}`,
      report.funnelLeadId ? `/admin/funnel-leads/${report.funnelLeadId}` : '/admin/storeproof',
    ).catch(() => {});
  }

  // Existing clients get the whole report unlocked on the same link (no blur, no sales CTA).
  if (report.publicFull) {
    let payload: FullReportPayload = {};
    try { payload = JSON.parse(report.findingsJson); } catch { /* render shell */ }
    // A prospect (lead, not a client) gets the findings but not the technical
    // PDF or effort badges — those carry the how-to we sell.
    const prospect = !!report.funnelLeadId && !report.clientId;
    const proposalToken = prospect
      ? (await prisma.proposal.findFirst({ where: { reportToken: token }, orderBy: { createdAt: 'desc' }, select: { token: true } }))?.token ?? null
      : null;
    const hasPdf = !prospect && (await prisma.storeProofReport.count({ where: { id: report.id, pdfData: { not: null } } })) > 0;
    return (
      <>
        {view && <EngagementPing token={token} viewId={view.id} />}
        {proposalToken && (
          <a href={`/proposal/${proposalToken}`} style={{ position: 'sticky', top: 0, zIndex: 20, display: 'block', background: '#0B3D2E', color: '#fff', textAlign: 'center', padding: '12px 16px', fontSize: 14, fontWeight: 700, textDecoration: 'none', fontFamily: "'Helvetica Neue', Arial, sans-serif" }}>
            ← Back to your proposal and plan options
          </a>
        )}
        <FullReport payload={payload} storeName={report.storeName} host={report.host} pdfUrl={hasPdf ? `/report/${token}/pdf` : null} hideEffort={prospect} />
      </>
    );
  }

  const bookUrl = report.funnelLeadId
    ? `/training/apply?lead=${report.funnelLeadId}`
    : '/training/apply';
  const waText = encodeURIComponent(
    `Hi Rachna! I just got my store report for ${report.host} — I'd like to go through the locked findings.`,
  );
  const waUrl = `https://wa.me/${WHATSAPP}?text=${waText}`;

  return (
    <div style={{ minHeight: '100vh', background: '#F6F8F7', color: '#1D2939', fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 15, lineHeight: 1.65 }}>
      {view && <EngagementPing token={token} viewId={view.id} />}
      <style>{`
        html, body { background: #F6F8F7 !important; }
        .rpt-wrap { max-width: 760px; margin: 0 auto; padding: 40px 24px 80px; }
        .rpt-masthead { display:flex; align-items:center; gap:16px; padding-bottom:20px; border-bottom:3px solid #171717; }
        .rpt-logo { max-height:48px; max-width:180px; object-fit:contain; }
        .rpt-storename { font-size:22px; font-weight:800; color:#171717; }
        .rpt-meta { margin-left:auto; text-align:right; font-size:12px; color:#667085; }
        .rpt-meta b { color:#0B3D2E; }
        .rpt-h1 { font-size:26px; color:#0B3D2E; letter-spacing:-0.02em; margin:26px 0 6px; font-weight:800; }
        .rpt-intro { color:#475467; font-size:14.5px; max-width:640px; }
        .rpt-summary { background:#fff; border:1px solid #E4E7EC; border-left:4px solid #06D6A0; border-radius:12px; padding:16px 20px; margin:20px 0 0; font-size:14px; color:#344054; }
        .rpt-finding { display:flex; gap:14px; border:1px solid #E4E7EC; background:#fff; border-radius:14px; padding:16px 18px; margin-bottom:12px; }
        .rpt-num { background:#06D6A0; color:#0B3D2E; font-weight:800; min-width:30px; height:30px; border-radius:9px; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
        .rpt-num.locked { background:#171717; color:#fff; }
        .rpt-fhead { display:flex; align-items:baseline; gap:10px; flex-wrap:wrap; margin-bottom:6px; }
        .rpt-fhead h4 { font-size:15px; color:#0B3D2E; margin:0; flex:1; min-width:200px; font-weight:700; }
        .rpt-effort { font-size:10.5px; font-weight:800; padding:3px 10px; border-radius:99px; white-space:nowrap; text-transform:uppercase; letter-spacing:0.04em; }
        .rpt-effort.quick { background:#D1FADF; color:#067647; }
        .rpt-effort.small { background:#FEF0C7; color:#B54708; }
        .rpt-body { font-size:13.5px; color:#344054; margin:0; }
        .rpt-blur-line { height:11px; border-radius:6px; background:#CBD5E1; margin:7px 0; filter:blur(4px); }
        .rpt-blur-line:nth-child(2) { width:92%; }
        .rpt-blur-line:nth-child(3) { width:78%; }
        .rpt-locknote { font-size:12px; font-weight:700; margin-top:9px; display:flex; align-items:center; gap:6px; }
        .rpt-lockedwrap { background:#0B3D2E; border-radius:18px; padding:24px 26px; margin:26px 0; }
        .rpt-lockedwrap h2 { color:#fff; font-size:18px; margin:0 0 4px; }
        .rpt-lockedwrap .sub { color:#9AE6C6; font-size:13px; margin-bottom:14px; }
        .rpt-lockedwrap .rpt-finding { background:rgba(255,255,255,0.06); border-color:rgba(255,255,255,0.12); }
        .rpt-lockedwrap .rpt-fhead h4 { color:#fff; }
        .rpt-lockedwrap .rpt-locknote { color:#9AE6C6; }
        .rpt-lockedwrap .rpt-blur-line { background:rgba(255,255,255,0.25); }
        .rpt-restrow { display:flex; align-items:center; gap:10px; background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.12); border-radius:10px; padding:10px 14px; margin-bottom:8px; font-size:13.5px; color:#D1FADF; font-weight:600; }
        .rpt-h2 { font-size:19px; color:#0B3D2E; margin:32px 0 4px; font-weight:800; }
        .rpt-h2sub { color:#667085; font-size:13px; margin:0 0 14px; }
        .rpt-speedcard { background:#fff; border:1px solid #E4E7EC; border-radius:14px; padding:18px 20px; }
        .rpt-chips { display:flex; gap:8px; flex-wrap:wrap; }
        .rpt-chip { font-size:11.5px; font-weight:800; padding:5px 13px; border-radius:99px; }
        .rpt-wins { margin:12px 0 0; font-size:13.5px; color:#344054; }
        .rpt-shots { display:flex; gap:16px; flex-wrap:wrap; margin-top:14px; }
        .rpt-shot { flex:1; min-width:180px; max-width:230px; }
        .rpt-shot img { width:100%; border-radius:14px; border:1px solid #E4E7EC; box-shadow:0 4px 18px rgba(16,24,40,0.08); }
        .rpt-shot figcaption { font-size:12px; color:#667085; margin-top:6px; text-align:center; }
        .rpt-designshot img { width:100%; max-width:340px; border-radius:12px; border:1px solid #E4E7EC; display:block; }
        .rpt-designshot figcaption { font-size:12px; color:#667085; margin-top:6px; }
        .rpt-designlocked { background:#fff; border:1px dashed #98A2B3; border-radius:14px; padding:14px 18px; margin-top:12px; }
        .rpt-designrow { font-size:13.5px; color:#475467; padding:6px 0; border-bottom:1px solid #F2F4F7; font-weight:600; }
        .rpt-designrow:last-of-type { border-bottom:none; }
        .rpt-designnote { font-size:12.5px; color:#667085; margin-top:8px; font-style:italic; }
        .rpt-cta { background:#fff; border:2px solid #171717; border-radius:16px; padding:26px 28px; margin-top:34px; text-align:center; }
        .rpt-cta h2 { color:#0B3D2E; font-size:19px; margin:0 0 8px; }
        .rpt-cta p { font-size:14px; color:#344054; margin:0 0 18px; }
        .rpt-btnrow { display:flex; gap:12px; justify-content:center; flex-wrap:wrap; }
        .rpt-btn { display:inline-block; background:#06D6A0; color:#0B3D2E; font-weight:800; font-size:15px; padding:14px 30px; border-radius:10px; text-decoration:none; letter-spacing:-0.01em; }
        .rpt-btn.secondary { background:#fff; color:#0B3D2E; border:2px solid #0B3D2E; padding:12px 28px; }
        .rpt-btn:hover { filter:brightness(1.05); }
        .rpt-count { display:flex; gap:10px; margin:24px 0; flex-wrap:wrap; }
        .rpt-count .chip { background:#fff; border:1px solid #E4E7EC; border-radius:12px; padding:12px 18px; font-size:13px; color:#475467; }
        .rpt-count .chip b { display:block; font-size:22px; color:#0B3D2E; }
        footer { margin-top:36px; color:#667085; font-size:12px; border-top:1px solid #E4E7EC; padding-top:14px; }
        .rpt-comp { background:#fff; border:1px solid #E4E7EC; border-radius:16px; padding:22px 24px; margin-top:30px; }
        .rpt-comp h2 { color:#0B3D2E; font-size:17px; margin:0 0 6px; }
        .rpt-comp p { font-size:13.5px; color:#475467; margin:0 0 14px; }
        .rpt-comp-row { display:flex; gap:10px; flex-wrap:wrap; }
        .rpt-comp-row input { flex:1; min-width:150px; border:1px solid #D0D5DD; border-radius:9px; padding:11px 13px; font-size:13.5px; color:#1D2939; background:#F9FAFB; }
        .rpt-comp-row input:focus { outline:2px solid #06D6A0; border-color:#06D6A0; }
        .rpt-comp-row button { background:#0B3D2E; color:#fff; font-weight:800; font-size:13.5px; border:none; padding:11px 22px; border-radius:9px; cursor:pointer; }
        .rpt-comp-row button:disabled { opacity:0.5; cursor:default; }
        .rpt-fab { position:fixed; right:22px; bottom:22px; width:58px; height:58px; border-radius:50%; background:#25D366; color:#fff; display:flex; align-items:center; justify-content:center; box-shadow:0 6px 22px rgba(16,24,40,0.28); z-index:60; text-decoration:none; }
        .rpt-fab svg { width:30px; height:30px; }
        .rpt-sticky { display:none; }
        @media (max-width: 640px) {
          .rpt-wrap { padding-bottom: 110px; padding-left:14px; padding-right:14px; }
          .rpt-h1 { font-size: 21px; }
          .rpt-logo { max-height:38px; max-width:130px; }
          .rpt-fab { display:none; }
          .rpt-comp-row { flex-direction: column; }
          .rpt-comp-row input { min-width: 0; }
          .rpt-sticky { display:flex; position:fixed; bottom:0; left:0; right:0; gap:10px;
            padding:12px 16px calc(12px + env(safe-area-inset-bottom)); background:rgba(255,255,255,0.96);
            border-top:1px solid #E4E7EC; backdrop-filter:blur(8px); z-index:50; }
          .rpt-sticky .rpt-btn { flex:1; text-align:center; padding:13px 10px; font-size:14px; }
        }
      `}</style>
      <div className="rpt-wrap">
        <div className="rpt-masthead">
          {brand.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img className="rpt-logo" src={brand.logoUrl} alt={report.storeName} />
          ) : (
            <div className="rpt-storename">{report.storeName}</div>
          )}
          <div className="rpt-meta"><b>Store Health Report</b><br />Prepared by Rachna Builds</div>
        </div>

        <h1 className="rpt-h1">What&apos;s quietly costing {report.storeName} sales</h1>
        <p className="rpt-intro">
          We went through {report.host} the way a real shopper does — on a phone, from first visit
          to checkout — and the way Google and your ad platforms see it.
        </p>
        {opener && <div className="rpt-summary" data-track="Summary">{opener}</div>}

        <div className="rpt-count">
          <div className="chip"><b>{total}</b> issues found</div>
          <div className="chip"><b>{visible.length}</b> open below</div>
          <div className="chip"><b>{locked.length + rest.length}</b> unlocked on your call</div>
        </div>

        {visible.map((f, i) => {
          const e = effortMeta(f);
          return (
            <div className="rpt-finding" key={i} data-track={`Finding: ${f.title?.slice(0, 48) || i + 1}`}>
              <span className="rpt-num">{i + 1}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="rpt-fhead">
                  <h4>{f.title}</h4>
                  <span className={`rpt-effort ${e.cls}`}>{e.label}</span>
                </div>
                <p className="rpt-body">{f.merchant_copy}</p>
              </div>
            </div>
          );
        })}

        {speed && (
          <>
            <h2 className="rpt-h2">Is your store fast enough?</h2>
            <p className="rpt-h2sub">Measured with Google&apos;s own engine on a typical phone — the same test Google ranks you by.</p>
            <div className="rpt-speedcard" data-track="Speed scores">
              <div className="rpt-chips">
                {speed.pages.map((p, i) => {
                  const m = scoreMeta(p.score);
                  return (
                    <span className="rpt-chip" key={i} style={{ background: m.bg, color: m.color }}>
                      {p.label}: {m.word} ({p.score}/100)
                    </span>
                  );
                })}
              </div>
              {speed.wins.length > 0 && (
                <p className="rpt-wins">
                  <b>Biggest speed wins we found:</b>{' '}
                  {speed.wins.map((w) => `${w.title} (saves ~${(w.savingsMs / 1000).toFixed(1)}s)`).join(' · ')}
                </p>
              )}
            </div>
          </>
        )}

        {screenshots.length > 0 && (
          <>
            <h2 className="rpt-h2">What we saw on your store</h2>
            <p className="rpt-h2sub">Captured during the audit — exactly what a mobile shopper gets.</p>
            <div className="rpt-shots" data-track="Screenshots">
              {screenshots.map((s, i) => (
                <figure className="rpt-shot" key={i} style={{ margin: 0 }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={s.dataUri} alt={s.label} />
                  <figcaption>{s.label}</figcaption>
                </figure>
              ))}
            </div>
          </>
        )}

        {design && (
          <div data-track="Design review">
            <h2 className="rpt-h2">A designer&apos;s eye on your store</h2>
            <p className="rpt-h2sub">Beyond the technical checks — how the store reads to a first-time shopper.</p>
            {design.shots[0] && (
              <figure className="rpt-shot rpt-designshot" style={{ margin: '0 0 14px' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={design.shots[0].dataUri} alt={design.shots[0].label} />
                <figcaption>{design.shots[0].label}</figcaption>
              </figure>
            )}
            <div className="rpt-finding">
              <span className="rpt-num">✏️</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="rpt-fhead"><h4>{design.notes[0].title}</h4></div>
                <p className="rpt-body">{design.notes[0].note}</p>
              </div>
            </div>
            {design.notes.length > 1 && (
              <div className="rpt-designlocked">
                {design.notes.slice(1).map((n, i) => (
                  <div key={i} className="rpt-designrow">🔒 {n.title}</div>
                ))}
                <div className="rpt-designnote">We walk through {design.notes.length - 1 === 1 ? 'this one' : `these ${design.notes.length - 1}`} with examples on your free call.</div>
              </div>
            )}
          </div>
        )}

        <div data-track="Competitor form"><CompetitorAsk token={token} /></div>

        <div className="rpt-lockedwrap" data-track="Locked top-3">
          <h2>The three things costing you the most</h2>
          <div className="sub">Ranked by revenue impact — we walk you through all three, live, on your free call.</div>
          {locked.map((f, i) => {
            const e = effortMeta(f);
            return (
              <div className="rpt-finding" key={i}>
                <span className="rpt-num locked">🔒</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="rpt-fhead">
                    <h4>{f.title}</h4>
                    <span className={`rpt-effort ${e.cls}`}>{e.label}</span>
                  </div>
                  <div aria-hidden="true">
                    <div className="rpt-blur-line" />
                    <div className="rpt-blur-line" />
                    <div className="rpt-blur-line" />
                  </div>
                  <div className="rpt-locknote">🔓 Unlocked on your free walkthrough call</div>
                </div>
              </div>
            );
          })}
          {rest.length > 0 && (
            <>
              <div className="sub" style={{ margin: '16px 0 10px' }}>Also in your full report:</div>
              {rest.map((f, i) => (
                <div className="rpt-restrow" key={i}>
                  <span>🔒</span>
                  <span>{f.title}</span>
                </div>
              ))}
            </>
          )}
        </div>

        <div className="rpt-cta" data-track="Call CTA">
          <h2>See all {total} findings — on your store, live</h2>
          <p>
            A free 20-minute walkthrough: we share the full report, go through the top three
            issues on your actual store, and you leave knowing exactly what to fix first.
            No pitch decks. No obligation.
          </p>
          <div className="rpt-btnrow">
            <a className="rpt-btn" href={waUrl} target="_blank" rel="noopener noreferrer">💬 WhatsApp Rachna</a>
            <a className="rpt-btn secondary" href={bookUrl}>Book a Call →</a>
          </div>
        </div>

        <footer>
          Prepared by Rachna Builds using an automated public review of {report.host} — no store
          access was used. Full technical detail is shared on the call and in your client portal.
        </footer>
      </div>

      <a className="rpt-fab" href={waUrl} target="_blank" rel="noopener noreferrer" aria-label="WhatsApp Rachna">
        <svg viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.52.149-.174.198-.298.297-.497.1-.198.05-.371-.025-.52-.074-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
      </a>

      <div className="rpt-sticky">
        <a className="rpt-btn" href={waUrl} target="_blank" rel="noopener noreferrer">💬 WhatsApp Rachna</a>
        <a className="rpt-btn secondary" href={bookUrl}>Book a Call</a>
      </div>
    </div>
  );
}
