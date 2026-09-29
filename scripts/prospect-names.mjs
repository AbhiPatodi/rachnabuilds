// Real brand names for scanned prospects (Vela only has the myshopify handle).
// One fetch per store: og:site_name → <title> (minus " – Shopify"-style suffixes).
import pg from 'pg';
const c = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 3, connectionTimeoutMillis: 40000 });
const rows = (await c.query(`select id, domain, "storeName" from prospects where "scanStatus"='scanned' and ("storeName" is null or "storeName" = replace(replace(split_part(domain,'.',1),'-',' '),'_',' ') or "storeName" ~ '^[a-z0-9 ]+$')`)).rows;
console.log('naming', rows.length);
const clean = (t) => t.replace(/\s+/g, ' ').split(/\s[|–—-]\s/)[0].replace(/\s*(–|-|\|)?\s*(Shopify|Online Store|Home|Official( Site| Store)?)\s*$/i, '').trim();
let done = 0, named = 0; const q = [...rows];
await Promise.all(Array.from({ length: 6 }, async () => { while (q.length) { const r = q.shift(); try {
  const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), 12000);
  const res = await fetch(`https://${r.domain}`, { redirect: 'follow', signal: ctl.signal, headers: { 'user-agent': 'Mozilla/5.0' } }); clearTimeout(t);
  const html = (await res.text()).slice(0, 200000);
  const site = (html.match(/property="og:site_name"\s+content="([^"]+)"/i) || html.match(/content="([^"]+)"\s+property="og:site_name"/i) || [])[1];
  const title = (html.match(/<title[^>]*>([^<]{2,120})<\/title>/i) || [])[1];
  let name = site || (title ? clean(title) : null);
  if (name && name.length >= 2 && name.length <= 48 && !/^(home|welcome|shop)$/i.test(name)) { await c.query(`update prospects set "storeName"=$2, "websiteUrl"=$3, "updatedAt"=now() where id=$1`, [r.id, name.trim(), `https://${new URL(res.url).host}`]); named++; }
} catch { /* leave as is */ } if (++done % 100 === 0) console.log(done, named); } }));
console.log('done', { done, named });
await c.end();
