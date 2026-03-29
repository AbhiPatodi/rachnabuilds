import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const OPPORTUNITY_TIPS: Record<string, { title: string; tip: string }> = {
  'render-blocking-resources':  { title: 'Render-blocking resources',   tip: 'Move scripts to load with defer/async. Non-critical CSS should load after the page.' },
  'unused-javascript':          { title: 'Unused JavaScript',           tip: 'Remove or lazy-load JS bundles not needed on this page. Review installed apps.' },
  'unused-css-rules':           { title: 'Unused CSS',                  tip: 'Trim your stylesheet. Many Shopify themes ship with CSS for features you\'re not using.' },
  'uses-optimized-images':      { title: 'Unoptimised images',          tip: 'Compress images with TinyPNG or Squoosh. Shopify\'s CDN can also auto-compress them.' },
  'uses-webp-images':           { title: 'Images not in WebP format',   tip: 'Convert to WebP — 25–35% smaller with the same quality. Most modern browsers support it.' },
  'uses-text-compression':      { title: 'No text compression',         tip: 'Enable GZIP or Brotli compression on your server to shrink HTML/CSS/JS responses.' },
  'server-response-time':       { title: 'Slow server response (TTFB)', tip: 'Check how many apps are installed — each one can add to server response time.' },
  'uses-long-cache-ttl':        { title: 'Short cache lifetimes',       tip: 'Set long cache expiry on static assets so returning visitors don\'t re-download everything.' },
  'uses-responsive-images':     { title: 'Non-responsive images',       tip: 'Serve smaller images to mobile devices using the srcset attribute.' },
  'efficient-animated-content': { title: 'Inefficient animations/GIFs', tip: 'Replace GIFs with video (MP4/WebM) — up to 80% smaller file size.' },
  'third-party-summary':        { title: 'Heavy third-party scripts',   tip: 'Review all installed apps. Each tracking pixel and chat widget adds load time.' },
};

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get('url');
  if (!url) return NextResponse.json({ error: 'URL required' }, { status: 400 });

  let targetUrl = url.trim();
  if (!targetUrl.startsWith('http')) targetUrl = 'https://' + targetUrl;

  try {
    new URL(targetUrl);
  } catch {
    return NextResponse.json({ error: 'Invalid URL' }, { status: 400 });
  }

  const apiKey = process.env.PAGESPEED_API_KEY || '';
  const psiUrl = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(targetUrl)}&strategy=mobile${apiKey ? `&key=${apiKey}` : ''}`;

  try {
    const res = await fetch(psiUrl, { next: { revalidate: 0 } });
    if (!res.ok) {
      if (res.status === 429) {
        return NextResponse.json({ error: 'Rate limit reached. Please wait a minute and try again, or add a Google API key.' }, { status: 429 });
      }
      const err = await res.json().catch(() => ({}));
      return NextResponse.json({ error: err?.error?.message || 'PageSpeed API error' }, { status: 502 });
    }
    const data = await res.json();
    const lhr = data.lighthouseResult;
    const audits = lhr.audits as Record<string, { title: string; displayValue?: string; score: number | null; description?: string }>;

    const score = Math.round((lhr.categories.performance.score ?? 0) * 100);

    const cwv = {
      lcp: audits['largest-contentful-paint']?.displayValue ?? '—',
      tbt: audits['total-blocking-time']?.displayValue ?? '—',
      cls: audits['cumulative-layout-shift']?.displayValue ?? '—',
      fcp: audits['first-contentful-paint']?.displayValue ?? '—',
      si:  audits['speed-index']?.displayValue ?? '—',
      lcpScore: audits['largest-contentful-paint']?.score ?? null,
      tbtScore: audits['total-blocking-time']?.score ?? null,
      clsScore: audits['cumulative-layout-shift']?.score ?? null,
    };

    // Top 3 opportunities by lowest score
    const opportunities = Object.entries(OPPORTUNITY_TIPS)
      .map(([id, meta]) => ({ id, ...meta, score: audits[id]?.score ?? 1 }))
      .filter(o => o.score !== null && o.score < 0.9)
      .sort((a, b) => a.score - b.score)
      .slice(0, 3);

    return NextResponse.json({ score, cwv, opportunities, url: targetUrl });
  } catch (err) {
    console.error('[pagespeed]', err);
    return NextResponse.json({ error: 'Failed to analyse store. Please try again.' }, { status: 500 });
  }
}
