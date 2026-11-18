// The FULL Store Health Report — every finding unlocked, speed, competitor
// benchmark, screenshot gallery, technical-PDF link. Rendered from the
// report's stored payload (findingsJson). Used by both the admin viewer and
// the gated client-portal page; falls back to nothing gracefully when a
// section's data wasn't gathered for that run.
//
// Visual system (18 Nov 2026 redesign): dark-forest hero that the summary card
// overlaps, sticky section nav, numbered section eyebrows, the shopper test as
// a vertical timeline with phone-framed screens, findings with a severity rail,
// a PROOF strip of screenshots under every step and finding, and a
// "how it hits a shopper" line per finding. Screenshots open full-size via
// <ShotLightbox /> (client component, mounted once by the page).
// Brand: ink #0B3D2E, emerald #06D6A0, Space Grotesk headings / Inter body
// (both loaded by app/layout.tsx).
import React from 'react';

interface Shot { label: string; dataUri: string; kind?: 'phone' | 'wide' | 'card' }
interface Finding {
  title?: string; merchant_copy?: string; effort?: string; severity?: string; fix_tier?: string;
  impact?: string | { assumption_note?: string; basis?: string }; outcome?: string;
  /** How the shopper experiences the problem — plain words, no jargon. */
  effect?: string;
  /** Where in the buying journey the leak is (First impression, Product page, Trust…). */
  stage?: string;
  shot?: Shot;
  /** One screenshot per claim in the copy, shown as a proof strip. */
  proofs?: Shot[];
}
interface SpeedPage { label: string; score: number; lcpMs: number }
interface SpeedWin { title: string; savingsMs: number }
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
  /** The merchant's own questions, answered from their store (shown first). */
  questions?: { q: string; a: string }[];
  /** The shopper test: one real buying journey on a phone, step by step, each
   *  step with the task we gave the "shopper", the screen they saw, what we
   *  observed and a verdict. Rendered before the findings when present. */
  walkthrough?: {
    intro?: string;
    device?: string;
    steps: { title: string; task: string; observed: string; verdict: 'pass' | 'friction' | 'blocker'; measure?: string; shot?: Shot; proofs?: Shot[] }[];
  } | null;
  /** What is already right on the store, credited before the problems. */
  working?: string[];
}

const VERDICT: Record<string, { label: string; bg: string; color: string; border: string }> = {
  pass: { label: 'Works', bg: '#D1FADF', color: '#067647', border: '#06D6A0' },
  friction: { label: 'Friction', bg: '#FEF0C7', color: '#B54708', border: '#F79009' },
  blocker: { label: 'Stops the sale', bg: '#FEE4E2', color: '#B42318', border: '#F04438' },
};

const SEVERITY_STYLE: Record<string, { bg: string; color: string; rail: string }> = {
  blocker: { bg: '#B42318', color: '#fff', rail: '#F04438' },
  high: { bg: '#DC6803', color: '#fff', rail: '#F79009' },
  medium: { bg: '#B54708', color: '#fff', rail: '#FDB022' },
  low: { bg: '#475467', color: '#fff', rail: '#CBD2DB' },
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
  if (score >= 90) return { word: 'Good', bg: '#D1FADF', color: '#067647', ring: '#12B76A' };
  if (score >= 50) return { word: 'Needs work', bg: '#FEF0C7', color: '#B54708', ring: '#F79009' };
  return { word: 'Slow', bg: '#FEE4E2', color: '#B42318', ring: '#F04438' };
}

function fmtS(ms: number | null) {
  return ms === null ? '—' : `${(ms / 1000).toFixed(1)}s`;
}

/** A screenshot in the frame that matches what it is: phone bezel, browser
 *  window for landscape captures, plain card for measurement evidence. */
function ShotFrame({ shot, size = 'md' }: { shot: Shot; size?: 'sm' | 'md' | 'lg' }) {
  const kind = shot.kind || 'phone';
  return (
    <figure className={`fr-shotf fr-shotf-${kind} fr-shotf-${size}`}>
      <div className="fr-shotf-frame">
        {kind === 'wide' && <div className="fr-shotf-bar"><i /><i /><i /></div>}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={shot.dataUri} alt={shot.label} loading="lazy" data-lightbox="1" />
      </div>
      <figcaption>{shot.label}</figcaption>
    </figure>
  );
}

/** The proof strip: one screenshot per claim, each labelled with what it proves. */
function Proofs({ shots, label = 'Proof' }: { shots?: Shot[]; label?: string }) {
  if (!shots?.length) return null;
  return (
    <div className="fr-proofs">
      <div className="fr-proofs-label">{label}<span>{shots.length} screenshot{shots.length > 1 ? 's' : ''} · tap to enlarge</span></div>
      <div className="fr-proofs-row">
        {shots.map((s, i) => <ShotFrame key={i} shot={s} size="sm" />)}
      </div>
    </div>
  );
}

function SectionHead({ n, title, sub, id }: { n: string; title: React.ReactNode; sub?: React.ReactNode; id: string }) {
  return (
    <div className="fr-sechead" id={id}>
      <div className="fr-eyebrow"><span className="fr-eyebrow-n">{n}</span><span className="fr-eyebrow-rule" /></div>
      <h2 className="fr-h2">{title}</h2>
      {sub && <p className="fr-h2sub">{sub}</p>}
    </div>
  );
}

export default function FullReport({
  payload, storeName, host, pdfUrl, hideEffort = false,
}: {
  payload: FullReportPayload;
  storeName: string;
  host: string;
  pdfUrl?: string | null;
  /** Sales copy for prospects: no effort/fix-type badges that read as "easy to DIY". */
  hideEffort?: boolean;
}) {
  const findings = payload.findings || [];
  const brand = payload.brand || {};
  const speed = payload.speed?.pages?.length ? payload.speed : null;
  const screenshots = payload.screenshots || [];
  const benchmark = (payload.benchmark || []).filter((b) => b.isClient || !b.error);
  const clientBench = payload.benchmark?.find((b) => b.isClient);
  const stats = payload.checkStats;
  const areas = payload.healthByArea || [];
  const steps = payload.walkthrough?.steps || [];
  const stepCounts = steps.reduce(
    (acc, s) => { acc[s.verdict] = (acc[s.verdict] || 0) + 1; return acc; },
    {} as Record<string, number>,
  );
  const proofCount = findings.reduce((n, f) => n + (f.shot ? 1 : 0) + (f.proofs?.length || 0), 0)
    + steps.reduce((n, s) => n + (s.shot ? 1 : 0) + (s.proofs?.length || 0), 0);

  // Section registry drives the numbered eyebrows and the sticky nav.
  const sections: { id: string; label: string; show: boolean }[] = [
    { id: 'questions', label: 'Your questions', show: !!payload.questions?.length },
    { id: 'shopper-test', label: 'Shopper test', show: steps.length > 0 },
    { id: 'working', label: 'What works', show: !!payload.working?.length },
    { id: 'findings', label: 'Findings', show: findings.length > 0 },
    { id: 'areas', label: 'Health by area', show: areas.length > 0 },
    { id: 'speed', label: 'Speed', show: !!speed },
    { id: 'competitors', label: 'Competitors', show: benchmark.length > 0 },
    { id: 'design', label: 'Design', show: !!payload.design?.notes?.length },
    { id: 'screens', label: 'Screens', show: screenshots.length > 0 },
    { id: 'developer', label: 'For your developer', show: !!pdfUrl },
  ].filter((s) => s.show);
  const num = (id: string) => String(sections.findIndex((s) => s.id === id) + 1).padStart(2, '0');

  return (
    <div className="fr-root">
      <style>{`
        html, body { background: #F6F8F7 !important; }
        html { scroll-behavior: smooth; }
        .fr-root { --ink:#0B3D2E; --ink-2:#0F4F3C; --mint:#06D6A0; --mint-soft:#E6FBF4; --paper:#F6F8F7; --card:#fff; --line:#E4E7EC; --text:#1D2939; --body:#344054; --muted:#667085; --heading:'Space Grotesk','Hanken Grotesk',-apple-system,sans-serif; --sans:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
          min-height:100vh; background:var(--paper); color:var(--text); font-family:var(--sans); font-size:15px; line-height:1.65; -webkit-font-smoothing:antialiased; }
        .fr-root h1, .fr-root h2, .fr-root h3, .fr-root h4 { font-family:var(--heading); text-wrap:balance; }
        .fr-root p { margin:0; }

        /* ── Hero ───────────────────────────────── */
        .fr-hero { background: radial-gradient(900px 420px at 85% -10%, rgba(6,214,160,0.28), transparent 60%), radial-gradient(600px 300px at 0% 110%, rgba(6,214,160,0.12), transparent 60%), linear-gradient(160deg, #0B3D2E 0%, #083226 100%); color:#fff; padding: 28px 0 120px; position:relative; overflow:hidden; }
        .fr-hero::after { content:''; position:absolute; inset:auto 0 0 0; height:1px; background:linear-gradient(90deg, transparent, rgba(6,214,160,0.6), transparent); }
        .fr-container { max-width: 920px; margin: 0 auto; padding-left: max(20px, env(safe-area-inset-left, 0px)); padding-right: max(20px, env(safe-area-inset-right, 0px)); }
        .fr-topbar { display:flex; align-items:center; justify-content:space-between; gap:16px; margin-bottom:44px; }
        .fr-clientlogo { background:#fff; border-radius:12px; padding:8px 14px; display:inline-flex; align-items:center; }
        .fr-clientlogo img { max-height:38px; max-width:160px; object-fit:contain; display:block; }
        .fr-storename { font-family:var(--heading); font-size:20px; font-weight:700; letter-spacing:-0.01em; }
        .fr-byline { display:flex; flex-direction:column; align-items:flex-end; gap:6px; font-size:11px; letter-spacing:0.08em; text-transform:uppercase; color:rgba(255,255,255,0.6); }
        .fr-byline img { height:18px; display:block; }
        .fr-kicker { display:inline-flex; align-items:center; gap:10px; font-size:11.5px; letter-spacing:0.14em; text-transform:uppercase; color:var(--mint); font-weight:600; margin-bottom:18px; }
        .fr-kicker::before { content:''; width:28px; height:2px; background:var(--mint); border-radius:2px; }
        .fr-h1 { font-size: clamp(30px, 5vw, 46px); line-height:1.08; letter-spacing:-0.03em; font-weight:700; margin:0 0 18px; max-width: 16ch; }
        .fr-h1 em { font-style:normal; color:var(--mint); }
        .fr-intro { color:rgba(255,255,255,0.72); font-size:16px; max-width:58ch; line-height:1.6; }
        .fr-intro b { color:#fff; font-weight:600; }
        .fr-method { display:flex; flex-wrap:wrap; gap:8px; margin-top:22px; }
        .fr-method span { font-size:12px; color:rgba(255,255,255,0.85); background:rgba(255,255,255,0.08); border:1px solid rgba(255,255,255,0.14); border-radius:99px; padding:6px 12px; }
        .fr-method span b { color:var(--mint); font-weight:700; }

        /* ── Summary card overlapping the hero ─── */
        .fr-summary { position:relative; z-index:2; margin:-84px auto 0; background:var(--card); border:1px solid var(--line); border-radius:20px; padding:26px 28px; box-shadow: 0 24px 60px -24px rgba(11,61,46,0.35), 0 2px 6px rgba(16,24,40,0.04); }
        .fr-summary-label { font-size:11px; letter-spacing:0.12em; text-transform:uppercase; color:var(--muted); font-weight:700; margin-bottom:10px; display:flex; align-items:center; gap:8px; }
        .fr-summary-label::before { content:''; width:8px; height:8px; border-radius:50%; background:var(--mint); }
        .fr-summary-text { font-size:16px; line-height:1.6; color:var(--text); font-weight:450; }
        .fr-stats { display:grid; grid-template-columns:repeat(4,1fr); gap:0; margin:22px -28px -26px; border-top:1px solid var(--line); border-radius:0 0 20px 20px; overflow:hidden; }
        .fr-stat { padding:16px 22px; border-right:1px solid var(--line); background:#FAFBFB; }
        .fr-stat:last-child { border-right:0; }
        .fr-stat b { display:block; font-family:var(--heading); font-size:30px; line-height:1; color:var(--ink); letter-spacing:-0.02em; margin-bottom:6px; font-variant-numeric:tabular-nums; }
        .fr-stat.bad b { color:#B42318; } .fr-stat.warn b { color:#B54708; } .fr-stat.good b { color:#067647; }
        .fr-stat span { font-size:12px; color:var(--muted); font-weight:500; }

        /* ── Sticky section nav ─────────────────── */
        .fr-nav { position:sticky; top:0; z-index:5; background:rgba(246,248,247,0.88); backdrop-filter:saturate(1.4) blur(10px); -webkit-backdrop-filter:saturate(1.4) blur(10px); border-bottom:1px solid var(--line); margin-top:28px; }
        .fr-nav-inner { display:flex; gap:6px; overflow-x:auto; scrollbar-width:none; padding-top:10px; padding-bottom:10px; }
        .fr-nav-inner::-webkit-scrollbar { display:none; }
        .fr-nav a { flex:0 0 auto; font-size:12.5px; font-weight:600; color:var(--body); text-decoration:none; padding:7px 13px; border-radius:99px; border:1px solid transparent; white-space:nowrap; transition: background .15s, border-color .15s, color .15s; }
        .fr-nav a:hover { background:#fff; border-color:var(--line); color:var(--ink); }
        .fr-nav a i { font-style:normal; color:var(--mint); font-weight:700; margin-right:6px; font-family:var(--heading); font-size:11px; }

        /* ── Sections ───────────────────────────── */
        .fr-main { padding-top:12px; padding-bottom:80px; }
        .fr-sechead { margin:56px 0 20px; scroll-margin-top:72px; }
        .fr-eyebrow { display:flex; align-items:center; gap:14px; margin-bottom:10px; }
        .fr-eyebrow-n { font-family:var(--heading); font-size:12px; font-weight:700; letter-spacing:0.12em; color:var(--mint); background:var(--ink); padding:4px 9px; border-radius:6px; }
        .fr-eyebrow-rule { flex:1; height:1px; background:linear-gradient(90deg, var(--line), transparent); }
        .fr-h2 { font-size: clamp(22px, 3vw, 27px); color:var(--ink); margin:0 0 6px; font-weight:700; letter-spacing:-0.02em; line-height:1.2; }
        .fr-h2sub { color:var(--muted); font-size:14px; margin:0; max-width:64ch; }

        .fr-card { background:var(--card); border:1px solid var(--line); border-radius:16px; padding:20px 22px; }
        .fr-body { font-size:14.5px; color:var(--body); margin:0; line-height:1.65; }

        /* Screens in frames */
        .fr-shotf { margin:0; min-width:0; }
        .fr-shotf figcaption { font-size:11.5px; color:var(--muted); margin-top:8px; text-align:center; line-height:1.4; }
        .fr-shotf img { width:100%; display:block; background:#fff; cursor:zoom-in; }
        .fr-shotf-phone .fr-shotf-frame { background:#0F1412; border-radius:26px; padding:8px; box-shadow:0 14px 34px -14px rgba(11,61,46,0.5), inset 0 0 0 1px rgba(255,255,255,0.06); }
        .fr-shotf-phone img { border-radius:19px; }
        .fr-shotf-wide .fr-shotf-frame { background:#0F1412; border-radius:12px; padding:0 0 4px; box-shadow:0 14px 34px -14px rgba(11,61,46,0.45); overflow:hidden; }
        .fr-shotf-bar { height:22px; display:flex; align-items:center; gap:6px; padding:0 12px; }
        .fr-shotf-bar i { width:8px; height:8px; border-radius:50%; background:rgba(255,255,255,0.25); }
        .fr-shotf-wide img { border-radius:0 0 8px 8px; }
        .fr-shotf-card .fr-shotf-frame { border:1px solid var(--line); border-radius:14px; overflow:hidden; box-shadow:0 10px 26px -16px rgba(11,61,46,0.35); }
        .fr-shotf-sm.fr-shotf-phone { width:150px; } .fr-shotf-sm.fr-shotf-phone .fr-shotf-frame { padding:5px; border-radius:18px; } .fr-shotf-sm.fr-shotf-phone img { border-radius:13px; }
        .fr-shotf-sm.fr-shotf-card { width:200px; }
        .fr-shotf-sm.fr-shotf-wide { width:300px; }
        .fr-shotf-md.fr-shotf-phone { width:100%; }
        .fr-shotf-md.fr-shotf-card { width:100%; }
        .fr-shotf-md.fr-shotf-wide { width:100%; }
        .fr-shotf-lg { width:100%; }

        /* Proof strip */
        .fr-proofs { margin-top:16px; padding-top:14px; border-top:1px dashed var(--line); }
        .fr-proofs-label { font-size:11px; letter-spacing:0.1em; text-transform:uppercase; color:var(--ink); font-weight:800; display:flex; align-items:center; gap:10px; margin-bottom:10px; }
        .fr-proofs-label::before { content:''; width:8px; height:8px; border-radius:2px; background:var(--mint); }
        .fr-proofs-label span { font-weight:500; letter-spacing:0; text-transform:none; color:var(--muted); font-size:11.5px; }
        .fr-proofs-row { display:flex; gap:16px; overflow-x:auto; padding-bottom:6px; align-items:flex-start; scrollbar-width:thin; }
        .fr-proofs-row .fr-shotf { flex:0 0 auto; }
        .fr-proofs-row figcaption { max-width:100%; }
        .fr-proofs-row .fr-shotf-sm.fr-shotf-phone figcaption { width:150px; }

        /* Questions */
        .fr-qa { background:var(--card); border:1px solid var(--line); border-radius:16px; padding:18px 20px; margin-bottom:12px; display:grid; grid-template-columns:28px 1fr; gap:14px; }
        .fr-qa-n { width:28px; height:28px; border-radius:8px; background:var(--ink); color:var(--mint); font-family:var(--heading); font-weight:700; font-size:12px; display:flex; align-items:center; justify-content:center; }
        .fr-qa h4 { margin:0 0 8px; font-size:16px; color:var(--ink); font-weight:700; line-height:1.35; }
        .fr-qa p { margin:0 0 6px; font-size:14px; color:var(--body); }
        .fr-qa p:last-child { margin-bottom:0; }

        /* Shopper test — timeline */
        .fr-tally { display:flex; flex-wrap:wrap; gap:8px; margin:0 0 22px; align-items:center; }
        .fr-tally-total { font-size:13px; color:var(--muted); margin-right:4px; }
        .fr-verdict { display:inline-flex; align-items:center; gap:6px; font-size:11px; font-weight:800; padding:5px 11px; border-radius:99px; text-transform:uppercase; letter-spacing:0.06em; white-space:nowrap; }
        .fr-verdict::before { content:''; width:7px; height:7px; border-radius:50%; background:currentColor; opacity:0.85; }
        .fr-timeline { position:relative; padding-left:0; }
        .fr-timeline::before { content:''; position:absolute; left:19px; top:24px; bottom:24px; width:2px; background:linear-gradient(180deg, var(--line), var(--line) 85%, transparent); }
        .fr-step { position:relative; display:grid; grid-template-columns:40px 270px minmax(0,1fr); gap:20px; align-items:start; margin-bottom:22px; }
        .fr-step.wide, .fr-step.noshot { grid-template-columns:40px minmax(0,1fr); }
        .fr-step-num { position:relative; z-index:1; width:40px; height:40px; border-radius:50%; background:#fff; border:2px solid var(--line); color:var(--ink); font-family:var(--heading); font-weight:700; font-size:14px; display:flex; align-items:center; justify-content:center; box-shadow:0 0 0 6px var(--paper); margin-top:6px; }
        .fr-step[data-verdict="pass"] .fr-step-num { border-color:#06D6A0; }
        .fr-step[data-verdict="friction"] .fr-step-num { border-color:#F79009; }
        .fr-step[data-verdict="blocker"] .fr-step-num { border-color:#F04438; background:#FFF5F4; }
        .fr-step-card { background:var(--card); border:1px solid var(--line); border-radius:16px; padding:18px 20px; min-width:0; box-shadow:0 1px 2px rgba(16,24,40,0.03); }
        .fr-step-card .fr-shotf-lg { margin-bottom:16px; }
        .fr-step-head { display:flex; align-items:center; gap:10px; flex-wrap:wrap; margin-bottom:10px; }
        .fr-step-head h4 { font-size:17px; color:var(--ink); margin:0; flex:1; min-width:160px; font-weight:700; line-height:1.3; }
        .fr-step-row { display:grid; grid-template-columns:92px 1fr; gap:10px; font-size:14.5px; color:var(--body); padding:8px 0; border-top:1px dashed var(--line); }
        .fr-step-row:first-of-type { border-top:0; padding-top:0; }
        .fr-step-row b { font-size:11px; letter-spacing:0.08em; text-transform:uppercase; color:var(--muted); font-weight:700; padding-top:3px; }
        .fr-step-measure { font-size:13px; color:var(--ink); background:var(--mint-soft); border:1px solid #BDF2E1; border-radius:10px; padding:10px 12px; margin:12px 0 0; font-variant-numeric:tabular-nums; display:flex; gap:8px; align-items:flex-start; }
        .fr-step-measure::before { content:'⌁'; color:#067647; font-weight:700; }

        /* Working */
        .fr-working { list-style:none; margin:0; padding:0; display:grid; grid-template-columns:1fr 1fr; gap:10px 18px; }
        .fr-working li { display:flex; gap:10px; font-size:14px; color:var(--body); line-height:1.55; }
        .fr-working li::before { content:'✓'; flex:0 0 22px; height:22px; border-radius:50%; background:#D1FADF; color:#067647; font-weight:800; font-size:12px; display:inline-flex; align-items:center; justify-content:center; margin-top:2px; }
        .fr-working li:first-child { grid-column:1 / -1; background:var(--mint-soft); border:1px solid #BDF2E1; border-radius:12px; padding:12px 14px; }

        /* Findings */
        .fr-finding { position:relative; display:grid; grid-template-columns:44px minmax(0,1fr); gap:16px; border:1px solid var(--line); background:var(--card); border-radius:16px; padding:20px 22px 20px 20px; margin-bottom:14px; overflow:hidden; }
        .fr-finding::before { content:''; position:absolute; left:0; top:0; bottom:0; width:4px; background:var(--rail, var(--line)); }
        .fr-rank { font-family:var(--heading); font-size:26px; font-weight:700; color:var(--ink); letter-spacing:-0.03em; line-height:1; padding-top:2px; font-variant-numeric:tabular-nums; }
        .fr-rank small { display:block; font-size:9.5px; letter-spacing:0.1em; text-transform:uppercase; color:var(--muted); margin-top:4px; font-family:var(--sans); font-weight:700; }
        .fr-fhead { display:flex; align-items:center; gap:8px; flex-wrap:wrap; margin-bottom:8px; }
        .fr-fhead h4 { font-size:17px; color:var(--ink); margin:0; flex:1 1 100%; font-weight:700; line-height:1.3; }
        .fr-stage { flex:1 1 100%; font-size:11px; font-weight:800; letter-spacing:0.1em; text-transform:uppercase; color:var(--mint); display:flex; align-items:center; gap:8px; margin-bottom:-2px; }
        .fr-stage::before { content:''; width:16px; height:2px; background:var(--mint); border-radius:2px; }
        .fr-sev { font-size:10px; font-weight:800; padding:4px 9px; border-radius:6px; text-transform:uppercase; letter-spacing:0.07em; }
        .fr-tag { font-size:11px; font-weight:600; padding:4px 9px; border-radius:6px; background:#F2F4F7; color:#475467; }
        .fr-effort { font-size:10.5px; font-weight:800; padding:4px 9px; border-radius:6px; white-space:nowrap; text-transform:uppercase; letter-spacing:0.05em; }
        .fr-effort.quick { background:#D1FADF; color:#067647; }
        .fr-effort.small { background:#FEF0C7; color:#B54708; }
        .fr-fgrid { display:grid; grid-template-columns:minmax(0,1fr) 250px; gap:20px; align-items:start; }
        .fr-fgrid.card, .fr-fgrid.wide, .fr-fgrid.noshot { grid-template-columns:minmax(0,1fr); }
        .fr-fgrid.card .fr-shotf, .fr-fgrid.wide .fr-shotf { margin-top:14px; }
        .fr-effect { margin:14px 0 0; padding:12px 14px; background:#FFF8EB; border:1px solid #FEDF89; border-radius:10px; font-size:14px; color:#7A4A05; }
        .fr-effect b { display:block; font-size:10.5px; text-transform:uppercase; letter-spacing:0.08em; color:#B54708; margin-bottom:4px; }
        .fr-outcome { margin:12px 0 0; padding:12px 14px; background:var(--mint-soft); border:1px solid #BDF2E1; border-radius:10px; font-size:14px; color:var(--ink); }
        .fr-outcome b { display:block; font-size:10.5px; text-transform:uppercase; letter-spacing:0.08em; color:#067647; margin-bottom:4px; }
        .fr-impact { font-size:12.5px; color:var(--muted); margin:10px 0 0; padding-left:12px; border-left:2px solid var(--line); }

        /* Tables */
        .fr-tablewrap { background:var(--card); border:1px solid var(--line); border-radius:16px; overflow:hidden; }
        .fr-table { width:100%; border-collapse:collapse; font-size:13.5px; }
        .fr-table th { text-align:left; font-size:11px; letter-spacing:0.08em; text-transform:uppercase; color:var(--muted); padding:12px 16px; background:#FAFBFB; border-bottom:1px solid var(--line); font-weight:700; }
        .fr-table td { padding:12px 16px; border-bottom:1px solid #F2F4F7; font-variant-numeric:tabular-nums; }
        .fr-table tbody tr:last-child td { border-bottom:0; }
        .fr-table tr.client td { background:var(--mint-soft); font-weight:700; color:var(--ink); }
        .fr-table tr.client td:first-child { box-shadow: inset 3px 0 0 var(--mint); }
        .fr-pill { display:inline-block; font-size:11px; font-weight:800; padding:3px 9px; border-radius:99px; text-transform:uppercase; letter-spacing:0.05em; }
        .fr-bar { height:6px; border-radius:99px; background:#EEF1F0; overflow:hidden; min-width:80px; }
        .fr-bar i { display:block; height:100%; border-radius:99px; }

        /* Speed */
        .fr-speedgrid { display:grid; grid-template-columns:repeat(auto-fit, minmax(150px, 1fr)); gap:12px; }
        .fr-speed { background:var(--card); border:1px solid var(--line); border-radius:16px; padding:16px; display:flex; gap:14px; align-items:center; }
        .fr-ring { --p:0; --c:#06D6A0; width:56px; height:56px; border-radius:50%; flex:0 0 56px; background: conic-gradient(var(--c) calc(var(--p) * 1%), #EEF1F0 0); display:grid; place-items:center; }
        .fr-ring b { width:42px; height:42px; border-radius:50%; background:#fff; display:grid; place-items:center; font-family:var(--heading); font-size:15px; color:var(--ink); font-weight:700; }
        .fr-speed-label { font-size:13px; font-weight:600; color:var(--ink); line-height:1.3; }
        .fr-speed-word { font-size:11.5px; font-weight:700; margin-top:3px; }
        .fr-speed-lcp { font-size:11.5px; color:var(--muted); margin-top:2px; }
        .fr-wins { margin:14px 0 0; font-size:13.5px; color:var(--body); }

        /* Galleries */
        .fr-shots { display:grid; grid-template-columns:repeat(auto-fill,minmax(200px,1fr)); gap:20px; }
        .fr-shots .fr-shotf-wide { grid-column:1 / -1; }
        .fr-design-note { display:grid; grid-template-columns:36px 1fr; gap:14px; background:var(--card); border:1px solid var(--line); border-radius:16px; padding:18px 20px; margin-bottom:12px; }
        .fr-design-ic { width:36px; height:36px; border-radius:10px; background:var(--ink); color:var(--mint); display:grid; place-items:center; font-size:15px; }
        .fr-design-note h4 { margin:0 0 6px; font-size:15.5px; color:var(--ink); font-weight:700; }

        /* Lightbox (mounted by ShotLightbox) */
        .fr-lb { position:fixed; inset:0; z-index:50; background:rgba(8,20,16,0.88); display:flex; flex-direction:column; align-items:center; justify-content:center; padding:24px; cursor:zoom-out; }
        .fr-lb img { max-width:min(96vw, 1100px); max-height:84vh; width:auto; height:auto; border-radius:14px; box-shadow:0 30px 80px rgba(0,0,0,0.5); cursor:default; background:#fff; }
        .fr-lb-cap { color:#fff; font-size:13px; margin-top:14px; text-align:center; max-width:70ch; }
        .fr-lb-close { position:absolute; top:14px; right:18px; background:rgba(255,255,255,0.1); color:#fff; border:0; width:40px; height:40px; border-radius:50%; font-size:26px; line-height:1; cursor:pointer; }

        /* Developer / closer / footer */
        .fr-pdf { display:inline-flex; align-items:center; gap:10px; background:var(--ink); color:#fff; font-weight:700; font-size:14px; padding:13px 22px; border-radius:12px; text-decoration:none; font-family:var(--heading); letter-spacing:-0.01em; transition:transform .15s, box-shadow .15s; box-shadow:0 10px 24px -12px rgba(11,61,46,0.6); }
        .fr-pdf:hover { transform:translateY(-1px); }
        .fr-pdf i { font-style:normal; color:var(--mint); }
        .fr-closer { position:relative; overflow:hidden; background: radial-gradient(500px 220px at 100% 0%, rgba(6,214,160,0.25), transparent 60%), var(--ink); color:#fff; border-radius:20px; padding:30px 32px; margin-top:64px; }
        .fr-closer h2 { font-size:22px; margin:0 0 10px; letter-spacing:-0.02em; font-weight:700; }
        .fr-closer h2 em { font-style:normal; color:var(--mint); }
        .fr-closer p { font-size:15px; color:rgba(255,255,255,0.8); margin:0; max-width:62ch; }
        .fr-footer { margin-top:28px; font-size:12px; color:var(--muted); line-height:1.6; display:flex; gap:16px; align-items:flex-start; }
        .fr-footer img { height:16px; opacity:0.75; flex:0 0 auto; margin-top:2px; }
        @media print { .fr-nav, .fr-pdf { display:none; } .fr-hero { -webkit-print-color-adjust:exact; print-color-adjust:exact; } }

        /* ── Mobile ─────────────────────────────── */
        @media (max-width: 720px) {
          .fr-hero { padding: 20px 0 96px; }
          .fr-topbar { margin-bottom:28px; align-items:flex-start; }
          .fr-byline { font-size:9.5px; }
          .fr-byline img { height:14px; }
          .fr-clientlogo img { max-height:30px; max-width:120px; }
          .fr-summary { margin-top:-70px; padding:20px 18px; }
          .fr-summary-text { font-size:15px; }
          .fr-stats { grid-template-columns:repeat(2,1fr); margin:18px -18px -20px; }
          .fr-stat { padding:14px 16px; }
          .fr-stat:nth-child(2) { border-right:0; } .fr-stat:nth-child(-n+2) { border-bottom:1px solid var(--line); }
          .fr-stat b { font-size:26px; }
          .fr-sechead { margin:44px 0 16px; }
          .fr-timeline::before { left:15px; }
          .fr-step, .fr-step.wide, .fr-step.noshot { grid-template-columns:32px minmax(0,1fr); gap:12px; }
          .fr-step-num { width:32px; height:32px; font-size:12.5px; }
          .fr-step > .fr-shotf { grid-column:2; max-width:250px; justify-self:center; }
          .fr-step-row { grid-template-columns:1fr; gap:3px; }
          .fr-working { grid-template-columns:1fr; }
          .fr-finding { grid-template-columns:36px minmax(0,1fr); gap:12px; padding:16px 16px 16px 18px; }
          .fr-fgrid { grid-template-columns:minmax(0,1fr); }
          .fr-fgrid > .fr-shotf-phone { max-width:250px; margin:14px auto 0; }
          .fr-rank { font-size:22px; }
          .fr-table th, .fr-table td { padding:10px 10px; font-size:12.5px; }
          .fr-shots { grid-template-columns:repeat(2,1fr); gap:12px; }
          .fr-closer { padding:24px 20px; }
          .fr-lb { padding:12px; } .fr-lb img { max-height:80vh; }
        }
      `}</style>

      {/* ── Hero ─────────────────────────────────────────────── */}
      <header className="fr-hero">
        <div className="fr-container">
          <div className="fr-topbar">
            {brand.logoUrl ? (
              <div className="fr-clientlogo">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={brand.logoUrl} alt={storeName} />
              </div>
            ) : (
              <div className="fr-storename">{storeName}</div>
            )}
            <div className="fr-byline">
              <span>Prepared by</span>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/branding/rachna-builds-wordmark-on-dark.svg" alt="Rachna Builds" />
            </div>
          </div>
          <div className="fr-kicker">Store Health Report · Full</div>
          <h1 className="fr-h1">What&apos;s quietly costing <em>{storeName}</em> sales</h1>
          <p className="fr-intro">
            We went through <b>{host}</b> the way a real shopper does — on a phone, from first visit to
            checkout — and the way Google and your ad platforms see it. Every finding below names
            your actual products and pages, and every claim comes with the screenshot that shows it.
          </p>
          {(proofCount > 0 || stats) && (
            <div className="fr-method">
              {proofCount > 0 && <span><b>{proofCount}</b> screenshots as proof</span>}
              {steps.length > 0 && <span><b>{steps.length}</b>-step shopper test on a real phone</span>}
              {stats && <span><b>{stats.run}</b> automated checks</span>}
              <span>Every finding <b>re-tested</b> before publishing</span>
            </div>
          )}
        </div>
      </header>

      <div className="fr-container">
        {(payload.opener || stats) && (
          <section className="fr-summary">
            {payload.opener && (
              <>
                <div className="fr-summary-label">The short version</div>
                <p className="fr-summary-text">{payload.opener}</p>
              </>
            )}
            {stats && (
              <div className="fr-stats" style={payload.opener ? undefined : { margin: '-26px -28px', borderTop: 0 }}>
                <div className="fr-stat"><b>{stats.run}</b><span>automated checks run</span></div>
                <div className="fr-stat bad"><b>{stats.failures}</b><span>failures found</span></div>
                <div className="fr-stat warn"><b>{stats.warnings}</b><span>warnings</span></div>
                <div className="fr-stat good"><b>{stats.passing}</b><span>passing</span></div>
              </div>
            )}
          </section>
        )}
      </div>

      {sections.length > 1 && (
        <nav className="fr-nav" aria-label="Report sections">
          <div className="fr-container fr-nav-inner">
            {sections.map((s, i) => (
              <a key={s.id} href={`#${s.id}`}><i>{String(i + 1).padStart(2, '0')}</i>{s.label}</a>
            ))}
          </div>
        </nav>
      )}

      <main className="fr-container fr-main">
        {payload.questions?.length ? (
          <div data-track="questions">
            <SectionHead id="questions" n={num('questions')} title="Your questions, answered" sub="Checked on a phone, on your live store, with examples from your own pages." />
            {payload.questions.map((x, i) => (
              <div className="fr-qa" key={i}>
                <span className="fr-qa-n">{i + 1}</span>
                <div>
                  <h4>{x.q}</h4>
                  {x.a.split('\n').filter(Boolean).map((para, j) => <p key={j}>{para}</p>)}
                </div>
              </div>
            ))}
          </div>
        ) : null}

        {steps.length > 0 && payload.walkthrough ? (
          <div data-track="walkthrough">
            <SectionHead
              id="shopper-test"
              n={num('shopper-test')}
              title="The shopper test — one real buying journey, step by step"
              sub={<>{payload.walkthrough.intro || 'We gave a shopper one job: buy your bestseller on a phone. Each step shows the screen they saw, what we asked them to do, and what happened.'}{payload.walkthrough.device ? ` Device: ${payload.walkthrough.device}.` : ''}</>}
            />
            <div className="fr-tally">
              <span className="fr-tally-total">{steps.length} steps:</span>
              {(['pass', 'friction', 'blocker'] as const).map((v) => (
                <span key={v} className="fr-verdict" style={{ background: VERDICT[v].bg, color: VERDICT[v].color }}>
                  {stepCounts[v] || 0} {VERDICT[v].label}
                </span>
              ))}
            </div>
            <div className="fr-timeline">
              {steps.map((s, i) => {
                const v = VERDICT[s.verdict] || VERDICT.friction;
                const kind = s.shot?.kind || 'phone';
                const inline = !!s.shot?.dataUri && kind !== 'phone';
                const cls = !s.shot?.dataUri ? ' noshot' : inline ? ' wide' : '';
                return (
                  <div className={`fr-step${cls}`} key={i} data-verdict={s.verdict}>
                    <span className="fr-step-num">{i + 1}</span>
                    {s.shot?.dataUri && !inline && <ShotFrame shot={s.shot} size="md" />}
                    <div className="fr-step-card">
                      {s.shot?.dataUri && inline && <ShotFrame shot={s.shot} size="lg" />}
                      <div className="fr-step-head">
                        <h4>{s.title}</h4>
                        <span className="fr-verdict" style={{ background: v.bg, color: v.color }}>{v.label}</span>
                      </div>
                      <div className="fr-step-row"><b>The task</b><span>{s.task}</span></div>
                      <div className="fr-step-row"><b>What happened</b><span>{s.observed}</span></div>
                      {s.measure && <p className="fr-step-measure"><span>{s.measure}</span></p>}
                      <Proofs shots={s.proofs} label="More proof" />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}

        {payload.working?.length ? (
          <div data-track="working">
            <SectionHead id="working" n={num('working')} title="What's already working" sub="Credit where it's due — these are right, and we checked them rather than assumed." />
            <div className="fr-card">
              <ul className="fr-working">
                {payload.working.map((w, i) => <li key={i}><span>{w}</span></li>)}
              </ul>
            </div>
          </div>
        ) : null}

        {findings.length > 0 && (
          <div data-track="findings">
            <SectionHead id="findings" n={num('findings')} title={`Where the sales leak — ${findings.length} findings, ranked by impact`} sub="Each one names the moment in the buying journey where a shopper is lost, shows the proof, says how it hits them, and what changes when it's fixed. Top of the list = fix first." />
            {findings.map((f, i) => {
              const e = effortOf(f);
              const sv = f.severity ? (SEVERITY_STYLE[f.severity.toLowerCase()] || SEVERITY_STYLE.low) : null;
              const impactText = typeof f.impact === 'string' ? f.impact : f.impact?.assumption_note;
              const kind = f.shot?.kind || 'phone';
              const gridCls = !f.shot?.dataUri ? 'noshot' : kind;
              return (
                <div className="fr-finding" key={i} style={{ ['--rail' as string]: sv?.rail || '#E4E7EC' }}>
                  <div className="fr-rank">{String(i + 1).padStart(2, '0')}<small>rank</small></div>
                  <div style={{ minWidth: 0 }}>
                    <div className="fr-fhead">
                      {f.stage && <span className="fr-stage">{f.stage}</span>}
                      <h4>{f.title}</h4>
                      {sv && f.severity && <span className="fr-sev" style={{ background: sv.bg, color: sv.color }}>{f.severity}</span>}
                      {!hideEffort && f.fix_tier && <span className="fr-tag">{FIX_TIER[f.fix_tier.toLowerCase()] || f.fix_tier}</span>}
                      {!hideEffort && <span className={`fr-effort ${e.cls}`}>{e.label}</span>}
                    </div>
                    <div className={`fr-fgrid ${gridCls}`}>
                      <div style={{ minWidth: 0 }}>
                        <p className="fr-body">{f.merchant_copy}</p>
                        {f.effect && <div className="fr-effect"><b>How it hits a shopper</b>{f.effect}</div>}
                        {f.outcome && <div className="fr-outcome"><b>What changes when it&apos;s fixed</b>{f.outcome}</div>}
                        {impactText && <p className="fr-impact">{impactText}</p>}
                      </div>
                      {f.shot?.dataUri && <ShotFrame shot={f.shot} size="md" />}
                    </div>
                    <Proofs shots={f.proofs} />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {areas.length > 0 && (
          <div data-track="areas">
            <SectionHead id="areas" n={num('areas')} title="Health by area" sub="Every corner of the store we checked, at a glance." />
            <div className="fr-tablewrap" style={{ overflowX: 'auto' }}>
              <table className="fr-table">
                <thead><tr><th>Area</th><th>Verdict</th><th>Passing</th><th>Failures</th><th>Warnings</th><th>Checks</th></tr></thead>
                <tbody>
                  {areas.map((a, i) => {
                    const good = a.verdict === 'Good'; const fair = a.verdict === 'Fair';
                    const color = good ? '#067647' : fair ? '#B54708' : '#B42318';
                    const bg = good ? '#D1FADF' : fair ? '#FEF0C7' : '#FEE4E2';
                    const okPct = a.total ? Math.max(0, Math.round(((a.total - a.fail - a.warn) / a.total) * 100)) : 0;
                    return (
                      <tr key={i}>
                        <td style={{ fontWeight: 600, color: 'var(--ink)' }}>{a.area}</td>
                        <td><span className="fr-pill" style={{ background: bg, color }}>{a.verdict}</span></td>
                        <td><div className="fr-bar" title={`${okPct}% of checks passing`}><i style={{ width: `${okPct}%`, background: color }} /></div></td>
                        <td>{a.fail}</td>
                        <td>{a.warn}</td>
                        <td>{a.total}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {speed && (
          <div data-track="speed">
            <SectionHead id="speed" n={num('speed')} title="Speed — measured with Google's own engine" sub="On a typical phone, the same test Google ranks you by. 90+ is good." />
            <div className="fr-speedgrid">
              {speed.pages.map((p, i) => {
                const m = scoreMeta(p.score);
                return (
                  <div className="fr-speed" key={i}>
                    <div className="fr-ring" style={{ ['--p' as string]: p.score, ['--c' as string]: m.ring }}><b>{p.score}</b></div>
                    <div style={{ minWidth: 0 }}>
                      <div className="fr-speed-label">{p.label}</div>
                      <div className="fr-speed-word" style={{ color: m.color }}>{m.word}</div>
                      {p.lcpMs > 0 && <div className="fr-speed-lcp">Loads in {fmtS(p.lcpMs)}</div>}
                    </div>
                  </div>
                );
              })}
            </div>
            {speed.wins.length > 0 && (
              <div className="fr-card" style={{ marginTop: 12 }}>
                <p className="fr-wins" style={{ margin: 0 }}>
                  <b>Biggest speed wins:</b>{' '}
                  {speed.wins.map((w) => `${w.title} (saves ~${(w.savingsMs / 1000).toFixed(1)}s)`).join(' · ')}
                </p>
              </div>
            )}
          </div>
        )}

        {benchmark.length > 0 && (
          <div data-track="competitors">
            <SectionHead
              id="competitors"
              n={num('competitors')}
              title="You vs. your competitors — real shopper data"
              sub="Google's Chrome UX Report: what actual visitors experienced on each store over the last 28 days (mobile). Lower is faster."
            />
            <div className="fr-tablewrap" style={{ overflowX: 'auto' }}>
              <table className="fr-table">
                <thead>
                  <tr><th>Store</th><th>Load (LCP)</th><th>Responsiveness (INP)</th><th>Stability (CLS)</th><th>Fast loads</th></tr>
                </thead>
                <tbody>
                  {benchmark.map((b, i) => (
                    <tr key={i} className={b.isClient ? 'client' : undefined}>
                      <td>{b.host}{b.isClient ? ' (you)' : ''}</td>
                      {b.error ? (
                        <td colSpan={4} style={{ color: 'var(--muted)', fontSize: 12.5, fontWeight: 400 }}>
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
              <p style={{ fontSize: 13.5, color: 'var(--body)', marginTop: 12 }}>
                The upside: none of these competitors is truly fast on mobile — speed is an open
                advantage in your category, and it&apos;s buildable.
              </p>
            )}
          </div>
        )}

        {payload.design?.notes?.length ? (
          <div data-track="design">
            <SectionHead id="design" n={num('design')} title="Design review — how the store reads to a shopper" sub="Beyond the automated checks: an expert pass over the store's first impression, hierarchy, and trust signals." />
            {(payload.design.shots || []).length > 0 && (
              <div className="fr-shots" style={{ marginBottom: 18 }}>
                {payload.design.shots.map((s, i) => <ShotFrame key={i} shot={s} size="md" />)}
              </div>
            )}
            {payload.design.notes.map((n, i) => (
              <div className="fr-design-note" key={i}>
                <span className="fr-design-ic">✎</span>
                <div style={{ minWidth: 0 }}>
                  <h4>{n.title}</h4>
                  <p className="fr-body">{n.note}</p>
                </div>
              </div>
            ))}
          </div>
        ) : null}

        {screenshots.length > 0 && (
          <div data-track="screens">
            <SectionHead id="screens" n={num('screens')} title="What we saw on your store" sub="Captured during the audit — including the cart and checkout walk a real buyer takes." />
            <div className="fr-shots">
              {screenshots.map((s, i) => <ShotFrame key={i} shot={{ ...s, kind: s.kind || 'card' }} size="md" />)}
            </div>
          </div>
        )}

        {pdfUrl && (
          <div data-track="developer">
            <SectionHead id="developer" n={num('developer')} title="For your developer" sub="The complete technical report — every check, with evidence." />
            <a className="fr-pdf" href={pdfUrl}>Download Technical Report (PDF) <i>↓</i></a>
          </div>
        )}

        <section className="fr-closer">
          <h2>The honest bottom line<em>.</em></h2>
          <p>
            None of this is unusual — most stores accumulate these issues as they grow. What matters
            is that every item above has a known fix, most are days not months, and each one is
            measurable: we re-test after every change so you see the before and after on your own
            store, not promises.
          </p>
        </section>

        <footer className="fr-footer">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/branding/rachna-builds-wordmark.svg" alt="Rachna Builds" />
          <span>
            Prepared by Rachna Builds using an automated public review of {host} — no store access
            was used. Impact statements reference industry benchmarks; we never estimate your
            private revenue.
          </span>
        </footer>
      </main>
    </div>
  );
}
