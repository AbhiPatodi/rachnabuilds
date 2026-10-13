// Verify the two cold-email findings that have never been checked against live
// stores: "no reviews anywhere" and "no email capture".
//
// Same bug class as the pixel check (see feedback_storeproof-checker-false-positives):
// prospect-scan.mjs looks for a short list of THIRD-PARTY app names in the HTML.
// It therefore cannot see:
//   • reviews that come from Shopify's own rating metafields or a theme's native
//     star block, or from an app outside its list (Fera, Vitals, Rivo, Growave,
//     Air, Trustoo, Lai, Shopify Product Reviews …)
//   • AggregateRating in JSON-LD, which is proof a product carries reviews
//   • the newsletter signup built into virtually every Shopify theme
//     (form_type="customer", customer[email]), or Shopify Forms / Shopify Email
//
// Telling a merchant "no reviews" or "no way to follow up" when the page plainly
// shows stars or a signup box is the fastest way to lose the reply.
//
//   node --env-file=.env.local scripts/recheck-reviews-email.mjs [--limit=20] [--apply]
import pg from 'pg';

const args = Object.fromEntries(process.argv.slice(2).map((a) => {
  const [k, v] = a.replace(/^--/, '').split('='); return [k, v ?? true];
}));
const LIMIT = Number(args.limit || 20);
const CONC = Number(args.concurrency || 6);
const APPLY = !!args.apply;

const UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';
const c = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 4, connectionTimeoutMillis: 40000 });

async function get(url, ms = 20000) {
  const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), ms);
  try {
    const r = await fetch(url, { headers: { 'user-agent': UA, accept: 'text/html,application/json' }, redirect: 'follow', signal: ctl.signal });
    return { ok: r.ok, status: r.status, url: r.url, text: await r.text() };
  } catch { return { ok: false, status: 0, url, text: '' }; }
  finally { clearTimeout(t); }
}

// ── what prospect-scan.mjs currently looks for (the claim under test)
const OLD_REVIEWS = /judge\.me|loox|yotpo|okendo|stamped|reviews\.io|junip|rivyo|opinew|ali-?reviews|trustpilot/i;
const OLD_EMAIL = /klaviyo|omnisend|mailchimp|privy|attentive|postscript|justuno|wisepops|optimonk/i;

// ── everything that actually counts as reviews being present
const REVIEW_APPS = /judge\.?me|jdgm|loox|yotpo|okendo|oke-?reviews|stamped|reviews\.io|junip|rivyo|opinew|ali-?reviews|trustpilot|fera\.ai|\bfera\b|vitals\.co|rivo\.io|growave|ssw-|air-?reviews|trustoo|lai-?reviews|shopify-product-reviews|spr-badge|spr-review|product-reviews|judgeme_product/i;
// Shopify's own rating metafields + common theme star blocks.
const REVIEW_NATIVE = /metafields\.reviews|reviews\.rating|"rating_count"|rating-star|star-rating|shopify-block-reviews|product-rating/i;
// JSON-LD proof: a product carrying an aggregate rating has real reviews.
const REVIEW_JSONLD = /"aggregateRating"|"reviewCount"|"ratingValue"/i;

// ── everything that actually counts as email capture being present
const EMAIL_APPS = /klaviyo|omnisend|mailchimp|privy|attentive|postscript|justuno|wisepops|optimonk|seguno|smsbump|yotpo-sms|drip\.com|sendlane|mailerlite|getresponse|activecampaign|shopify-forms|shopify_forms/i;
// The newsletter box built into almost every Shopify theme.
const EMAIL_NATIVE = /form_type=["']customer["']|customer\[email\]|name=["']contact\[email\]["']|newsletter-form|footer__newsletter|\/contact#contact_form/i;

const sig = (re, ...hs) => hs.some((h) => re.test(h));

async function check(p) {
  const base = (p.websiteUrl || `https://${p.domain}`).replace(/\/$/, '');
  const home = await get(base + '/');
  if (!home.ok || !home.text) return { err: `unreachable (${home.status})` };
  let pdp = '';
  try {
    const pj = await get(`${base}/products.json?limit=1`, 12000);
    const handle = JSON.parse(pj.text)?.products?.[0]?.handle;
    if (handle) pdp = (await get(`${base}/products/${handle}`, 20000)).text || '';
  } catch { /* PDP is a bonus signal */ }

  const H = home.text, P = pdp;
  return {
    // what the scan believed
    oldReviews: sig(OLD_REVIEWS, H, P),
    oldEmail: sig(OLD_EMAIL, H, P),
    // what is really there
    reviewApp: sig(REVIEW_APPS, H, P),
    reviewNative: sig(REVIEW_NATIVE, H, P),
    reviewJsonld: sig(REVIEW_JSONLD, P) || sig(REVIEW_JSONLD, H),
    emailApp: sig(EMAIL_APPS, H, P),
    emailNative: sig(EMAIL_NATIVE, H, P),
  };
}

const main = async () => {
  const { rows } = await c.query(`
    SELECT p.id, p.domain, p."websiteUrl", p."storeName", p.finding, p."reportId", r."findingsJson"
    FROM prospects p JOIN storeproof_reports r ON r.id = p."reportId"
    WHERE p."verifyStatus"='valid' AND p."scanStatus"='scanned'
      AND (r."findingsJson" ILIKE '%customer reviews anywhere%' OR r."findingsJson" ILIKE '%no way to bring them back%')
    ORDER BY p.email LIMIT $1`, [LIMIT]);

  console.log(`${rows.length} prospects carrying a reviews or email finding — verifying against live stores\n`);
  const stat = { checked: 0, dead: 0, revClaims: 0, revFalse: 0, emailClaims: 0, emailFalse: 0, openers: 0 };
  const changes = [];
  let i = 0;
  await Promise.all(Array.from({ length: CONC }, async () => {
    while (i < rows.length) {
      const p = rows[i++];
      const res = await check(p);
      stat.checked++;
      if (res.err) { stat.dead++; console.log(`  ?? ${p.domain} — ${res.err}`); continue; }
      const titles = (() => { try { return (JSON.parse(p.findingsJson).findings || []).map((f) => f.title); } catch { return []; } })();
      const claimsNoReviews = titles.some((t) => /customer reviews anywhere/i.test(t));
      const claimsNoEmail = titles.some((t) => /no way to bring them back/i.test(t));

      const reviewsReallyPresent = res.reviewApp || res.reviewNative || res.reviewJsonld;
      const emailReallyPresent = res.emailApp || res.emailNative;

      let dropRev = false, dropEmail = false;
      if (claimsNoReviews) {
        stat.revClaims++;
        if (reviewsReallyPresent) {
          stat.revFalse++; dropRev = true;
          const why = [res.reviewApp && 'app', res.reviewNative && 'theme stars', res.reviewJsonld && 'JSON-LD rating'].filter(Boolean).join(' + ');
          console.log(`  ✗ REVIEWS wrong — ${p.storeName || p.domain} (${why})`);
        }
      }
      if (claimsNoEmail) {
        stat.emailClaims++;
        if (emailReallyPresent) {
          stat.emailFalse++; dropEmail = true;
          const why = [res.emailApp && 'app', res.emailNative && 'theme newsletter form'].filter(Boolean).join(' + ');
          console.log(`  ✗ EMAIL wrong — ${p.storeName || p.domain} (${why})`);
        }
      }
      if (dropRev || dropEmail) {
        const report = JSON.parse(p.findingsJson);
        const keep = (report.findings || []).filter((f) => {
          if (dropRev && /customer reviews anywhere/i.test(f.title)) return false;
          if (dropEmail && /no way to bring them back/i.test(f.title)) return false;
          return true;
        });
        const n = keep.length;
        report.findings = keep;
        report.opener = (report.opener || '').replace(/(\d+)\s+things stood out/i, `${n} thing${n === 1 ? '' : 's'} stood out`);
        // The email opener may quote the finding we just deleted.
        const openerDead = (dropRev && /customer review/i.test(p.finding || ''))
          || (dropEmail && /capture an email|bring them back/i.test(p.finding || ''));
        const newOpener = openerDead
          ? (n ? `${keep[0].title.charAt(0).toLowerCase()}${keep[0].title.slice(1)}.` : null)
          : p.finding;
        if (openerDead) stat.openers++;
        changes.push({ id: p.id, reportId: p.reportId, left: n, newOpener, json: JSON.stringify(report) });
      }
    }
  }));

  if (APPLY && changes.length) {
    console.log(`\nWriting ${changes.length} corrections…`);
    for (const ch of changes) {
      await c.query('UPDATE storeproof_reports SET "findingsJson"=$1, "updatedAt"=now() WHERE id=$2', [ch.json, ch.reportId]);
      await c.query('UPDATE prospects SET "issueCount"=$1, finding=$2, "updatedAt"=now() WHERE id=$3', [ch.left, ch.newOpener, ch.id]);
    }
    console.log('done.');
  }

  const pc = (a, b) => (b ? Math.round((a / b) * 100) : 0);
  console.log(`\n── verdict ──
  stores checked        ${stat.checked} (${stat.dead} unreachable)
  "no reviews" claims   ${stat.revClaims} → ${stat.revFalse} FALSE (${pc(stat.revFalse, stat.revClaims)}%)
  "no email" claims     ${stat.emailClaims} → ${stat.emailFalse} FALSE (${pc(stat.emailFalse, stat.emailClaims)}%)
  email openers rewritten ${stat.openers}
  reports to correct    ${changes.length}`);
  if (!APPLY) console.log('\n(dry run — re-run with --apply to write)');
  await c.end();
};

main().catch((e) => { console.error(e); process.exit(1); });
