// Store a hand-written CallScriptData JSON on a funnel lead (Script tab +
// printable /admin/funnel-leads/<id>/script) and log a note.
//   npx tsx scripts/set-call-script.ts <leadId> <script.json> "<note>"
import { readFileSync } from 'node:fs';
import dns from 'node:dns';
{ const resolver = new dns.promises.Resolver(); resolver.setServers(['1.1.1.1', '8.8.8.8']); const orig = dns.lookup as unknown as (...a: unknown[]) => unknown;
  (dns as unknown as { lookup: unknown }).lookup = function patched(host: string, opts: unknown, cb?: unknown) { const callback = (typeof opts === 'function' ? opts : cb) as (e: Error | null, a: unknown, f?: number) => void; const options = (typeof opts === 'object' && opts) as { all?: boolean } | false; if (!/\.neon\.tech$/.test(host)) return orig(host, opts, cb); resolver.resolve4(host).then((addrs) => { if (options && options.all) callback(null, addrs.map((address) => ({ address, family: 4 }))); else callback(null, addrs[0], 4); }).catch((err) => callback(err, undefined)); }; }
import { prisma } from '../lib/prisma';
const [leadId, file, note] = process.argv.slice(2);
async function main() {
  const script = JSON.parse(readFileSync(file, 'utf8'));
  await prisma.funnelLead.update({ where: { id: leadId }, data: { callScript: JSON.stringify(script) } });
  if (note) await prisma.leadActivity.create({ data: { leadId, type: 'note', text: note, actor: 'Claude (owner instruction)' } });
  const back = await prisma.funnelLead.findUnique({ where: { id: leadId }, select: { name: true, callScript: true } });
  const s = JSON.parse(back!.callScript!);
  console.log(`saved for ${back!.name}: ${s.checkpoints.length} checkpoints, ${s.objectionPrep.length} objections, issueGuide ${s.issueGuide?.length}`);
}
main().finally(() => prisma.$disconnect());
