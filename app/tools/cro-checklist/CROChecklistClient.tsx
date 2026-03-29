'use client';

import { useState } from 'react';
import Link from 'next/link';
import '../tools.css';

const CHECKLIST = [
  {
    category: '🏠 Homepage',
    items: [
      'Hero section is fully visible above the fold without scrolling',
      'Value proposition is clear within 5 seconds of landing',
      'Primary CTA button is high contrast and immediately visible',
      'Social proof (reviews, logos, stats) is visible on the homepage',
      'Navigation is simple — maximum 6 items in the menu',
      'Page loads in under 3 seconds on mobile',
      'Trust badges are visible (secure checkout, return policy)',
      'Announcement bar is used for urgency (free shipping, sale deadline)',
      'Email capture or exit-intent popup is in place',
      'Mobile hero displays correctly on small screens (iPhone SE size)',
    ],
  },
  {
    category: '🛍 Product Pages',
    items: [
      'Product images are high quality and support zoom on desktop',
      'Minimum 3–5 product images shown per variant',
      'Price is clearly visible — no hunting required',
      'Add to Cart button is above the fold on both desktop and mobile',
      'Product descriptions answer the top 3 buyer questions',
      'Size/variant selector is clear and easy to interact with',
      'Customer reviews are visible on the product page',
      'Stock scarcity is shown where real (e.g., "Only 3 left")',
      'Shipping time and cost is visible before reaching the cart',
      'Related products or upsells are shown to increase AOV',
    ],
  },
  {
    category: '🛒 Cart & Checkout',
    items: [
      'Cart is accessible with one click or tap from any page',
      'Cart shows product image, name, price, and quantity together',
      'Free shipping threshold progress bar shown in cart',
      'Checkout button is prominent and high contrast in the cart',
      'Guest checkout is available (no forced account creation)',
      'Accepted payment methods are shown with icons',
      'Checkout form is minimal — only necessary fields collected',
      'Order summary stays visible throughout the checkout flow',
      'Security badges are visible at the checkout page',
      'Abandoned cart email sequence is set up and tested',
    ],
  },
  {
    category: '🧭 Navigation & UX',
    items: [
      'Mobile menu is easy to open and navigate with one hand',
      'Search is accessible from all pages',
      'Collection pages have working filter and sort options',
      '404 page has clear navigation back to the store',
      'All links and buttons work — no broken CTAs',
      'Back button behaves as expected throughout the site',
      'Body text is at least 16px on mobile for readability',
      'Touch targets (buttons, links) are at least 44px tall on mobile',
      'No horizontal scroll appears on any mobile screen',
      'Page transitions and animations don\'t block interaction',
    ],
  },
  {
    category: '⭐ Trust & Social Proof',
    items: [
      'Star ratings are visible on product cards in collection pages',
      'Total review count is shown alongside star rating',
      'User-generated content (customer photos) is displayed',
      'Money-back guarantee or return policy is prominently shown',
      'SSL certificate is active and padlock shows in browser bar',
      'About page tells a genuine brand story',
      'Contact information (email or chat) is easy to find',
      'Real customer photos are used (not just stock images)',
      'Response time promise is visible ("We reply within 24h")',
      'Press or media mentions are displayed if available',
    ],
  },
];

const PREVIEW_ITEMS = [
  'Hero section is fully visible above the fold without scrolling',
  'Add to Cart button is above the fold on both desktop and mobile',
  'Guest checkout is available (no forced account creation)',
];

export default function CROChecklistClient() {
  const [unlocked, setUnlocked] = useState(false);
  const [form, setForm] = useState({ name: '', email: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [checked, setChecked] = useState<Set<string>>(new Set());

  const toggle = (item: string) => {
    setChecked(prev => {
      const next = new Set(prev);
      next.has(item) ? next.delete(item) : next.add(item);
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/tools/cro-checklist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Something went wrong'); return; }
      setUnlocked(true);
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const totalItems = CHECKLIST.reduce((s, c) => s + c.items.length, 0);
  const score = unlocked ? Math.round((checked.size / totalItems) * 100) : 0;

  return (
    <div className="tool-page">
      <div style={{ height: 72 }} />

      <div className="tool-hero">
        <div className="tool-tag">Free · Instant Access</div>
        <h1 className="tool-h1">50-Point Shopify<br />CRO Checklist</h1>
        <p className="tool-sub">
          The exact checklist I run through on every client store audit.<br />
          Covers homepage, product pages, checkout, UX, and trust signals.
        </p>
      </div>

      {/* Preview (teaser) */}
      {!unlocked && (
        <div className="checklist-preview">
          <div className="checklist-preview-label">Preview (3 of 50 items)</div>
          {PREVIEW_ITEMS.map(item => (
            <div key={item} className="checklist-preview-item">
              <span className="checklist-preview-box" />
              <span>{item}</span>
            </div>
          ))}
          <div className="checklist-preview-blur">
            <div className="checklist-blur-items">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="checklist-blur-row" style={{ width: `${70 + i * 7}%` }} />
              ))}
            </div>
            <div className="checklist-blur-overlay">
              <span>+ 47 more items →</span>
            </div>
          </div>
        </div>
      )}

      {/* Email gate */}
      {!unlocked && (
        <div className="checklist-gate">
          <h2>Get instant access — free</h2>
          <p>Enter your email to unlock the full 50-point checklist.</p>
          <form className="checklist-gate-form" onSubmit={handleSubmit}>
            <input
              type="text"
              placeholder="Your name (optional)"
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            />
            <input
              type="email"
              placeholder="your@email.com *"
              required
              value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
            />
            {error && <p className="tool-error">{error}</p>}
            <button type="submit" className="tool-submit-btn" disabled={loading}>
              {loading ? 'Unlocking…' : 'Unlock Free Checklist →'}
            </button>
          </form>
          <p className="tool-privacy">No spam. Unsubscribe any time.</p>
        </div>
      )}

      {/* Full checklist */}
      {unlocked && (
        <>
          {/* Progress */}
          <div className="checklist-progress-wrap">
            <div className="checklist-progress-bar">
              <div className="checklist-progress-fill" style={{ width: `${score}%` }} />
            </div>
            <div className="checklist-progress-label">
              <span>{checked.size} / {totalItems} completed</span>
              <span className="checklist-score">{score}% score</span>
            </div>
          </div>

          {score < 70 && (
            <div className="checklist-nudge">
              ⚠️ Your store is likely leaving conversions on the table. <Link href="/free-audit">Get a free audit →</Link>
            </div>
          )}
          {score >= 70 && score < 90 && (
            <div className="checklist-nudge good">
              👍 Good foundation! A few optimisations could push you to the next level.
            </div>
          )}
          {score >= 90 && (
            <div className="checklist-nudge great">
              🎉 Excellent store! You've nailed the fundamentals.
            </div>
          )}

          {CHECKLIST.map(section => (
            <div key={section.category} className="checklist-section">
              <h2 className="checklist-section-title">{section.category}</h2>
              {section.items.map(item => (
                <label key={item} className={`checklist-item${checked.has(item) ? ' checked' : ''}`}>
                  <input
                    type="checkbox"
                    checked={checked.has(item)}
                    onChange={() => toggle(item)}
                  />
                  <span className="checklist-item-text">{item}</span>
                </label>
              ))}
            </div>
          ))}

          <div className="speed-cta" style={{ marginTop: 40 }}>
            <h3>Score below 90%? Let's fix it.</h3>
            <p>I'll personally review your store and record a Loom video with specific recommendations — free, no obligation.</p>
            <Link href="/free-audit" className="tool-cta-btn">Get My Free Store Audit →</Link>
          </div>
        </>
      )}

      <div style={{ textAlign: 'center', padding: '24px 0 64px' }}>
        <Link href="/tools" style={{ color: 'var(--text-muted)', fontSize: 14 }}>← Back to Free Tools</Link>
      </div>
    </div>
  );
}
