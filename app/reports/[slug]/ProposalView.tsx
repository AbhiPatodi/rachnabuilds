'use client';

import { useState } from 'react';

// ── Types ────────────────────────────────────────────────────────────────────

interface DeliverableGroup {
  heading: string;
  items: string[];
}

interface Option {
  badge: string;
  recommended?: boolean;
  tagline: string;
  oneTimePrice: string;
  oneTimeLabel: string;
  deliverables: DeliverableGroup[];
  retainerPrice: string;
  retainerItems: string[];
  timeline: string;
}

// ── Content ──────────────────────────────────────────────────────────────────

const OPTION_A: Option = {
  badge: 'OPTIMISE CURRENT THEME',
  tagline: 'Fix, optimise and grow — within your existing Shopify theme',
  oneTimePrice: '₹45,000',
  oneTimeLabel: 'One-time fixed fee',
  deliverables: [
    {
      heading: 'Performance',
      items: [
        'Replace all 4 SVG banners with WebP (homepage 32MB → ~2MB)',
        'Fix Klaviyo duplicate loading (8 scripts → 1)',
        'Fix GTM + Google Ads duplicate tags',
        'Fix Mulish font loading (add preload hints)',
        'Enable lazy loading on all product images',
        'Fix broken lazy-load on PDP recommended products',
      ],
    },
    {
      heading: 'SEO',
      items: [
        'Add H1 tags to every page (currently zero)',
        'Fix heading hierarchy site-wide (H4 → correct H2/H3)',
        'Rewrite meta titles — keyword-optimised, no domain prefix',
        'Expand meta descriptions (26 chars → 150+ chars with keywords)',
        'Add Product + Organization + BreadcrumbList JSON-LD schema',
        'Add breadcrumb navigation on all PDP + collection pages',
        'Fix 27 images missing alt text',
        'Add hreflang tags',
      ],
    },
    {
      heading: 'CRO & Conversion',
      items: [
        'Sticky Add-to-Cart button on PDP',
        'Fix "PLEASE CHOOSE" default variant blocking ATC',
        'Surface Judge.me star ratings on all collection cards',
        'Add free shipping progress bar to cart page',
        'Add trust badges + express checkout to cart (Shop Pay / Apple Pay)',
        'Add free shipping callout + shipping/returns info near ATC',
        'Add skip navigation link (accessibility)',
        'Promote announcement bar offer near ATC',
      ],
    },
    {
      heading: 'Footer & UX Polish',
      items: [
        'Remove "Design Themes" footer credit link',
        'Fix duplicated "Contact Us" in Quick Links',
        'Add TikTok social link',
      ],
    },
  ],
  retainerPrice: '₹22,000',
  retainerItems: [
    'Monthly performance + SEO audit report',
    'A/B test — 2 CRO experiments per month',
    'SEO content: 2 optimised blog/collection posts',
    'Schema + meta updates as products/collections change',
    'Bug fixes + minor theme updates (up to 4 hours)',
    'Monthly analytics review call (30 min)',
  ],
  timeline: '3–4 weeks',
};

const OPTION_B: Option = {
  badge: 'CUSTOM THEME BUILD',
  recommended: true,
  tagline: 'A brand new Shopify store built around your vision',
  oneTimePrice: '₹95,000',
  oneTimeLabel: 'One-time fixed fee',
  deliverables: [
    {
      heading: 'Everything in Option A, plus:',
      items: [
        'Custom Shopify theme built from scratch — your Canva mockup as the blueprint',
        'Dark editorial aesthetic: deep background + warm off-white + Times serif',
        'Mood-led homepage navigation (face / hair / home / rituals / about)',
        'Storytelling-first homepage — editorial sections per product category',
        'Custom PDP template — sticky ATC, cross-sell kit, social proof, accordions',
        'Custom collection page — editorial cards with inline star ratings',
        'Custom cart drawer — free shipping bar, trust badges, gift note, express checkout',
        'Mobile-first fully responsive — pixel-perfect on all breakpoints',
      ],
    },
    {
      heading: 'Performance Target',
      items: [
        'LCP under 2 seconds (vs current 4.8s DOM load)',
        'Homepage under 2MB (vs current 32MB)',
        'Under 20 JS files (vs current 64–67)',
        'PageSpeed score 90+ on mobile',
      ],
    },
    {
      heading: 'SEO Foundation',
      items: [
        'Full semantic HTML structure baked into theme',
        'Structured data (Product, Organization, BreadcrumbList, FAQ) built in',
        'Optimised heading hierarchy H1→H2→H3 enforced by theme',
        'Native lazy loading on all media',
        'Clean URL + meta architecture',
      ],
    },
  ],
  retainerPrice: '₹35,000',
  retainerItems: [
    'Everything in Option A retainer',
    'Ongoing theme development (new sections, landing pages, campaign pages)',
    'Monthly heatmap + session recording review (Clarity)',
    'Priority support — 24-hour response SLA',
    'Quarterly UX review + redesign recommendations',
    'Up to 8 hours of custom development per month',
  ],
  timeline: '6–8 weeks',
};

// ── Comparison table ─────────────────────────────────────────────────────────

interface CompRow {
  feature: string;
  competitor: string | boolean;
  optionA: string | boolean;
  optionB: string | boolean;
}

const COMPARISON: CompRow[] = [
  { feature: 'Performance fix (SVG → WebP)',       competitor: false,     optionA: true,           optionB: true },
  { feature: 'Klaviyo / GTM deduplication',        competitor: false,     optionA: true,           optionB: true },
  { feature: 'H1 + heading hierarchy fix',         competitor: '❓',      optionA: true,           optionB: true },
  { feature: 'Meta titles + descriptions',         competitor: 'Basic',   optionA: 'Full rewrite', optionB: 'Full rewrite' },
  { feature: 'JSON-LD schema (Product + Org)',      competitor: false,     optionA: true,           optionB: true },
  { feature: 'Breadcrumbs sitewide',               competitor: false,     optionA: true,           optionB: true },
  { feature: 'Image alt text audit',               competitor: false,     optionA: true,           optionB: true },
  { feature: 'Sticky ATC on PDP',                  competitor: '❓',      optionA: true,           optionB: true },
  { feature: 'Judge.me stars on collection cards', competitor: false,     optionA: true,           optionB: true },
  { feature: 'Cart page overhaul (trust + upsell)',competitor: 'Partial', optionA: true,           optionB: true },
  { feature: 'Express checkout (Shop Pay etc.)',   competitor: false,     optionA: true,           optionB: true },
  { feature: 'Custom Shopify theme from scratch',  competitor: false,     optionA: false,          optionB: true },
  { feature: 'Canva mockup design executed',       competitor: false,     optionA: false,          optionB: true },
  { feature: 'Mood-led homepage navigation',       competitor: false,     optionA: false,          optionB: true },
  { feature: 'Custom PDP + collection templates',  competitor: false,     optionA: false,          optionB: true },
  { feature: 'PageSpeed 90+ mobile target',        competitor: false,     optionA: 'Best effort',  optionB: 'Guaranteed' },
  { feature: 'Monthly retainer available',         competitor: '❓',      optionA: true,           optionB: true },
  { feature: 'Timeline',                           competitor: '8–12 wks',optionA: '3–4 wks',     optionB: '6–8 wks' },
  { feature: 'One-time price',                     competitor: '₹?',      optionA: '₹45,000',     optionB: '₹95,000' },
  { feature: 'Monthly retainer',                   competitor: '₹?',      optionA: '₹22,000/mo',  optionB: '₹35,000/mo' },
];

// ── Cell renderer ─────────────────────────────────────────────────────────────

function Cell({ val }: { val: string | boolean }) {
  if (val === true)  return <span className="prop-check">✓</span>;
  if (val === false) return <span className="prop-cross">✗</span>;
  return <span className="prop-cell-text">{val}</span>;
}

// ── Option card ───────────────────────────────────────────────────────────────

function OptionCard({ opt, letter }: { opt: Option; letter: 'A' | 'B' }) {
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const toggle = (h: string) => setOpen(p => ({ ...p, [h]: !p[h] }));

  return (
    <div className={`prop-card ${opt.recommended ? 'prop-card--rec' : ''}`}>
      <div className="prop-card-header">
        <div className="prop-badges">
          <span className="prop-badge-letter">{letter}</span>
          <span className="prop-badge-type">{opt.badge}</span>
          {opt.recommended && <span className="prop-badge-rec">★ RECOMMENDED</span>}
        </div>
        <p className="prop-tagline">{opt.tagline}</p>
      </div>

      {/* One-time pricing */}
      <div className="prop-price-block">
        <div className="prop-price-row">
          <div>
            <div className="prop-price-amount">{opt.oneTimePrice}</div>
            <div className="prop-price-label">{opt.oneTimeLabel}</div>
          </div>
          <div className="prop-price-divider" />
          <div>
            <div className="prop-price-amount">{opt.retainerPrice}<span className="prop-price-mo">/mo</span></div>
            <div className="prop-price-label">Optional monthly retainer</div>
          </div>
        </div>
        <div className="prop-timeline-tag">⏱ {opt.timeline} delivery</div>
      </div>

      {/* Deliverables */}
      <div className="prop-deliverables">
        <div className="prop-section-label">What&apos;s included</div>
        {opt.deliverables.map(group => (
          <div key={group.heading} className="prop-group">
            <button
              className="prop-group-toggle"
              onClick={() => toggle(group.heading)}
              aria-expanded={!!open[group.heading]}
            >
              <span>{group.heading}</span>
              <svg
                className={`prop-chevron ${open[group.heading] ? 'prop-chevron--open' : ''}`}
                width="16" height="16" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2"
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>
            {open[group.heading] && (
              <ul className="prop-items">
                {group.items.map((item, i) => (
                  <li key={i} className="prop-item">
                    <span className="prop-item-dot" />
                    {item}
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>

      {/* Retainer */}
      <div className="prop-retainer">
        <div className="prop-section-label">Monthly retainer includes</div>
        <ul className="prop-items prop-items--retainer">
          {opt.retainerItems.map((item, i) => (
            <li key={i} className="prop-item">
              <span className="prop-item-dot prop-item-dot--teal" />
              {item}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function ProposalView() {
  const [showTable, setShowTable] = useState(false);

  return (
    <div className="prop-root">

      {/* Header */}
      <div className="prop-header">
        <div className="prop-header-badge">PROPOSAL · MARCH 2026</div>
        <h1 className="prop-title">CRO, SEO &amp; Shopify Optimisation Proposal</h1>
        <p className="prop-subtitle">Prepared by Rachna Builds &middot; Valid for 30 days</p>
        <p className="prop-note">
          Choose the option that works best for you. Both include a retainer option for ongoing growth.
          The proposal below is based on the full technical audit completed in March 2026.
        </p>
      </div>

      {/* Option cards */}
      <div className="prop-cards">
        <OptionCard opt={OPTION_A} letter="A" />
        <OptionCard opt={OPTION_B} letter="B" />
      </div>

      {/* Comparison table */}
      <div className="prop-compare-wrap">
        <button className="prop-compare-toggle" onClick={() => setShowTable(p => !p)}>
          {showTable ? '▲ Hide' : '▼ Show'} full feature comparison
        </button>

        {showTable && (
          <div className="prop-table-wrap">
            <p className="prop-table-note">* Competitor = Aroha Studios proposal, March 2026</p>
            <table className="prop-table">
              <thead>
                <tr>
                  <th className="prop-th prop-th--feature">Feature</th>
                  <th className="prop-th prop-th--comp">Competitor*</th>
                  <th className="prop-th prop-th--a">Option A</th>
                  <th className="prop-th prop-th--b">Option B ★</th>
                </tr>
              </thead>
              <tbody>
                {COMPARISON.map((row, i) => (
                  <tr key={i} className={i % 2 === 0 ? 'prop-tr-even' : ''}>
                    <td className="prop-td prop-td--feature">{row.feature}</td>
                    <td className="prop-td prop-td--center"><Cell val={row.competitor} /></td>
                    <td className="prop-td prop-td--center"><Cell val={row.optionA} /></td>
                    <td className="prop-td prop-td--center prop-td--b"><Cell val={row.optionB} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Payment terms */}
      <div className="prop-payment">
        <div className="prop-payment-title">💳 Payment Terms</div>
        <div className="prop-payment-grid">
          <div className="prop-payment-item">
            <div className="prop-payment-label">One-time fixed fee</div>
            <div className="prop-payment-detail">50% at project kickoff &middot; 50% on final delivery</div>
          </div>
          <div className="prop-payment-divider" />
          <div className="prop-payment-item">
            <div className="prop-payment-label">Monthly retainer</div>
            <div className="prop-payment-detail">50% advance at kickoff &middot; 50% on the 1st of the following month</div>
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="prop-cta">
        <p className="prop-cta-text">Ready to move forward? Reply via the Comments tab or reach out to Rachna directly.</p>
      </div>

    </div>
  );
}
