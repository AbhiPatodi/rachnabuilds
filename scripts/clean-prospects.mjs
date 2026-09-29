// Free pre-verification pass over prospects: repair scraper damage, drop junk
// domains, and mark addresses whose domain has no mail server as invalid.
//   node --env-file=.env.local scripts/clean-prospects.mjs [--tiers=A+,A] [--mx]
import pg from 'pg';
import dns from 'dns/promises';

const args = Object.fromEntries(process.argv.slice(2).map((a) => { const [k, v] = a.replace(/^--/, '').split('='); return [k, v ?? true]; }));
const tiers = (args.tiers || 'A+,A').split(',');
const doMx = !!args.mx;

const TLDS = 'com|net|org|co|io|ai|au|ca|uk|in|de|fr|nl|es|it|se|no|dk|fi|ie|nz|sg|ae|za|ch|at|be|pl|pt|br|mx|jp|kr|hk|shop|store|app|info|biz|me|us|eu|xyz|online|site|life|world|ltd|inc|studio|design|club|art|boutique|beauty|health|fit|pet|dog|baby|kids|toys|jewelry|coffee|tea|wine|bar|cafe|kitchen|home|house|garden|photo|photography|media|agency|digital|tech|systems|solutions|services|group|company|global|international|london|nyc|la|paris|tokyo|asia|africa|ph|my|id|th|vn|tw|cn|ru|ua|tr|il|gr|cz|hu|ro|bg|sk|si|hr|rs|lt|lv|ee|lu|is|mt|cy';
const TAIL = new RegExp(`^(.*?\\.(?:${TLDS}))(?:[a-z]{2,20})$`);
const RE = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/;
const JUNK = /(^|\.)(example\.com|sentry\.io|wixpress\.com|shopify\.com|myshopify\.com|domain\.com|email\.com|yourdomain\.com|test\.com|company\.com|zipify\.com|klaviyo\.com|judge\.me|gorgias\.com|shopifysvc\.com)$|\.(png|jpe?g|gif|webp|heic|svg|js|css|pdf)$/i;

function fix(raw) {
  let e = String(raw).trim();
  try { e = decodeURIComponent(e); } catch { /* keep */ }
  e = e.replace(/<[^>]+>/g, ' ').replace(/^(mailto:|e-?mail\s*:?\s*|\/\/|:)+/i, '');
  const m = e.match(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i);
  if (!m) return null;
  let [local, dom] = m[0].toLowerCase().split('@');
  local = local.replace(/^[._-]+/, '');
  // "gmail.comfacebook", "futuresfins.com.auwe": chop the scraper tail after a real TLD
  const t = dom.match(TAIL); if (t) dom = t[1];
  const out = `${local}@${dom}`;
  return RE.test(out) ? out : null;
}

const c = new pg.Client({ connectionString: process.env.DATABASE_URL }); await c.connect();
const rows = (await c.query(`select id, email, "verifyStatus" from prospects where tier = any($1)`, [tiers])).rows;
const stats = { total: rows.length, repaired: 0, unfixable: 0, junk: 0, noMx: 0, dupes: 0 };
const seen = new Map();
const updates = []; // [id, email, status]
for (const r of rows) {
  const f = fix(r.email);
  if (!f) { stats.unfixable++; updates.push([r.id, r.email, 'invalid']); continue; }
  if (JUNK.test(f.split('@')[1])) { stats.junk++; updates.push([r.id, f, 'invalid']); continue; }
  if (seen.has(f)) { stats.dupes++; updates.push([r.id, f, 'duplicate']); continue; }
  seen.set(f, r.id);
  if (f !== r.email) stats.repaired++;
  updates.push([r.id, f, r.verifyStatus === 'unverified' ? 'unverified' : r.verifyStatus]);
}
if (doMx) {
  const doms = [...new Set(updates.filter((u) => u[2] === 'unverified').map((u) => u[1].split('@')[1]))];
  const bad = new Set();
  const q = [...doms];
  await Promise.all(Array.from({ length: 40 }, async () => { while (q.length) { const d = q.shift(); try { const mx = await dns.resolveMx(d); if (!mx.length) bad.add(d); } catch { bad.add(d); } } }));
  for (const u of updates) if (u[2] === 'unverified' && bad.has(u[1].split('@')[1])) { u[2] = 'invalid'; stats.noMx++; }
}
// unique constraint on email? update carefully: only change email when it differs
let changed = 0;
for (const [id, email, status] of updates) {
  const r = await c.query(`update prospects set email = $2, "verifyStatus" = $3, "updatedAt" = now() where id = $1 and (email <> $2 or "verifyStatus" <> $3)`, [id, email, status]).catch((e) => ({ rowCount: 0, err: e.message }));
  if (r.err) { console.warn('skip', email, r.err.slice(0, 60)); continue; }
  changed += r.rowCount;
}
console.log({ tiers, ...stats, rowsUpdated: changed, sendable: updates.filter((u) => u[2] === 'unverified' || u[2] === 'valid').length });
await c.end();
