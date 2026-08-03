'use client';

import Link from 'next/link';

/**
 * VSL video embed.
 * The SOP's Wistia code is still pending — paste the Wistia (or YouTube/Vimeo)
 * embed URL below when ready and the placeholder disappears automatically.
 */
const VSL_EMBED_URL = ''; // e.g. 'https://fast.wistia.net/embed/iframe/XXXXXXXX'

export default function WatchVsl() {
  return (
    <>
      <div className="fn-callout">Free Training · Watch Now</div>

      <h1 className="fn-h1">
        How To Build A <em>2%+ Converting</em> Shopify Store In 14 Days
      </h1>

      <p className="fn-sub">
        Without increasing your ad budget, or constantly tweaking your ads.
      </p>

      <div className="fn-video-wrap">
        {VSL_EMBED_URL ? (
          <iframe
            src={VSL_EMBED_URL}
            title="Free Training — 2%+ Converting Shopify Store"
            allow="autoplay; fullscreen"
            allowFullScreen
          />
        ) : (
          <div className="fn-video-placeholder">
            <div className="play">▶</div>
            <p>Training video coming right up — meanwhile, apply below for your free audit.</p>
          </div>
        )}
      </div>

      <div className="fn-arrow">↓</div>

      <Link href="/training/apply" className="fn-btn" style={{ maxWidth: 420, margin: '0 auto' }}>
        Apply Now for a 1:1 Consultation →
      </Link>

      <p className="fn-disclaimer" style={{ maxWidth: 480, margin: '20px auto 0' }}>
        Apply for your <strong>Free Shopify Conversion Audit</strong> — we&apos;ll identify the
        conversion bottlenecks reducing your sales, whether you decide to work with us or not.
      </p>
    </>
  );
}
