// Verify prospect emails with Instantly's built-in verifier (0.25 credit each,
// included in the Growth plan). Submit, then poll until every result is in.
//   INSTANTLY_API_KEY=… node --env-file=.env.local scripts/verify-prospects-instantly.mjs [--tiers=A+,A] [--limit=50] [--poll-only]
// verified → valid · invalid → invalid · catch-all/unknown → risky (sendable, watch bounces)
import pg from 'pg';

const args = Object.fromEntries(process.argv.slice(2).map((a) => { const [k, v] = a.replace(/^--/, '').split('='); return [k, v ?? true]; }));
const tiers = (args.tiers || 'A+,A').split(',');
const limit = Number(args.limit || 5000);
const KEY = process.env.INSTANTLY_API_KEY; if (!KEY) { console.error('INSTANTLY_API_KEY missing'); process.exit(1); }
const BASE = 'https://api.instantly.ai/api/v2';
const api = async (path, init = {}) => { const r = await fetch(BASE + path, { ...init, headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' } }); const t = await r.text(); if (!r.ok) throw new Error(`${path} ${r.status} ${t.slice(0, 200)}`); return t ? JSON.parse(t) : null; };
const c = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 3, connectionTimeoutMillis: 40000 });

const map = (r) => {
  const s = String(r.verification_status || '').toLowerCase();
  if (s === 'verified' || s === 'valid') return r.catch_all === true ? 'risky' : 'valid';
  if (s === 'invalid' || s === 'undeliverable' || s === 'disposable') return 'invalid';
  if (s === 'pending') return null;
  return 'risky'; // catch_all / unknown / accept_all / risky
};

// 1. submit
let submitted = 0; const stats = {};
if (!args['poll-only']) {
  const rows = (await c.query(`select id, email from prospects where tier = any($1) and "verifyStatus" = 'unverified' order by tier, score desc nulls last limit $2`, [tiers, limit])).rows;
  console.log(`submitting ${rows.length} for verification (${rows.length * 0.25} credits)`);
  const q = [...rows]; let credits = null;
  // Gentle, sequential: a burst of parallel submits got charged but dropped by Instantly (29 Sep).
  // The POST usually returns the result straight away; only true 'pending' ones get polled.
  await Promise.all(Array.from({ length: 2 }, async () => { while (q.length) { const r = q.shift(); try {
    const j = await api('/email-verification', { method: 'POST', body: JSON.stringify({ email: r.email }) });
    credits = j.credits ?? credits;
    const st = map(j);
    await c.query(`update prospects set "verifyStatus" = $2, "updatedAt" = now() where id = $1`, [r.id, st || 'checking']);
    if (st) stats[`${j.verification_status}${j.catch_all === true ? '+catchall' : ''}`] = (stats[`${j.verification_status}${j.catch_all === true ? '+catchall' : ''}`] || 0) + 1;
    submitted++;
    if (credits != null && credits < 1) { console.log('out of credits, stopping'); q.length = 0; }
  } catch (e) { console.warn('submit failed', r.email, e.message.slice(0, 80)); } } }));
  console.log('submitted', submitted, 'credits left', credits);
}

// 2. poll the ones that came back 'pending'
for (let round = 0; round < 40; round++) {
  const pending = (await c.query(`select id, email from prospects where tier = any($1) and "verifyStatus" = 'checking' limit 2000`, [tiers])).rows;
  if (!pending.length) break;
  let resolved = 0; const q = [...pending];
  await Promise.all(Array.from({ length: 8 }, async () => { while (q.length) { const r = q.shift(); try { const j = await api(`/email-verification/${encodeURIComponent(r.email)}`); const st = map(j); if (st) { await c.query(`update prospects set "verifyStatus" = $2, "updatedAt" = now() where id = $1`, [r.id, st]); stats[`${j.verification_status}${j.catch_all === true ? '+catchall' : ''}`] = (stats[`${j.verification_status}${j.catch_all === true ? '+catchall' : ''}`] || 0) + 1; resolved++; } } catch (e) { /* retry next round */ } } }));
  console.log(`round ${round + 1}: resolved ${resolved}, still pending ${pending.length - resolved}`, stats);
  if (resolved === 0 && round >= 3) { console.log('no progress; leaving the rest as checking — rerun with --poll-only later'); break; }
  if (pending.length - resolved > 0) await new Promise((res) => setTimeout(res, 20000));
}
console.log('done', stats);
await c.end();
