// Create the Instantly campaign (PAUSED) from docs/cold-email-sequence.md and
// load scanned + verified prospects into it with their custom variables.
//   node --env-file=.env.local scripts/build-campaign.mjs --name="RB Shopify CRO · Oct 2026" [--limit=1000] [--dry]
//   node --env-file=.env.local scripts/build-campaign.mjs --campaign=<id> --add-only [--limit=500]
import pg from 'pg';
import fs from 'fs';

const args = Object.fromEntries(process.argv.slice(2).map((a) => { const [k, v] = a.replace(/^--/, '').split('='); return [k, v ?? true]; }));
const KEY = process.env.INSTANTLY_API_KEY; if (!KEY) { console.error('INSTANTLY_API_KEY missing'); process.exit(1); }
const BASE = 'https://api.instantly.ai/api/v2';
const api = async (path, init = {}) => { const r = await fetch(BASE + path, { ...init, headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' } }); const t = await r.text(); if (!r.ok) throw new Error(`${path} ${r.status} ${t.slice(0, 300)}`); return t ? JSON.parse(t) : null; };
const dry = !!args.dry;

// Parse the sequence file: "## Email N · Day D · … subject: `…`" then body until next "---"
const md = fs.readFileSync(new URL('../docs/cold-email-sequence.md', import.meta.url), 'utf8');
const steps = [...md.matchAll(/## Email \d+ · Day (\d+)[^\n]*subject: `([^`]+)`\n\n([\s\S]*?)\n---/g)].map((m) => ({ delay: Number(m[1]), subject: m[2], body: m[3].trim() }));
if (steps.length !== 3) { console.error('expected 3 emails in docs/cold-email-sequence.md, got', steps.length); process.exit(1); }
// Instantly uses {{firstName}} etc. natively; our custom vars keep the same names.
const toInstantly = (s) => s.replace(/\{\{storeName\}\}/g, '{{storeName}}').replace(/\{\{finding\}\}/g, '{{finding}}').replace(/\{\{reportUrl\}\}/g, '{{reportUrl}}').replace(/\n/g, '<br>');

let campaignId = args.campaign;
if (!campaignId) {
  const accounts = (await api('/accounts?limit=100')).items.map((a) => a.email);
  const body = {
    name: args.name || `RB Shopify CRO · ${new Date().toLocaleString('en-US', { month: 'short', year: 'numeric' })}`,
    campaign_schedule: { schedules: [{ name: 'US business hours', timing: { from: '09:00', to: '17:00' }, days: { 1: true, 2: true, 3: true, 4: true, 5: true }, timezone: 'America/New_York' }] },
    sequences: [{ steps: steps.map((s, i) => ({ type: 'email', delay: i === 0 ? 0 : s.delay - steps[i - 1].delay, variants: [{ subject: s.subject, body: toInstantly(s.body) }] })) }],
    email_list: accounts,
    daily_limit: 25 * Math.max(1, accounts.length),
    email_gap: 10,
    random_wait_max: 8,
    stop_on_reply: true,
    stop_on_auto_reply: false,
    link_tracking: false,
    open_tracking: false,
    text_only: true,
    insert_unsubscribe_header: true,
    stop_for_company: true,
    prioritize_new_leads: false,
  };
  console.log('creating campaign', body.name, 'accounts', accounts.length, 'daily', body.daily_limit, dry ? '(dry)' : '');
  if (dry) { console.log(JSON.stringify(steps.map((s) => ({ delay: s.delay, subject: s.subject, chars: s.body.length })), null, 1)); process.exit(0); }
  const created = await api('/campaigns', { method: 'POST', body: JSON.stringify(body) });
  campaignId = created.id;
  console.log('campaign', campaignId, '(status draft/paused — activate in Instantly when ready)');
}

// Leads: verified + scanned, not yet queued
const c = new pg.Client({ connectionString: process.env.DATABASE_URL }); await c.connect();
const rows = (await c.query(`select p.id, p.email, p.name, p."storeName", p.domain, p."websiteUrl", p.finding, r."publicToken" from prospects p left join storeproof_reports r on r.id = p."reportId" where p.tier in ('A+','A') and p."verifyStatus" in ('valid','risky') and p."scanStatus"='scanned' and p.stage='new' and p.finding is not null order by p."verifyStatus" asc, p.score desc nulls last limit $1`, [Number(args.limit || 1000)])).rows;
console.log('adding', rows.length, 'leads', dry ? '(dry)' : '');
let added = 0, failed = 0;
const q = [...rows];
await Promise.all(Array.from({ length: 4 }, async () => {
  while (q.length) {
    const p = q.shift();
    const first = (p.name || '').split(' ')[0] || '';
    const lead = { campaign: campaignId, email: p.email, first_name: first, company_name: p.storeName || p.domain || '', website: p.websiteUrl || (p.domain ? `https://${p.domain}` : ''),
      custom_variables: { storeName: p.storeName || p.domain || 'your store', finding: p.finding, reportUrl: p.publicToken ? `https://rachnabuilds.com/report/${p.publicToken}` : '' },
      skip_if_in_workspace: true, skip_if_in_campaign: true };
    if (dry) { added++; continue; }
    try { await api('/leads', { method: 'POST', body: JSON.stringify(lead) }); await c.query(`update prospects set stage='queued', "updatedAt"=now() where id=$1`, [p.id]); added++; }
    catch (e) { failed++; if (failed < 5) console.warn('lead failed', p.email, e.message.slice(0, 120)); }
  }
}));
console.log({ campaignId, added, failed });
await c.end();
