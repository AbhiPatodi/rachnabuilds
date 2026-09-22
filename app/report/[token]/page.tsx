// PUBLIC blurred Store Health Report — the scorecard funnel page.
//
// Reached only via the unguessable token emailed after a free-audit run.
// Shows 2 real findings in full (proof of substance) and locks the top 3
// (title + effort visible, the substance replaced SERVER-SIDE with dummy
// blurred lines — the locked text never leaves the server, so DevTools
// reveals nothing). CTA: book the free walkthrough call.
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Your Store Health Report | Rachna Builds',
  robots: { index: false, follow: false },
};

interface Finding {
  title?: string;
  merchant_copy?: string;
  effort?: string;
  category?: string;
}

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

export default async function PublicReportPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const report = await prisma.storeProofReport.findUnique({
    where: { publicToken: token },
    select: { id: true, storeName: true, host: true, findingsJson: true, funnelLeadId: true },
  });
  if (!report) notFound();

  let findings: Finding[] = [];
  let opener = '';
  try {
    const parsed = JSON.parse(report.findingsJson);
    findings = parsed.findings || [];
    opener = parsed.opener || '';
  } catch { /* malformed findings — render the shell */ }

  // Top 3 locked; next 2 fully visible as proof. (StoreProof orders findings
  // by impact, so the locked ones are genuinely the most valuable.)
  const locked = findings.slice(0, 3);
  const visible = findings.slice(3, 5);
  const total = findings.length;

  // Log the open as a view (public views count toward engagement too)
  await prisma.$transaction([
    prisma.storeProofReportView.create({ data: { reportId: report.id, device: 'public' } }),
    prisma.storeProofReport.update({
      where: { id: report.id },
      data: { viewCount: { increment: 1 }, lastViewedAt: new Date() },
    }),
  ]).catch(() => {});

  const bookUrl = report.funnelLeadId
    ? `/training/apply?lead=${report.funnelLeadId}`
    : '/training/apply';

  return (
    <div style={{ minHeight: '100vh', background: '#F6F8F7', color: '#1D2939', fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 15, lineHeight: 1.65 }}>
      <style>{`
        html, body { background: #F6F8F7 !important; }
        .rpt-wrap { max-width: 760px; margin: 0 auto; padding: 40px 24px 80px; }
        .rpt-masthead { display:flex; align-items:center; gap:14px; padding-bottom:20px; border-bottom:3px solid #171717; }
        .rpt-brand { font-size:20px; font-weight:800; color:#0B3D2E; letter-spacing:-0.5px; }
        .rpt-brand span { color:#06D6A0; }
        .rpt-meta { margin-left:auto; text-align:right; font-size:12px; color:#667085; }
        .rpt-h1 { font-size:26px; color:#0B3D2E; letter-spacing:-0.02em; margin:26px 0 6px; font-weight:800; }
        .rpt-intro { color:#475467; font-size:14.5px; max-width:640px; }
        .rpt-finding { display:flex; gap:14px; border:1px solid #E4E7EC; background:#fff; border-radius:14px; padding:16px 18px; margin-bottom:12px; }
        .rpt-num { background:#06D6A0; color:#0B3D2E; font-weight:800; min-width:30px; height:30px; border-radius:9px; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
        .rpt-num.locked { background:#171717; color:#fff; }
        .rpt-fhead { display:flex; align-items:baseline; gap:10px; flex-wrap:wrap; margin-bottom:6px; }
        .rpt-fhead h4 { font-size:15px; color:#0B3D2E; margin:0; flex:1; min-width:200px; font-weight:700; }
        .rpt-effort { font-size:10.5px; font-weight:800; padding:3px 10px; border-radius:99px; white-space:nowrap; text-transform:uppercase; letter-spacing:0.04em; }
        .rpt-effort.quick { background:#D1FADF; color:#067647; }
        .rpt-effort.small { background:#FEF0C7; color:#B54708; }
        .rpt-body { font-size:13.5px; color:#344054; margin:0; }
        .rpt-blur { position:relative; overflow:hidden; border-radius:6px; }
        .rpt-blur-line { height:11px; border-radius:6px; background:#CBD5E1; margin:7px 0; filter:blur(4px); }
        .rpt-blur-line:nth-child(2) { width:92%; background:#D6DCE5; }
        .rpt-blur-line:nth-child(3) { width:78%; }
        .rpt-locknote { font-size:12px; font-weight:700; color:#0B3D2E; margin-top:9px; display:flex; align-items:center; gap:6px; }
        .rpt-lockedwrap { background:#0B3D2E; border-radius:18px; padding:24px 26px; margin:26px 0; }
        .rpt-lockedwrap h2 { color:#fff; font-size:18px; margin:0 0 4px; }
        .rpt-lockedwrap .sub { color:#9AE6C6; font-size:13px; margin-bottom:14px; }
        .rpt-lockedwrap .rpt-finding { background:rgba(255,255,255,0.06); border-color:rgba(255,255,255,0.12); }
        .rpt-lockedwrap .rpt-fhead h4 { color:#fff; }
        .rpt-lockedwrap .rpt-locknote { color:#9AE6C6; }
        .rpt-lockedwrap .rpt-blur-line { background:rgba(255,255,255,0.25); }
        .rpt-cta { background:#fff; border:2px solid #171717; border-radius:16px; padding:26px 28px; margin-top:34px; text-align:center; }
        .rpt-cta h2 { color:#0B3D2E; font-size:19px; margin:0 0 8px; }
        .rpt-cta p { font-size:14px; color:#344054; margin:0 0 18px; }
        .rpt-btn { display:inline-block; background:#06D6A0; color:#0B3D2E; font-weight:800; font-size:15px; padding:14px 34px; border-radius:10px; text-decoration:none; letter-spacing:-0.01em; }
        .rpt-btn:hover { filter:brightness(1.05); }
        .rpt-count { display:flex; gap:10px; margin:24px 0; flex-wrap:wrap; }
        .rpt-count .chip { background:#fff; border:1px solid #E4E7EC; border-radius:12px; padding:12px 18px; font-size:13px; color:#475467; }
        .rpt-count .chip b { display:block; font-size:22px; color:#0B3D2E; }
        footer { margin-top:36px; color:#667085; font-size:12px; border-top:1px solid #E4E7EC; padding-top:14px; }
      `}</style>
      <div className="rpt-wrap">
        <div className="rpt-masthead">
          <div className="rpt-brand">Rachna Builds<span>.</span></div>
          <div className="rpt-meta"><b>Store Health Report</b><br />{report.storeName}</div>
        </div>

        <h1 className="rpt-h1">What&apos;s quietly costing {report.storeName} sales</h1>
        <p className="rpt-intro">
          We went through {report.host} the way a real shopper does — on a phone, from first visit
          to checkout — and the way Google and your ad platforms see it. {opener ? '' : 'Here is what we found.'}
        </p>

        <div className="rpt-count">
          <div className="chip"><b>{total}</b> issues found</div>
          <div className="chip"><b>{visible.length}</b> open below</div>
          <div className="chip"><b>{locked.length}</b> unlocked on your call</div>
        </div>

        {visible.map((f, i) => {
          const e = effortMeta(f);
          return (
            <div className="rpt-finding" key={i}>
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

        <div className="rpt-lockedwrap">
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
                  <div className="rpt-blur" aria-hidden="true">
                    <div className="rpt-blur-line" />
                    <div className="rpt-blur-line" />
                    <div className="rpt-blur-line" />
                  </div>
                  <div className="rpt-locknote">🔓 Unlocked on your free walkthrough call</div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="rpt-cta">
          <h2>See all {total} findings — on your store, live</h2>
          <p>
            A free 20-minute call: we share the full report, walk through the top three
            issues on your actual store, and you leave knowing exactly what to fix first.
            No pitch decks. No obligation.
          </p>
          <a className="rpt-btn" href={bookUrl}>Book My Free Walkthrough →</a>
        </div>

        <footer>
          Prepared by Rachna Builds using an automated public review of {report.host} — no store
          access was used. Full technical detail is shared on the call and in your client portal.
        </footer>
      </div>
    </div>
  );
}
