// Verify prospect emails with MillionVerifier (1 credit each) and store the result.
//   MILLIONVERIFIER_API_KEY=... node --env-file=.env.local scripts/verify-prospects.mjs [--tiers=A+,A] [--limit=500] [--dry]
// Results: ok → valid, catch_all → risky (sendable, watch bounces), unknown → risky, invalid/disposable → invalid
import pg from 'pg';

const args = Object.fromEntries(process.argv.slice(2).map((a) => { const [k, v] = a.replace(/^--/, '').split('='); return [k, v ?? true]; }));
const tiers = (args.tiers || 'A+,A').split(',');
const limit = Number(args.limit || 5000);
const dry = !!args.dry;
const KEY = process.env.MILLIONVERIFIER_API_KEY;
if (!KEY && !dry) { console.error('MILLIONVERIFIER_API_KEY missing (add it to .env.local)'); process.exit(1); }

const c = new pg.Client({ connectionString: process.env.DATABASE_URL }); await c.connect();
const rows = (await c.query(`select id, email from prospects where tier = any($1) and "verifyStatus" = 'unverified' order by tier, score desc nulls last limit $2`, [tiers, limit])).rows;
console.log(`verifying ${rows.length} (${dry ? 'DRY RUN' : 'live'})`);
if (dry) { await c.end(); process.exit(0); }

const map = (r) => r === 'ok' ? 'valid' : (r === 'catch_all' || r === 'unknown') ? 'risky' : 'invalid';
const stats = {};
let i = 0;
const q = [...rows];
await Promise.all(Array.from({ length: 6 }, async () => {
  while (q.length) {
    const r = q.shift();
    try {
      const res = await fetch(`https://api.millionverifier.com/api/v3/?api=${KEY}&email=${encodeURIComponent(r.email)}&timeout=20`);
      const j = await res.json();
      const result = j.result || 'unknown'; // ok | catch_all | unknown | invalid | disposable
      const status = map(result);
      stats[result] = (stats[result] || 0) + 1;
      await c.query(`update prospects set "verifyStatus" = $2, "updatedAt" = now() where id = $1`, [r.id, status]);
    } catch (e) {
      stats.error = (stats.error || 0) + 1;
    }
    if (++i % 100 === 0) console.log(i, stats);
  }
}));
console.log('done', stats);
await c.end();
