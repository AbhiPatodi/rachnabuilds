// Create (or refresh) a DRAFT proposal for a lead from a ProposalContent JSON
// file. Status stays "draft" until the owner says send.
//   npx tsx scripts/create-proposal.ts <leadId> <content.json> <reportToken> "<title>"
import { readFileSync } from 'node:fs';
import dns from 'node:dns';
{ const resolver = new dns.promises.Resolver(); resolver.setServers(['1.1.1.1', '8.8.8.8']); const orig = dns.lookup as unknown as (...a: unknown[]) => unknown;
  (dns as unknown as { lookup: unknown }).lookup = function patched(host: string, opts: unknown, cb?: unknown) { const callback = (typeof opts === 'function' ? opts : cb) as (e: Error | null, a: unknown, f?: number) => void; const options = (typeof opts === 'object' && opts) as { all?: boolean } | false; if (!/\.neon\.tech$/.test(host)) return orig(host, opts, cb); resolver.resolve4(host).then((addrs) => { if (options && options.all) callback(null, addrs.map((address) => ({ address, family: 4 }))); else callback(null, addrs[0], 4); }).catch((err) => callback(err, undefined)); }; }
import { prisma } from '../lib/prisma';
import { newProposalToken, parseContent } from '../lib/proposal';
const [leadId, file, reportToken, title] = process.argv.slice(2);
async function main() {
  const content = parseContent(JSON.parse(readFileSync(file, 'utf8')));
  if (!content) throw new Error('content did not parse as ProposalContent');
  const existing = await prisma.proposal.findFirst({ where: { leadId, title }, orderBy: { createdAt: 'desc' } });
  const validUntil = new Date(Date.now() + 7 * 86400_000);
  const p = existing
    ? await prisma.proposal.update({ where: { id: existing.id }, data: { content: content as object, reportToken, validUntil } })
    : await prisma.proposal.create({ data: { leadId, token: newProposalToken(), title, content: content as object, reportToken, validUntil, status: 'draft' } });
  await prisma.leadActivity.create({ data: { leadId, type: 'note', text: `📄 Proposal ${existing ? 'updated' : 'created'} as DRAFT (not sent): "${title}" — Fix and Grow $700 / 10 days (recommended), Full Fix Sprint $500 / 3–4 days, 40% to start. Preview: https://rachnabuilds.com/proposal/${p.token}`, actor: 'Claude (owner instruction)' } });
  console.log(`${existing ? 'updated' : 'created'} draft proposal ${p.id} → https://rachnabuilds.com/proposal/${p.token}`);
}
main().finally(() => prisma.$disconnect());
