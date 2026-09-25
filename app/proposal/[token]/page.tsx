// PUBLIC sales proposal, reached only via its unguessable token. Content is
// edited in the admin Proposal tab; views and plan choices land on the lead.
import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { sendPushToAll } from '@/lib/webpush';
import { money, parseContent, visitorContext } from '@/lib/proposal';
import { isPreviewBot, placeWithFlag } from '@/lib/flag';
import ChoosePlan from './ChoosePlan';
import ProposalPing from './ProposalPing';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Your Proposal | Rachna Builds',
  robots: { index: false, follow: false },
};

const WHATSAPP = '919404643510';

export default async function ProposalPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const proposal = await prisma.proposal.findUnique({
    where: { token },
    select: {
      id: true, title: true, content: true, reportToken: true, validUntil: true, acceptedTier: true,
      firstViewedAt: true, createdAt: true, leadId: true,
      lead: { select: { name: true, storeUrl: true } },
    },
  });
  if (!proposal) notFound();
  const c = parseContent(proposal.content);
  if (!c) notFound();

  const h = await headers();
  const v = visitorContext(h);
  const bot = isPreviewBot(h.get('user-agent'));
  const view = bot ? null : await prisma.proposalView.create({ data: { proposalId: proposal.id, ...v } }).catch(() => null);
  if (!bot) {
    await prisma.proposal.update({
      where: { id: proposal.id },
      data: { viewCount: { increment: 1 }, lastViewedAt: new Date(), ...(proposal.firstViewedAt ? {} : { firstViewedAt: new Date() }) },
    }).catch(() => {});
  }
  if (!bot && !proposal.firstViewedAt) {
    const where = placeWithFlag(v.city, v.country);
    sendPushToAll('📄 Proposal opened!', `${proposal.lead.name} is reading it now${where ? ` from ${where}` : ''}`, `/admin/funnel-leads/${proposal.leadId}`).catch(() => {});
  }

  const store = (proposal.lead.storeUrl || '').replace(/^https?:\/\/(www\.)?/, '').replace(/\/.*$/, '');
  const validLabel = proposal.validUntil
    ? proposal.validUntil.toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })
    : null;
  const expired = proposal.validUntil ? proposal.validUntil.getTime() < Date.now() : false;
  const [lead, ...others] = [...c.tiers].sort((a, b) => Number(!!b.recommended) - Number(!!a.recommended));
  const tierLabel = (t: { name: string; price: number; currency: string }) => `${t.name} (${money(t.price, t.currency)})`;
  const wa = `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(`Hi Rachna! I have a question about the proposal for ${store || proposal.lead.name}.`)}`;

  return (
    <div className="pp">
      {view && <ProposalPing token={token} viewId={view.id} />}
      <style>{`
        html, body { background:#F6F8F7 !important; }
        .pp { min-height:100vh; background:#F6F8F7; color:#1D2939; font-family:'Helvetica Neue', Arial, sans-serif; font-size:15px; line-height:1.65; }
        .pp-wrap { max-width:760px; margin:0 auto; padding:36px 20px 80px; }
        .pp-mast { display:flex; align-items:center; justify-content:space-between; gap:12px; padding-bottom:18px; border-bottom:3px solid #0B3D2E; flex-wrap:wrap; }
        .pp-brand { font-size:20px; font-weight:800; color:#0B3D2E; letter-spacing:-0.02em; }
        .pp-brand span { color:#06D6A0; }
        .pp-meta { font-size:12px; color:#667085; text-align:right; }
        .pp-meta b { color:#0B3D2E; }
        .pp-h1 { font-size:28px; line-height:1.2; color:#0B3D2E; letter-spacing:-0.02em; margin:28px 0 10px; font-weight:800; }
        .pp-intro { color:#475467; font-size:15px; margin:0; }
        .pp-h2 { font-size:19px; color:#0B3D2E; margin:36px 0 12px; font-weight:800; }
        .pp-recap { display:grid; grid-template-columns:repeat(auto-fit, minmax(200px, 1fr)); gap:10px; }
        .pp-recap div { background:#fff; border:1px solid #E4E7EC; border-radius:12px; padding:12px 14px; }
        .pp-recap small { display:block; font-size:11px; font-weight:800; letter-spacing:0.06em; text-transform:uppercase; color:#667085; }
        .pp-recap b { font-size:14px; color:#1D2939; font-weight:600; }
        .pp-prob { display:flex; gap:12px; background:#fff; border:1px solid #E4E7EC; border-radius:14px; padding:14px 16px; margin-bottom:10px; }
        .pp-num { background:#0B3D2E; color:#fff; font-weight:800; min-width:28px; height:28px; border-radius:8px; display:flex; align-items:center; justify-content:center; font-size:13px; flex-shrink:0; }
        .pp-prob h4 { margin:0 0 3px; font-size:15px; color:#0B3D2E; }
        .pp-prob p { margin:0; font-size:13.5px; color:#475467; }
        .pp-reportlink { display:inline-block; margin-top:6px; font-weight:700; color:#0B3D2E; font-size:14px; }
        .pp-tier { background:#fff; border:1px solid #E4E7EC; border-radius:18px; padding:22px; margin-bottom:14px; }
        .pp-tier.rec { border:2px solid #06D6A0; box-shadow:0 10px 30px rgba(11,61,46,0.10); }
        .pp-badge { display:inline-block; background:#06D6A0; color:#0B3D2E; font-size:11px; font-weight:800; letter-spacing:0.06em; text-transform:uppercase; padding:4px 11px; border-radius:99px; margin-bottom:10px; }
        .pp-tierhead { display:flex; justify-content:space-between; align-items:flex-end; gap:12px; flex-wrap:wrap; }
        .pp-tier h3 { margin:0; font-size:21px; color:#0B3D2E; }
        .pp-price { font-size:30px; font-weight:800; color:#0B3D2E; letter-spacing:-0.02em; }
        .pp-price small { font-size:13px; color:#667085; font-weight:600; margin-left:4px; }
        .pp-tagline { color:#475467; margin:4px 0 14px; font-size:14px; }
        .pp-items { list-style:none; padding:0; margin:0 0 14px; }
        .pp-items li { position:relative; padding:5px 0 5px 26px; font-size:14px; color:#344054; border-bottom:1px solid #F2F4F7; }
        .pp-items li:last-child { border-bottom:none; }
        .pp-items li::before { content:'✓'; position:absolute; left:2px; top:5px; color:#06D6A0; font-weight:800; }
        .pp-tier.small { padding:18px 20px; }
        .pp-tier.small h3 { font-size:17px; }
        .pp-tier.small .pp-price { font-size:22px; }
        .pp-missing { background:#FEF3F2; color:#B42318; border-radius:10px; padding:9px 12px; font-size:13px; margin:0 0 14px; }
        .pp-pay { font-size:12.5px; color:#667085; margin:0 0 14px; }
        .pp-btn { display:inline-block; width:100%; text-align:center; background:#0B3D2E; color:#fff; border:none; border-radius:12px; padding:14px 18px; font-size:15px; font-weight:800; cursor:pointer; text-decoration:none; font-family:inherit; }
        .pp-btn.secondary { background:#fff; color:#0B3D2E; border:1.5px solid #0B3D2E; }
        .pp-btn:disabled { opacity:.6; }
        .pp-chosen { background:#ECFDF3; border:1px solid #ABEFC6; color:#067647; border-radius:12px; padding:12px 14px; font-size:14px; }
        .pp-chosen a { color:#067647; font-weight:700; }
        .pp-why { background:#0B3D2E; color:#E7FBF4; border-radius:18px; padding:20px 22px; margin-top:26px; font-size:14.5px; }
        .pp-why b { color:#06D6A0; display:block; font-size:12px; letter-spacing:0.08em; text-transform:uppercase; margin-bottom:6px; }
        .pp-list { padding-left:20px; margin:0; color:#344054; font-size:14px; }
        .pp-list li { margin:5px 0; }
        .pp-foot { margin-top:40px; padding-top:18px; border-top:1px solid #E4E7EC; font-size:13px; color:#667085; }
        .pp-foot a { color:#0B3D2E; font-weight:700; }
        .pp-expired { background:#FFFAEB; border:1px solid #FEDF89; color:#B54708; border-radius:12px; padding:10px 14px; font-size:13.5px; margin-top:16px; }
        .pp-modal-bg { position:fixed; inset:0; background:rgba(16,24,40,.55); display:flex; align-items:center; justify-content:center; padding:16px; z-index:50; }
        .pp-modal { background:#fff; border-radius:18px; padding:22px; max-width:420px; width:100%; }
        .pp-modal h3 { margin:0 0 6px; color:#0B3D2E; font-size:19px; }
        .pp-modal p { margin:0 0 12px; color:#475467; font-size:14px; }
        .pp-modal textarea { width:100%; box-sizing:border-box; border:1px solid #D0D5DD; border-radius:10px; padding:10px 12px; font-size:16px; font-family:inherit; margin-bottom:12px; resize:vertical; }
        .pp-link { display:block; width:100%; background:none; border:none; color:#667085; font-size:14px; margin-top:10px; cursor:pointer; font-family:inherit; }
        .pp-err { color:#B42318 !important; }
        @media (max-width:520px) { .pp-h1 { font-size:24px; } .pp-price { font-size:26px; } }
      `}</style>

      <div className="pp-wrap">
        <div className="pp-mast">
          <div className="pp-brand">Rachna Builds<span>.</span></div>
          <div className="pp-meta">
            Proposal{store ? <> for <b>{store}</b></> : null}<br />
            {validLabel && <>Pricing held until <b>{validLabel}</b></>}
          </div>
        </div>

        <h1 className="pp-h1">{c.headline}</h1>
        <p className="pp-intro">{c.intro}</p>
        {expired && <div className="pp-expired">This pricing window has passed. Message us and we&apos;ll confirm whether we can still hold it.</div>}

        {c.recap.length > 0 && (
          <div data-track="recap">
            <h2 className="pp-h2">What we heard on our call</h2>
            <div className="pp-recap">
              {c.recap.map((r, i) => <div key={i}><small>{r.label}</small><b>{r.value}</b></div>)}
            </div>
          </div>
        )}

        {c.problems.length > 0 && (
          <div data-track="problems">
            <h2 className="pp-h2">What&apos;s holding the store back</h2>
            {c.problems.map((p, i) => (
              <div className="pp-prob" key={i}>
                <div className="pp-num">{i + 1}</div>
                <div><h4>{p.title}</h4><p>{p.body}</p></div>
              </div>
            ))}
            {proposal.reportToken && (
              <a className="pp-reportlink" href={`/report/${proposal.reportToken}`} data-click="report">See the full store report with screenshots →</a>
            )}
          </div>
        )}

        <h2 className="pp-h2">How we can work together</h2>
        {[lead, ...others].filter(Boolean).map((t) => (
          <div key={t.id} data-track={`plan_${t.id}`.replace(/[^a-z_]/g, '')} className={`pp-tier${t.recommended ? ' rec' : ' small'}`}>
            {t.recommended && <div className="pp-badge">Recommended</div>}
            <div className="pp-tierhead">
              <h3>{t.name}</h3>
              <div className="pp-price">{money(t.price, t.currency)}<small>· {t.duration}</small></div>
            </div>
            <p className="pp-tagline">{t.tagline}</p>
            <ul className="pp-items">{t.items.map((it, i) => <li key={i}>{it}</li>)}</ul>
            {t.missing && <p className="pp-missing">{t.missing}</p>}
            {t.payment && <p className="pp-pay">Payment: {t.payment}</p>}
            <ChoosePlan token={token} tierId={t.id} tierLabel={tierLabel(t)} primary={!!t.recommended} chosen={proposal.acceptedTier === t.id} waNumber={WHATSAPP} />
          </div>
        ))}

        {c.whyNow && <div className="pp-why" data-track="why_now"><b>Why now</b>{c.whyNow}</div>}

        {c.terms.length > 0 && (
          <div data-track="terms">
            <h2 className="pp-h2">What you can count on</h2>
            <ul className="pp-list">{c.terms.map((t, i) => <li key={i}>{t}</li>)}</ul>
          </div>
        )}

        {c.nextSteps.length > 0 && (
          <>
            <h2 className="pp-h2">Next steps</h2>
            <ol className="pp-list">{c.nextSteps.map((t, i) => <li key={i}>{t}</li>)}</ol>
          </>
        )}

        <div className="pp-foot">
          Questions? <a href={wa} data-click="whatsapp">Message Rachna on WhatsApp</a> · Rachna Builds, Shopify conversion specialists
        </div>
      </div>
    </div>
  );
}
