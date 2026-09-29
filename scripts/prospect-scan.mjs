// Tier-1 scan for cold email: no browser, ~20s per store.
//   PAGESPEED_API_KEY=... node --env-file=.env.local scripts/prospect-scan.mjs [--tiers=A+,A] [--limit=50] [--concurrency=4]
// For each verified prospect with a store domain:
//   1. Shopify check + products.json (titles, prices, descriptions, image counts)
//   2. Homepage + first product page HTML: pixel/GA4/Klaviyo/reviews-app/sticky-ATC signals, policy pages
//   3. PageSpeed (mobile) on the product page: score + LCP
//   → 3–5 concrete findings, a one-line `finding` for email 1, and a teaser
//     StoreProofReport row (publicToken) so a "send it" reply gets a real link.
import pg from 'pg';
import { randomBytes } from 'crypto';

const args = Object.fromEntries(process.argv.slice(2).map((a) => { const [k, v] = a.replace(/^--/, '').split('='); return [k, v ?? true]; }));
const tiers = (args.tiers || 'A+,A').split(',');
const limit = Number(args.limit || 100);
const conc = Number(args.concurrency || 4);
const PSI = process.env.PAGESPEED_API_KEY;
const UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';

const c = new pg.Client({ connectionString: process.env.DATABASE_URL }); await c.connect();

async function get(url, ms = 20000) {
  const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), ms);
  try { const r = await fetch(url, { headers: { 'user-agent': UA, accept: 'text/html,application/json' }, redirect: 'follow', signal: ctl.signal }); const text = await r.text(); return { ok: r.ok, status: r.status, url: r.url, text }; }
  catch (e) { return { ok: false, status: 0, url, text: '', err: e.message }; }
  finally { clearTimeout(t); }
}
async function psi(url) {
  if (!PSI) return null;
  const r = await get(`https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(url)}&strategy=mobile&category=performance&key=${PSI}`, 60000);
  try { const j = JSON.parse(r.text); const a = j.lighthouseResult.audits; return { score: Math.round(j.lighthouseResult.categories.performance.score * 100), lcp: a['largest-contentful-paint'].numericValue, tbt: a['total-blocking-time'].numericValue }; } catch { return null; }
}
const strip = (h) => h.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
const money = (n, cur) => (cur === 'USD' ? `$${n}` : cur === 'GBP' ? `£${n}` : cur === 'AUD' ? `A$${n}` : cur === 'CAD' ? `C$${n}` : `${n} ${cur}`);

async function scan(p) {
  const host = (p.domain || (p.websiteUrl || '').replace(/^https?:\/\/(www\.)?/, '').split('/')[0] || '').toLowerCase();
  if (!host) return { skip: 'no domain' };
  const base = `https://${host}`;
  const home = await get(base);
  if (!home.ok) return { fail: `home ${home.status || home.err}` };
  const H = home.text;
  const shopify = /cdn\.shopify\.com|Shopify\.theme|shopify-section/.test(H);
  if (!shopify) return { skip: 'not shopify' };
  const prodsRes = await get(`${base}/products.json?limit=50`);
  let products = [];
  try { products = JSON.parse(prodsRes.text).products || []; } catch { /* blocked */ }
  const currency = (H.match(/"currency":"([A-Z]{3})"/) || H.match(/Shopify\.currency\s*=\s*\{"active":"([A-Z]{3})"/) || [])[1] || 'USD';
  const first = products.find((x) => x.variants?.[0]?.available !== false) || products[0];
  const pdpUrl = first ? `${base}/products/${first.handle}` : null;
  const pdp = pdpUrl ? await get(pdpUrl) : null;
  const P = pdp?.text || '';
  const sig = (re, ...hs) => hs.some((h) => re.test(h));
  const has = {
    metaPixel: sig(/connect\.facebook\.net\/[^"']*fbevents\.js|fbq\(/, H, P),
    ga4: sig(/gtag\/js\?id=G-|googletagmanager\.com\/gtm\.js|G-[A-Z0-9]{6,}/, H, P),
    klaviyo: sig(/klaviyo/i, H, P),
    email: sig(/klaviyo|omnisend|mailchimp|privy|attentive|postscript|justuno|wisepops|optimonk/i, H, P),
    reviewsApp: sig(/judge\.me|loox|yotpo|okendo|stamped|reviews\.io|junip|rivyo|opinew|ali-?reviews|trustpilot/i, H, P),
    reviewsShown: sig(/jdgm-rev-widg|loox-rating|yotpo-main-widget|okendo-reviews|stamped-main-widget|data-number-of-reviews="[1-9]/i, P),
    stickyAtc: sig(/sticky[-_]?(add[-_]?to[-_]?cart|atc|buy|cart)|product-form--sticky|sticky-product|StickyAddToCart/i, P),
    shippingOnPdp: /shipping|delivery/i.test(strip(P).slice(0, 12000)) && /return|refund/i.test(strip(P).slice(0, 12000)),
  };
  const shipPolicy = await get(`${base}/policies/shipping-policy`, 12000);
  const psiRes = await psi(pdpUrl || base);

  const findings = [];
  const name = (p.storeName || host.replace(/\.(com|co|net|org|io|shop|store|au|uk|ca)(\.\w+)?$/, '')).replace(/[-_]/g, ' ');
  const pt = first ? first.title.replace(/\s+/g, ' ').slice(0, 60) : null;
  if (psiRes && psiRes.lcp >= 4000) findings.push({ k: 'speed', sev: psiRes.lcp >= 7000 ? 'high' : 'medium', title: `${pt ? `The ${pt} page` : 'Your product page'} takes ${(psiRes.lcp / 1000).toFixed(1)}s to show its image on a phone`, body: `Google's own mobile test scores it ${psiRes.score}/100 and measures ${(psiRes.lcp / 1000).toFixed(1)} seconds before the main image appears. Google's 'poor' line is 4 seconds; most phone shoppers arriving from an ad or Instagram won't wait that long.` });
  if (!has.metaPixel && !has.ga4) findings.push({ k: 'tracking', sev: 'high', title: 'No Meta pixel and no Google Analytics on the store', body: `We looked at the homepage and the ${pt || 'product'} page and found neither a Meta pixel nor Google Analytics. Nothing is recording who visits, what they view, or where they drop off, so any ad money is spent blind.` });
  else if (!has.metaPixel) findings.push({ k: 'pixel', sev: 'medium', title: 'No Meta pixel, so Facebook and Instagram ads can\'t learn from your visitors', body: `Google Analytics is present, but there's no Meta pixel on the homepage or the ${pt || 'product'} page. Without it, Meta can't build audiences of people who viewed or added to cart.` });
  if (products.length && !has.reviewsApp) findings.push({ k: 'reviews', sev: 'high', title: `No customer reviews anywhere on ${products.length}${products.length === 50 ? '+' : ''} products`, body: `${pt ? `The ${pt} page` : 'Your product pages'} shows no reviews and no reviews app is installed. For a first-time buyer from a brand they don't know, reviews are the main reason to trust the ${first ? money(first.variants?.[0]?.price, currency) : ''} price.` });
  else if (has.reviewsApp && !has.reviewsShown && pt) findings.push({ k: 'reviews_hidden', sev: 'medium', title: 'A reviews app is installed but no reviews show on the product page', body: `The reviews app loads on the ${pt} page, but no review widget or star rating is visible. You're paying for the trust signal and shoppers never see it.` });
  if (!has.email) findings.push({ k: 'email', sev: 'medium', title: 'Visitors who don\'t buy leave with no way to bring them back', body: `No email or SMS capture (Klaviyo, Omnisend, Privy or similar) was found on the homepage or the ${pt || 'product'} page. Most first visits don't end in a purchase; without a way to follow up, each paid click gets one shot.` });
  if (first && !has.stickyAtc) findings.push({ k: 'atc', sev: 'low', title: 'No sticky add-to-cart on the product page', body: `On the ${pt} page there's no buy button that follows the shopper as they scroll. Once they read past the first screen, buying means scrolling back up.` });
  if (!shipPolicy.ok || shipPolicy.status === 404 || /page not found/i.test(strip(shipPolicy.text).slice(0, 300))) findings.push({ k: 'shipping', sev: 'low', title: 'No shipping policy page', body: `${base}/policies/shipping-policy isn't set up. Delivery time and cost are the questions shoppers check before buying, especially from a store they haven't used.` });
  if (products.length) {
    const thin = products.filter((x) => strip(x.body_html || '').length < 120);
    const single = products.filter((x) => (x.images || []).length <= 1);
    if (thin.length >= Math.max(3, products.length * 0.3)) findings.push({ k: 'thin', sev: 'low', title: `${thin.length} of ${products.length} products have almost no description`, body: `For example "${thin[0].title.slice(0, 50)}" has ${strip(thin[0].body_html || '').length} characters of text. Shoppers can't buy what they can't read about, and Google has nothing to rank.` });
    if (single.length >= Math.max(3, products.length * 0.3)) findings.push({ k: 'photos', sev: 'low', title: `${single.length} of ${products.length} products sell on a single photo`, body: `"${single[0].title.slice(0, 50)}" and ${single.length - 1} others have one image. Two or three angles is the difference between "looks nice" and "I can picture it".` });
  }
  const order = { high: 0, medium: 1, low: 2 };
  findings.sort((a, b) => order[a.sev] - order[b.sev]);
  if (!findings.length) return { skip: 'nothing to say' };
  const top = findings[0];
  const finding = top.k === 'speed' ? `${pt ? `your ${pt} page` : 'your product page'} takes ${(psiRes.lcp / 1000).toFixed(1)} seconds to show its image on a phone (Google's line is 4).`
    : top.k === 'tracking' ? `there's no Meta pixel and no Google Analytics on the store, so nothing records who visits or where they leave.`
    : top.k === 'pixel' ? `there's no Meta pixel on the store, so Facebook and Instagram ads can't learn who your buyers are.`
    : top.k === 'reviews' ? `none of your ${products.length}${products.length === 50 ? '+' : ''} products show a single customer review.`
    : top.k === 'reviews_hidden' ? `your reviews app is installed but no reviews actually show on the ${pt} page.`
    : top.k === 'email' ? `there's no way to capture an email from visitors who don't buy, so every paid click gets one shot.`
    : `${top.title.charAt(0).toLowerCase()}${top.title.slice(1)}.`;
  return { host, name, findings, finding, psiRes, products: products.length, currency, pdpUrl };
}

const rows = (await c.query(`select id, email, "storeName", domain, "websiteUrl" from prospects where tier = any($1) and "verifyStatus" = any($3) and "scanStatus" = 'pending' order by tier, score desc nulls last limit $2`, [tiers, limit, (args.status || 'valid,risky').split(',')])).rows;
console.log(`scanning ${rows.length} prospects (${conc} at a time, PSI ${PSI ? 'on' : 'OFF'})`);
const stats = { scanned: 0, skipped: 0, failed: 0 };
const q = [...rows]; let n = 0;
await Promise.all(Array.from({ length: conc }, async () => {
  while (q.length) {
    const p = q.shift();
    let r;
    try { r = await scan(p); } catch (e) { r = { fail: e.message }; }
    if (r.skip) { stats.skipped++; await c.query(`update prospects set "scanStatus"='skipped', "updatedAt"=now() where id=$1`, [p.id]); }
    else if (r.fail) { stats.failed++; await c.query(`update prospects set "scanStatus"='failed', "updatedAt"=now() where id=$1`, [p.id]); }
    else {
      const token = randomBytes(18).toString('base64url');
      const runStamp = `cold-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}`;
      const findingsJson = {
        opener: `Ran ${r.name} through our store check-up the way a phone shopper sees it. ${r.findings.length} things stood out; the first two are open below, the rest unlock when we talk.`,
        findings: r.findings.map((f) => ({ title: f.title, merchant_copy: f.body, severity: f.sev, effort: f.k === 'speed' ? 'M' : 'S' })),
        speed: r.psiRes ? { pages: [{ label: 'Product page', score: r.psiRes.score, lcpMs: Math.round(r.psiRes.lcp) }], wins: [] } : null,
        brand: {}, screenshots: [], source: 'tier1-scan',
      };
      const rep = await c.query(`insert into storeproof_reports (id, host, "runStamp", "storeName", html, "findingsJson", "publicToken", status, "updatedAt") values ($1,$2,$3,$4,'',$5,$6,'published',now()) on conflict (host, "runStamp") do update set "findingsJson"=excluded."findingsJson", "storeName"=excluded."storeName", "updatedAt"=now() returning id, "publicToken"`, ['sp_' + randomBytes(10).toString('hex'), r.host, runStamp, r.name, JSON.stringify(findingsJson), token]);
      await c.query(`update prospects set "scanStatus"='scanned', finding=$2, "issueCount"=$3, "reportId"=$4, "storeName"=coalesce("storeName",$5), "updatedAt"=now() where id=$1`, [p.id, r.finding, r.findings.length, rep.rows[0].id, r.name]);
      stats.scanned++;
    }
    if (++n % 10 === 0) console.log(n, stats);
  }
}));
console.log('done', stats);
await c.end();
