// Clone a published StoreProof report into a second public link that renders
// the SHORT version (three lines per issue). The original link is untouched.
//   npx tsx scripts/clone-report-short.ts <publicToken>
import dns from 'node:dns';
import { randomBytes } from 'node:crypto';
{ const resolver = new dns.promises.Resolver(); resolver.setServers(['1.1.1.1', '8.8.8.8']); const orig = dns.lookup as unknown as (...a: unknown[]) => unknown;
  (dns as unknown as { lookup: unknown }).lookup = function patched(host: string, opts: unknown, cb?: unknown) { const callback = (typeof opts === 'function' ? opts : cb) as (e: Error | null, a: unknown, f?: number) => void; const options = (typeof opts === 'object' && opts) as { all?: boolean } | false; if (!/\.neon\.tech$/.test(host)) return orig(host, opts, cb); resolver.resolve4(host).then((addrs) => { if (options && options.all) callback(null, addrs.map((address) => ({ address, family: 4 }))); else callback(null, addrs[0], 4); }).catch((err) => callback(err, undefined)); }; }
import { prisma } from '../lib/prisma';
const token = process.argv[2];
async function main() {
  const src = await prisma.storeProofReport.findUniqueOrThrow({ where: { publicToken: token } });
  const existing = await prisma.storeProofReport.findFirst({ where: { host: src.host, runStamp: `${src.runStamp}-short` } });
  const payload = JSON.parse(src.findingsJson); payload.shortVersion = true; payload.clientVersion = true;
  const newToken = existing?.publicToken || randomBytes(18).toString('base64url');
  const data = { host: src.host, runStamp: `${src.runStamp}-short`, storeName: src.storeName, html: src.html, findingsJson: JSON.stringify(payload), funnelLeadId: src.funnelLeadId, clientId: src.clientId, publicToken: newToken, publicFull: true };
  const row = existing
    ? await prisma.storeProofReport.update({ where: { id: existing.id }, data: { findingsJson: data.findingsJson, storeName: data.storeName, publicFull: true } })
    : await prisma.storeProofReport.create({ data });
  console.log(`${existing ? 'updated' : 'created'} short report ${row.id} → https://rachnabuilds.com/report/${row.publicToken}`);
}
main().finally(() => prisma.$disconnect());
