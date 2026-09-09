'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { newEventId, trackMetaEvent } from '@/lib/metaPixel';

const APPLY_URL = '/training/apply';

// Persist ad UTMs so the apply step attributes the lead to the right campaign
function captureUtms() {
  const p = new URLSearchParams(window.location.search);
  const utms = {
    utmSource: p.get('utm_source') || undefined,
    utmMedium: p.get('utm_medium') || undefined,
    utmCampaign: p.get('utm_campaign') || undefined,
    utmContent: p.get('utm_content') || undefined,
  };
  try {
    const existing = JSON.parse(sessionStorage.getItem('fn_utms') || '{}');
    const merged = { ...existing, ...Object.fromEntries(Object.entries(utms).filter(([, v]) => v)) };
    sessionStorage.setItem('fn_utms', JSON.stringify(merged));
  } catch {}
}

function Cta({ id, children = 'Get My Free Store Audit →' }: { id: string; children?: React.ReactNode }) {
  const onClick = () => {
    trackMetaEvent('ViewContent', newEventId(), { content_name: `Audit LP CTA: ${id}` });
  };
  return (
    <Link href={APPLY_URL} className="fn-btn daf-cta" onClick={onClick}>
      {children}
    </Link>
  );
}

// Same file the /training/watch page plays — replace the blob to update both.
const VSL_URL = 'https://qkuazelkfqffcp2x.public.blob.vercel-storage.com/vsl/rachna-builds-vsl.mp4';

const CALL_BULLETS = [
  ['Total clarity', 'The 3 biggest conversion leaks in your store — found live, on the call, with you watching.'],
  ['A real gameplan', 'A sustainable plan to fix them — design, trust and UX. No hacks, no gimmicks.'],
  ['Quick wins', 'Changes you can apply the same week, even if we never work together.'],
  ['Your 90-day pathway', 'The exact route from where you are now to a consistent 2%+ conversion rate.'],
] as const;

const WHY_US = [
  ['Founder-led, always', 'You work directly with Rachna. No account managers, no handoffs, no juniors learning on your store.'],
  ['Shopify only. Conversion first.', "We don't do everything for everyone — we design and build Shopify stores that sell. That's it."],
  ['Limited builds per month', 'We take on a small number of stores at a time so every one gets real attention.'],
  ["We stay after launch", "We're not a deliver-and-disappear agency. We stick around until you're seeing results."],
] as const;

const CASE_STUDIES = [
  {
    tag: 'CASE STUDY #1',
    title: 'A performance brand serving 40,000+ customers in 75+ countries',
    brand: 'Welevate · welevateclub.com',
    img: '/audit/welevate.jpg',
    body: 'Welevate sells breathing-performance products worldwide — rated 4.9★ by 40,000+ customers and featured in GQ, Men’s Health and Healthline. A store at that volume can’t afford friction: every section is built to move visitors from claim → proof → purchase without a wasted scroll.',
    chips: ['4.9★ · 40,000+ customers', 'Ships to 75+ countries', 'Featured in GQ & Men’s Health'],
  },
  {
    tag: 'CASE STUDY #2',
    title: 'A vegan beauty brand with 37,500+ happy customers',
    brand: 'LOVAYA · lovayacosmetics.com',
    img: '/audit/lovaya.jpg',
    body: 'LOVAYA competes in one of the hardest niches online — cosmetics. The storefront stacks the conversion levers that matter: a no-questions money-back guarantee front and center, bundles that raise order value, and press credibility from Vogue, Elle and Harper’s Bazaar.',
    chips: ['37,500+ customers', 'Vogue · Elle · Harper’s Bazaar', 'Guarantee-led selling'],
  },
  {
    tag: 'CASE STUDY #3',
    title: 'A UK skincare brand whose store finally matched the product',
    brand: 'Nuwa · hellonuwa.com',
    img: '/audit/nuwa.jpg',
    body: 'Kim came to us with a beautiful clean-skincare line living inside a storefront that didn’t sell it. We redesigned the site end-to-end and built her a merchant-controlled design system — so her team changes colors, sections and campaigns without ever calling a developer. Today: 4.9★ across 103 reviews, featured in Tatler and Marie Claire.',
    chips: ['Site-wide redesign', '4.9★ · 103 reviews', 'Tatler & Marie Claire'],
  },
  {
    tag: 'CASE STUDY #4',
    title: 'A wellness brand built to sell by mood, not category',
    brand: 'Sage & Veda · sageandveda.com',
    img: '/audit/sageandveda.jpg',
    body: 'Founded by three sisters, Sage & Veda sells ayurvedic oils organised around how you want to feel — Calm, Confident, Lifted. We built the store conversion-first: a 10-section product page where every scroll answers the shopper’s next doubt, backed by a 4.8★ rating and certification trust badges.',
    chips: ['4.8★ rated', '10-section PDP', 'Live in the US'],
  },
] as const;

const PORTFOLIO = [
  { img: '/audit/ohlittlewren.jpg', name: 'Oh, Little Wren', meta: 'Kids & family · US · 1,173 reviews' },
  { img: '/audit/vovia.jpg', name: 'VOVIA', meta: 'Luxury bags · Europe' },
  { img: '/audit/sinhali.jpg', name: 'Sinhali', meta: 'Handwoven couture · India' },
  { img: '/audit/motherlove.jpg', name: 'MotherLove Kitchen', meta: 'Clean baking mixes · US' },
  { img: '/audit/slfinest.jpg', name: 'SL Finest Food', meta: 'Wellness drinks · Malaysia' },
  { img: '/audit/labelina.jpg', name: 'Labelina', meta: 'Fashion label · India' },
];

export default function AuditLanding() {
  useEffect(() => {
    captureUtms();
  }, []);

  return (
    <>
      {/* ── Hero ── */}
      <div className="fn-hero daf-hero">
        <div className="fn-hero-inner fn-hero-inner-wide">
          <div className="fn-callout">For Shopify Brand Founders</div>
          <h1 className="fn-h1">
            Get Your Store to a <em>2%+ Conversion Rate</em>{' '}
            <br className="fn-h1-break" />
            — Without Spending More on Ads
          </h1>
          <p className="daf-hero-sub">
            Free 1:1 audit: we find exactly where your store leaks sales — and hand you the
            fix-list<span className="daf-sub-more">, whether we ever work together or not</span>.
          </p>
          <Cta id="hero" />
          <div className="daf-micro">30 minutes · 1-on-1 with Rachna · No obligation</div>
        </div>
      </div>

      {/* ── VSL + claim bullets (the playbook's [Image/B2B VSL] hero row) ── */}
      <section className="daf-section daf-vsl-section">
        <div className="daf-inner">
          <div className="daf-vslrow">
            <div className="daf-vsl">
              <video src={VSL_URL} controls playsInline preload="metadata" />
            </div>
            <div className="daf-claim">
              <h2 className="daf-h2 daf-claim-h">Claim Your Free 1:1 Store Audit</h2>
              <p className="daf-claim-sub">This isn&apos;t a sales call with an audit sprinkled on top. You leave with:</p>
              <ul className="daf-ticks">
                {CALL_BULLETS.map(([title, body]) => (
                  <li key={title}>
                    <span className="tick">✓</span>
                    <span><strong>{title}.</strong> {body}</span>
                  </li>
                ))}
              </ul>
              <Cta id="benefits" />
            </div>
          </div>
        </div>
      </section>

      {/* ── Proof strip ── */}
      <section className="daf-section daf-section-alt">
        <div className="daf-inner">
          <h2 className="daf-h2">Stores We&apos;ve Designed &amp; Built</h2>
          <p className="daf-lead">
            Brands across India, the US, UK, Europe and Southeast Asia trust us with the page their
            revenue depends on — including stores serving 40,000+ customers.
          </p>
          <div className="daf-proof">
            {PORTFOLIO.map((p) => (
              <figure key={p.name} className="daf-proof-shot">
                <img src={p.img} alt={`${p.name} — Shopify store designed by Rachna Builds`} loading="lazy" />
                <figcaption>
                  <strong>{p.name}</strong>
                  <span>{p.meta}</span>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* ── Case studies ── */}
      <section className="daf-section">
        <div className="daf-inner">
          {CASE_STUDIES.map((cs, i) => (
            <div key={cs.tag} className="daf-case-block">
              <article className={`daf-case${i % 2 ? ' daf-case-flip' : ''}`}>
                <div className="daf-case-media">
                  <img src={cs.img} alt={cs.brand} loading="lazy" />
                </div>
                <div className="daf-case-copy">
                  <div className="daf-case-tag">{cs.tag}</div>
                  <h3>{cs.title}</h3>
                  <div className="daf-case-brand">{cs.brand}</div>
                  <p>{cs.body}</p>
                  <div className="daf-chips">
                    {cs.chips.map((c) => <span key={c}>{c}</span>)}
                  </div>
                </div>
              </article>
              {i === 1 && (
                <div className="daf-midcta">
                  <h3>Want similar results?</h3>
                  <Cta id="mid-case-studies">Book My Free Audit Call →</Cta>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ── Why us ── */}
      <section className="daf-section daf-section-alt">
        <div className="daf-inner">
          <h2 className="daf-h2">Why Founders Pick Rachna Builds</h2>
          <div className="daf-grid">
            {WHY_US.map(([title, body]) => (
              <div key={title} className="daf-tile">
                <h3>{title}</h3>
                <p>{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Final CTA band ── */}
      <section className="daf-final">
        <div className="daf-inner">
          <h2 className="daf-h2">Ready to See What Your Store <em>Could</em> Be Converting?</h2>
          <p className="daf-lead">The audit is free. The leaks in your store aren&apos;t.</p>
          <Cta id="final" />
          <div className="daf-micro">30 minutes · On Zoom or WhatsApp · Bring your store, leave with a plan</div>
        </div>
      </section>

      {/* Sticky mobile CTA */}
      <div className="fn-sticky-cta">
        <Cta id="sticky" />
      </div>
    </>
  );
}
