/** Collects raw signals about a store: PageSpeed metrics + on-page scrape. */

interface PageSpeedResult {
  strategy: string;
  performanceScore: number | null;
  seoScore: number | null;
  lcpMs: number | null;
  cls: number | null;
  tbtMs: number | null;
  fcpMs: number | null;
  error?: string;
}

async function runPageSpeed(url: string, strategy: 'mobile' | 'desktop'): Promise<PageSpeedResult> {
  try {
    const psUrl = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(url)}&strategy=${strategy}&category=performance&category=seo`;
    const res = await fetch(psUrl, { signal: AbortSignal.timeout(90000) });
    if (!res.ok) return { strategy, performanceScore: null, seoScore: null, lcpMs: null, cls: null, tbtMs: null, fcpMs: null, error: `HTTP ${res.status}` };
    const data = await res.json();
    const cats = data.lighthouseResult?.categories;
    const audits = data.lighthouseResult?.audits;
    return {
      strategy,
      performanceScore: cats?.performance?.score != null ? Math.round(cats.performance.score * 100) : null,
      seoScore: cats?.seo?.score != null ? Math.round(cats.seo.score * 100) : null,
      lcpMs: audits?.['largest-contentful-paint']?.numericValue ?? null,
      cls: audits?.['cumulative-layout-shift']?.numericValue ?? null,
      tbtMs: audits?.['total-blocking-time']?.numericValue ?? null,
      fcpMs: audits?.['first-contentful-paint']?.numericValue ?? null,
    };
  } catch (err) {
    return { strategy, performanceScore: null, seoScore: null, lcpMs: null, cls: null, tbtMs: null, fcpMs: null, error: err instanceof Error ? err.message : 'failed' };
  }
}

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36 RachnaBuildsAuditBot/1.0';

async function fetchPage(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'text/html' }, redirect: 'follow', signal: AbortSignal.timeout(20000) });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

function extract(html: string, regex: RegExp): string | null {
  const m = html.match(regex);
  return m ? m[1].trim() : null;
}

function analyzeHtml(html: string) {
  const lower = html.toLowerCase();
  return {
    title: extract(html, /<title[^>]*>([^<]*)<\/title>/i),
    metaDescription: extract(html, /<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i) ||
      extract(html, /<meta[^>]+content=["']([^"']*)["'][^>]+name=["']description["']/i),
    isShopify: lower.includes('cdn.shopify.com') || lower.includes('shopify.theme') || lower.includes('myshopify.com'),
    hasReviewsApp: /judge\.me|loox|yotpo|stamped|okendo|trustpilot|review/i.test(html),
    hasAnnouncementBar: /announcement|promo-bar|top-bar/i.test(html),
    hasWhatsApp: /wa\.me|whatsapp/i.test(html),
    hasLiveChat: /tawk|tidio|gorgias|intercom|crisp|zendesk/i.test(html),
    hasKlaviyo: /klaviyo/i.test(html),
    hasMetaPixel: /connect\.facebook\.net|fbq\(/i.test(html),
    hasGa4: /googletagmanager|gtag\(/i.test(html),
    hasCurrencySelector: /currency-selector|currency_selector|multi-currency/i.test(html),
    hasFreeShippingMention: /free shipping|free delivery/i.test(html),
    hasGuaranteeMention: /money.?back|guarantee|returns?/i.test(html),
    hasPopup: /popup|newsletter-modal|exit-intent/i.test(html),
    imageCount: (html.match(/<img/gi) || []).length,
    lazyImageCount: (html.match(/loading=["']lazy["']/gi) || []).length,
    h1s: [...html.matchAll(/<h1[^>]*>([\s\S]*?)<\/h1>/gi)].map((m) => m[1].replace(/<[^>]+>/g, '').trim()).slice(0, 3),
    scriptCount: (html.match(/<script/gi) || []).length,
    htmlKb: Math.round(html.length / 1024),
  };
}

function findProductUrl(html: string, baseUrl: string): string | null {
  const m = html.match(/href=["']([^"']*\/products\/[^"'?#]+)["']/i);
  if (!m) return null;
  try {
    return new URL(m[1], baseUrl).toString();
  } catch {
    return null;
  }
}

export async function collectStoreData(storeUrl: string) {
  let url = storeUrl.trim();
  if (!/^https?:\/\//i.test(url)) url = `https://${url}`;

  const [psMobile, homepageHtml] = await Promise.all([
    runPageSpeed(url, 'mobile'),
    fetchPage(url),
  ]);

  const homepage = homepageHtml ? analyzeHtml(homepageHtml) : null;
  let productPage: ReturnType<typeof analyzeHtml> | null = null;
  let productUrl: string | null = null;

  if (homepageHtml) {
    productUrl = findProductUrl(homepageHtml, url);
    if (productUrl) {
      const productHtml = await fetchPage(productUrl);
      if (productHtml) productPage = analyzeHtml(productHtml);
    }
  }

  return {
    url,
    fetchedAt: new Date().toISOString(),
    pageSpeed: { mobile: psMobile },
    homepage,
    productUrl,
    productPage,
    fetchFailed: !homepageHtml,
  };
}

export type StoreData = Awaited<ReturnType<typeof collectStoreData>>;
