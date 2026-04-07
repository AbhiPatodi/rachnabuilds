'use client';

import { useState } from 'react';

// ── Types ────────────────────────────────────────────────────────────────────

interface ReportSection {
  id: string;
  sectionType: string;
  title: string;
  content: unknown;
  displayOrder: number;
}

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

// ── Sage & Veda hardcoded content ─────────────────────────────────────────────

const OPTION_A: Option = {
  badge: 'OPTIMISE CURRENT THEME',
  tagline: 'Fix, optimise and grow — within your existing Shopify theme',
  oneTimePrice: '₹49,999',
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
  retainerPrice: '₹28,000',
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
  { feature: 'Performance fix (SVG → WebP, 32MB → 2MB)',  competitor: false,          optionA: true,           optionB: true },
  { feature: 'Klaviyo script deduplication (8 → 1)',       competitor: false,          optionA: true,           optionB: true },
  { feature: 'GTM / Google Ads deduplication',             competitor: true,           optionA: true,           optionB: true },
  { feature: 'Font & lazy load fix',                       competitor: false,          optionA: true,           optionB: true },
  { feature: 'PageSpeed 90+ mobile target',                competitor: false,          optionA: 'Best effort',  optionB: 'Guaranteed' },
  { feature: 'H1 + heading hierarchy fix',                 competitor: true,           optionA: true,           optionB: true },
  { feature: 'Meta titles + descriptions rewrite',         competitor: true,           optionA: true,           optionB: true },
  { feature: 'JSON-LD schema (Product, Org, FAQ)',         competitor: true,           optionA: true,           optionB: true },
  { feature: 'Breadcrumbs sitewide',                       competitor: true,           optionA: true,           optionB: true },
  { feature: 'Image alt text audit (27+ images)',          competitor: false,          optionA: true,           optionB: true },
  { feature: 'Internal linking strategy',                  competitor: true,           optionA: true,           optionB: true },
  { feature: 'GSC monitoring (monthly)',                   competitor: true,           optionA: true,           optionB: true },
  { feature: 'Sticky ATC on PDP',                         competitor: true,           optionA: true,           optionB: true },
  { feature: 'Judge.me stars on collection cards',         competitor: true,           optionA: true,           optionB: true },
  { feature: 'Cart overhaul (trust + free shipping bar)',  competitor: true,           optionA: true,           optionB: true },
  { feature: 'Express checkout (Shop Pay / Apple Pay)',    competitor: false,          optionA: true,           optionB: true },
  { feature: 'A/B testing (up to 2/month)',                competitor: 'Retainer only',optionA: true,           optionB: true },
  { feature: 'Heatmap + session recording setup',         competitor: true,           optionA: true,           optionB: true },
  { feature: 'Custom Shopify theme from scratch',          competitor: false,          optionA: false,          optionB: true },
  { feature: 'Canva mockup executed (dark editorial)',     competitor: false,          optionA: false,          optionB: true },
  { feature: 'Mood-led homepage navigation',               competitor: false,          optionA: false,          optionB: true },
  { feature: 'Custom PDP + collection templates',          competitor: false,          optionA: false,          optionB: true },
  { feature: 'Monthly performance report',                 competitor: true,           optionA: true,           optionB: true },
  { feature: 'Dedicated sync calls',                       competitor: 'Bi-weekly',    optionA: 'Weekly/Bi-weekly', optionB: 'Weekly/Bi-weekly' },
  { feature: 'Min. retainer commitment',                   competitor: '3 months',     optionA: '3 months',     optionB: '3 months' },
  { feature: 'Theme migration available',                  competitor: false,          optionA: false,          optionB: true },
  { feature: 'Timeline (one-time)',                        competitor: '6–8 wks',      optionA: '3–4 wks',      optionB: '6–8 wks' },
  { feature: 'One-time price',                             competitor: '₹40,000',      optionA: '₹49,999',      optionB: '₹95,000' },
  { feature: 'Monthly retainer',                          competitor: '₹34,000/mo',   optionA: '₹28,000/mo',   optionB: '₹35,000/mo' },
];

// ── Helpers ──────────────────────────────────────────────────────────────────

function Cell({ val }: { val: string | boolean }) {
  if (val === true)  return <span className="prop-check">✓</span>;
  if (val === false) return <span className="prop-cross">✗</span>;
  return <span className="prop-cell-text">{val}</span>;
}

function getSectionItems(section: ReportSection): string[] {
  const c = section.content as { items?: string[] };
  return c?.items ?? [];
}

// ── Option card (original two-option layout) ──────────────────────────────────

function OptionCard({ opt, letter, selected, onSelect }: {
  opt: Option;
  letter: 'A' | 'B';
  selected: boolean;
  onSelect: () => void;
}) {
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const toggle = (h: string) => setOpen(p => ({ ...p, [h]: !p[h] }));

  return (
    <div
      className={`prop-card ${opt.recommended ? 'prop-card--rec' : ''} ${selected ? 'prop-card--selected' : ''}`}
      onClick={onSelect}
      role="button"
      tabIndex={0}
      onKeyDown={e => e.key === 'Enter' && onSelect()}
    >
      <div className="prop-card-header">
        <div className="prop-badges">
          <span className="prop-badge-letter">{letter}</span>
          <span className="prop-badge-type">{opt.badge}</span>
          {opt.recommended && <span className="prop-badge-rec">★ RECOMMENDED</span>}
          {selected && <span className="prop-badge-selected">✓ SELECTED</span>}
        </div>
        <p className="prop-tagline">{opt.tagline}</p>
      </div>

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

      <div className="prop-deliverables" onClick={e => e.stopPropagation()}>
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

      <div className="prop-retainer" onClick={e => e.stopPropagation()}>
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

      <div className="prop-card-select">
        <div className={`prop-select-btn ${selected ? 'prop-select-btn--active' : ''}`}>
          {selected ? '✓ This is my preferred option' : `Select Option ${letter}`}
        </div>
      </div>
    </div>
  );
}

// ── Data-driven two-option layout ────────────────────────────────────────────

function DataProposalView({ sections }: { sections: ReportSection[] }) {
  const sorted = [...sections].sort((a, b) => a.displayOrder - b.displayOrder);
  const phase1 = sorted[0];
  const phase2 = sorted[1];

  const p1Items = phase1 ? getSectionItems(phase1) : [];
  const p2Items = phase2 ? getSectionItems(phase2) : [];

  const p1Del   = p1Items.filter(i => i.startsWith('✅'));
  const p1Info  = p1Items.filter(i => i.startsWith('💡'));
  const p2Del   = p2Items.filter(i => i.startsWith('🟡'));
  const p2Info  = p2Items.filter(i => i.startsWith('💡'));

  const parseInfo = (info: string[], key: string) =>
    info.find(i => i.includes(key))?.replace(/^💡 [^:]+: /, '') ?? '';

  const p1Price    = parseInfo(p1Info, 'Investment');
  const p1Payment  = parseInfo(p1Info, 'Payment');
  const p1Timeline = parseInfo(p1Info, 'Timeline');
  const p2Price    = parseInfo(p2Info, 'Investment');
  const p2Payment  = parseInfo(p2Info, 'Payment');
  const p2Timeline = parseInfo(p2Info, 'Timeline');
  // Fallback: if no explicit Investment line for Phase 2, look for any pricing-related 💡 note
  const p2PriceNote = !p2Price
    ? p2Info.find(i => /pricing|price|cost|quote/i.test(i))?.replace(/^💡\s*/, '') ?? ''
    : '';

  const [selected, setSelected]     = useState<'A' | 'B'>('A');
  const PREVIEW_COUNT = 5;
  // Default to half-open (showing preview) — true = show all
  const [p1Open, setP1Open]         = useState(false);
  const [p2Open, setP2Open]         = useState(false);
  const [p1OpenInB, setP1OpenInB]   = useState(false);

  const ItemList = ({ items, cls, expanded }: { items: string[]; cls?: string; expanded: boolean }) => {
    const visible = expanded ? items : items.slice(0, PREVIEW_COUNT);
    return (
      <ul className={`prop-items${cls ? ' ' + cls : ''}`} style={{ display: 'block', marginTop: '8px' }}>
        {visible.map((item, i) => (
          <li key={i} className="prop-item">
            <span className={`prop-item-dot${cls ? ' prop-item-dot--teal' : ''}`} />
            {item.replace(/^[✅🟡]\s*/u, '')}
          </li>
        ))}
      </ul>
    );
  };

  return (
    <div className="prop-root">
      <div className="prop-header">
        <div className="prop-header-badge">PROPOSAL · APRIL 2026</div>
        <h1 className="prop-title">Shopify Store Build Proposal</h1>
        <p className="prop-subtitle">Prepared by Rachna Builds &middot; Valid for 30 days</p>
        <p className="prop-note">Review both options and click to select the one that fits best.</p>
      </div>

      <div className="prop-cards">
        {/* Option A — Phase 1 only — RECOMMENDED */}
        <div
          className={`prop-card prop-card--rec ${selected === 'A' ? 'prop-card--selected' : ''}`}
          onClick={() => setSelected('A')}
          role="button" tabIndex={0}
          onKeyDown={e => e.key === 'Enter' && setSelected('A')}
        >
          <div className="prop-card-header">
            <div className="prop-badges">
              <span className="prop-badge-letter">A</span>
              <span className="prop-badge-type">PHASE 1 — CORE BUILD</span>
              <span className="prop-badge-rec">★ RECOMMENDED</span>
              {selected === 'A' && <span className="prop-badge-selected">✓ SELECTED</span>}
            </div>
            <p className="prop-tagline">Everything you need to launch — a complete, polished Shopify store</p>
          </div>
          <div className="prop-price-block">
            <div className="prop-price-row">
              <div>
                <div className="prop-price-amount">{p1Price}</div>
                <div className="prop-price-label">One-time fixed fee</div>
              </div>
            </div>
            {p1Timeline && <div className="prop-timeline-tag">⏱ {p1Timeline}</div>}
          </div>
          <div className="prop-deliverables" onClick={e => e.stopPropagation()}>
            <div className="prop-section-label">What&apos;s included</div>
            <div className="prop-group">
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary, #fff)', padding: '10px 0 6px' }}>Phase 1 deliverables ({p1Del.length})</div>
              <ItemList items={p1Del} expanded={p1Open} />
              {p1Del.length > PREVIEW_COUNT && (
                <button className="prop-group-toggle" onClick={() => setP1Open(p => !p)} aria-expanded={p1Open} style={{ marginTop: 4 }}>
                  <span>{p1Open ? `Show less` : `Show all ${p1Del.length} deliverables`}</span>
                  <svg className={`prop-chevron ${p1Open ? 'prop-chevron--open' : ''}`} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </button>
              )}
            </div>
          </div>
          <div className="prop-card-select">
            <div className={`prop-select-btn ${selected === 'A' ? 'prop-select-btn--active' : ''}`}>
              {selected === 'A' ? '✓ This is my preferred option' : 'Select Option A'}
            </div>
          </div>
        </div>

        {/* Option B — Phase 1 + Phase 2 */}
        <div
          className={`prop-card ${selected === 'B' ? 'prop-card--selected' : ''}`}
          onClick={() => setSelected('B')}
          role="button" tabIndex={0}
          onKeyDown={e => e.key === 'Enter' && setSelected('B')}
        >
          <div className="prop-card-header">
            <div className="prop-badges">
              <span className="prop-badge-letter">B</span>
              <span className="prop-badge-type">PHASE 1 + PHASE 2</span>
              {selected === 'B' && <span className="prop-badge-selected">✓ SELECTED</span>}
            </div>
            <p className="prop-tagline">Full build + premium features — everything from Phase 1, plus the upgrades that set you apart</p>
          </div>
          <div className="prop-price-block">
            <div className="prop-price-row">
              <div>
                {p2Price ? (
                  <>
                    <div className="prop-price-amount">{p2Price}</div>
                    <div className="prop-price-label">One-time fixed fee</div>
                  </>
                ) : (
                  <>
                    <div className="prop-price-amount" style={{ fontSize: '20px', lineHeight: 1.3 }}>Custom Quote</div>
                    <div className="prop-price-label">{p2PriceNote || 'Pricing tailored to selected upgrades'}</div>
                  </>
                )}
              </div>
            </div>
            {p2Timeline && <div className="prop-timeline-tag">⏱ {p2Timeline}</div>}
          </div>
          <div className="prop-deliverables" onClick={e => e.stopPropagation()}>
            <div className="prop-section-label">What&apos;s included</div>
            <div className="prop-group">
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary, #fff)', padding: '10px 0 6px' }}>Phase 2 upgrades ({p2Del.length})</div>
              <ItemList items={p2Del} cls="prop-items--retainer" expanded={p2Open} />
              {p2Del.length > PREVIEW_COUNT && (
                <button className="prop-group-toggle" onClick={() => setP2Open(p => !p)} aria-expanded={p2Open} style={{ marginTop: 4 }}>
                  <span>{p2Open ? `Show less` : `Show all ${p2Del.length} upgrades`}</span>
                  <svg className={`prop-chevron ${p2Open ? 'prop-chevron--open' : ''}`} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </button>
              )}
            </div>
            <div className="prop-group">
              <button className="prop-group-toggle" onClick={() => setP1OpenInB(p => !p)} aria-expanded={p1OpenInB} style={{ marginTop: 4 }}>
                <span>{p1OpenInB ? `Hide Option A deliverables` : `+ Everything in Option A (${p1Del.length})`}</span>
                <svg className={`prop-chevron ${p1OpenInB ? 'prop-chevron--open' : ''}`} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>
              {p1OpenInB && <ItemList items={p1Del} expanded={true} />}
            </div>
          </div>
          <div className="prop-card-select">
            <div className={`prop-select-btn ${selected === 'B' ? 'prop-select-btn--active' : ''}`}>
              {selected === 'B' ? '✓ This is my preferred option' : 'Select Option B'}
            </div>
          </div>
        </div>
      </div>

      {/* Selection banner */}
      <div className={`prop-selection-banner prop-selection-banner--${selected.toLowerCase()}`}>
        <span className="prop-selection-icon">✓</span>
        <div>
          <strong>Option {selected} selected</strong> — {selected === 'A'
            ? `Phase 1 Core Build · ${p1Price} one-time`
            : p2Price ? `Phase 1 + Phase 2 · ${p2Price} one-time` : 'Phase 1 + Phase 2 · Custom quote'}
        </div>
        <span className="prop-selection-hint">Reply to this portal or reach out to confirm</span>
      </div>

      {/* Payment terms */}
      <div className="prop-payment">
        <div className="prop-payment-title">💳 Payment Terms</div>
        <div className="prop-payment-grid">
          <div className="prop-payment-item">
            <div className="prop-payment-label">One-time fixed fee</div>
            <div className="prop-payment-detail">{selected === 'A' ? p1Payment : p2Payment}</div>
          </div>
        </div>
      </div>

      <div className="prop-cta">
        <p className="prop-cta-text">Ready to move forward? Reply via the Comments tab or reach out to Rachna directly.</p>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function ProposalView({ sections }: { sections?: ReportSection[] }) {
  const hasProposalSections = sections && sections.some(s => s.sectionType === 'proposal');
  if (hasProposalSections) {
    return <DataProposalView sections={sections!} />;
  }
  return null;
}
