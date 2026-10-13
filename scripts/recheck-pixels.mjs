// Re-check the tracking findings on already-scanned cold-email prospects.
//
// WHY: scripts/prospect-scan.mjs detected the Meta pixel by looking for
// fbevents.js / fbq( only. Stores that install the pixel through Shopify's
// official Meta channel keep it in the Web Pixels sandbox, which emits neither
// marker — so healthy, fully-tracking stores were written up as "No Meta pixel".
// Three of three sampled prospects were wrong that way. Those findings cannot be
// emailed: the merchant opens Shopify, sees the Meta app connected, and we are
// finished before the first call.
//
// This re-fetches each store, re-tests tracking with the corrected detection,
// drops any tracking finding that is now disproved, and rewrites issueCount, the
// report opener and the email opener line to match what is left.
//
//   node --env-file=.env.local scripts/recheck-pixels.mjs            # dry run
//   node --env-file=.env.local scripts/recheck-pixels.mjs --apply    # write
import pg from 'pg';

const args = Object.fromEntries(process.argv.slice(2).map((a) => {
  const [k, v] = a.replace(/^--/, '').split('='); return [k, v ?? true];
}));
const APPLY = !!args.apply;
const CONC = Number(args.concurrency || 6);
const LIMIT = Number(args.limit || 0);

const UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';
const c = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 4, connectionTimeoutMillis: 40000 });

async function get(url, ms = 20000) {
  const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), ms);
  try {
    const r = await fetch(url, { headers: { 'user-agent': UA, accept: 'text/html,application/json' }, redirect: 'follow', signal: ctl.signal });
    return { ok: r.ok, status: r.status, url: r.url, text: await r.text() };
  } catch (e) { return { ok: false, status: 0, url, text: '', err: e.message }; }
  finally { clearTimeout(t); }
}

// Same expressions as the corrected scripts/prospect-scan.mjs. Keep in sync.
const META_RE = /connect\.facebook\.net\/[^"']*fbevents\.js|fbq\(|facebook_pixel|facebookCapiEnabled\\?"\s*:\s*\\?"?true/;
const GA_RE = /gtag\/js\?id=G-|googletagmanager\.com\/gtm\.js|G-[A-Z0-9]{6,}|google_analytics|"pixel_type\\?":\\?"google/;

const TRACKING_TITLE = /no meta pixel|no google analytics|meta pixel|google analytics/i;

function pixelIds(html) {
  const out = new Set();
  for (const b of html.match(/\{[^{}]*pixel_id[^{}]*\}/g) ?? []) {
    if (/facebook_pixel/i.test(b)) {
      const id = b.match(/pixel_id\\?"\s*:\s*\\?"(\d{6,20})/)?.[1];
      if (id) out.add(id);
    }
  }
  for (const m of html.matchAll(/fbq\(\s*['"]init['"]\s*,\s*['"](\d{6,20})['"]/g)) out.add(m[1]);
  return [...out];
}

async function checkStore(p) {
  const base = (p.websiteUrl || `https://${p.domain}`).replace(/\/$/, '');
  const home = await get(base + '/');
  if (!home.ok || !home.text) return { err: `unreachable (${home.status})` };
  // Products page too: some themes only inject tags on the PDP.
  let pdpHtml = '';
  try {
    const pj = await get(`${base}/products.json?limit=1`, 12000);
    const handle = JSON.parse(pj.text)?.products?.[0]?.handle;
    if (handle) pdpHtml = (await get(`${base}/products/${handle}`, 20000)).text || '';
  } catch { /* PDP is a bonus signal, not required */ }

  const H = home.text, P = pdpHtml;
  const meta = META_RE.test(H) || META_RE.test(P);
  const ga = GA_RE.test(H) || GA_RE.test(P);
  return { meta, ga, ids: pixelIds(H + P), finalUrl: home.url };
}

function rebuild(report, keep) {
  const j = { ...report, findings: keep };
  const n = keep.length;
  j.opener = (report.opener || '').replace(
    /(\d+)\s+things stood out/i,
    `${n} thing${n === 1 ? '' : 's'} stood out`,
  );
  return j;
}

const main = async () => {
  const { rows } = await c.query(`
    SELECT p.id, p.email, p.domain, p."websiteUrl", p."storeName", p."issueCount",
           p.finding, p."reportId", r."findingsJson"
    FROM prospects p JOIN storeproof_reports r ON r.id = p."reportId"
    WHERE p."verifyStatus"='valid' AND p."scanStatus"='scanned'
    ORDER BY p.email ${LIMIT ? `LIMIT ${LIMIT}` : ''}`);

  console.log(`${rows.length} scanned prospects to re-check — ${APPLY ? 'APPLY (writing)' : 'DRY RUN'}\n`);

  const stats = { checked: 0, unreachable: 0, falsePixel: 0, confirmedMissing: 0,
                  findingsRemoved: 0, openerRewritten: 0, nowBelow3: 0, nowZero: 0 };
  const changes = [];

  let i = 0;
  await Promise.all(Array.from({ length: CONC }, async () => {
    while (i < rows.length) {
      const p = rows[i++];
      const res = await checkStore(p);
      stats.checked++;
      if (res.err) { stats.unreachable++; console.log(`  ?? ${p.domain} — ${res.err}`); continue; }

      let report;
      try { report = JSON.parse(p.findingsJson); } catch { continue; }
      const findings = report.findings ?? [];
      const tracking = findings.filter(f => TRACKING_TITLE.test(f.title || ''));
      if (!tracking.length) continue;

      // A tracking finding claims something is ABSENT. It survives only if the
      // live store still shows it absent.
      const keep = findings.filter(f => {
        if (!TRACKING_TITLE.test(f.title || '')) return true;
        const claimsMeta = /no meta pixel/i.test(f.title);
        const claimsGa = /no google analytics/i.test(f.title);
        if (claimsMeta && claimsGa) return !res.meta && !res.ga;
        if (claimsMeta) return !res.meta;
        if (claimsGa) return !res.ga;
        return true;
      });

      const removed = findings.length - keep.length;
      if (!removed) { stats.confirmedMissing++; continue; }

      stats.falsePixel++;
      stats.findingsRemoved += removed;
      if (keep.length < 3) stats.nowBelow3++;
      if (keep.length === 0) stats.nowZero++;

      // The email opener may quote the finding we just deleted.
      const openerWasTracking = /meta pixel|google analytics/i.test(p.finding || '');
      let newOpener = p.finding;
      if (openerWasTracking) {
        stats.openerRewritten++;
        newOpener = keep.length
          ? `${keep[0].title.charAt(0).toLowerCase()}${keep[0].title.slice(1)}.`
          : null;
      }

      changes.push({ id: p.id, reportId: p.reportId, store: p.storeName, domain: p.domain,
                     removed, left: keep.length, ids: res.ids, newOpener,
                     json: JSON.stringify(rebuild(report, keep)) });
      console.log(`  ✗ ${p.storeName || p.domain} — pixel IS live${res.ids.length ? ` (${res.ids.join(', ')})` : ''}; dropped ${removed}, ${keep.length} left`);
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

  console.log(`\n── summary ──
  checked              ${stats.checked}
  unreachable          ${stats.unreachable}
  FALSE "no pixel"     ${stats.falsePixel}   ← would have been sent as fact
  genuinely missing    ${stats.confirmedMissing}
  findings removed     ${stats.findingsRemoved}
  email openers rewritten ${stats.openerRewritten}
  now under 3 findings ${stats.nowBelow3}
  now zero findings    ${stats.nowZero}`);
  if (!APPLY) console.log('\n(dry run — re-run with --apply to write)');
  await c.end();
};

main().catch(e => { console.error(e); process.exit(1); });
