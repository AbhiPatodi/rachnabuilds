// Merge a StoreProof findings.json (findings, opener, working, walkthrough,
// design) into an existing published report's findingsJson, keeping the
// worker-gathered extras (speed, benchmark, checkStats, healthByArea,
// screenshots, brand, pdf) untouched.
//   npx tsx scripts/update-report-findings.ts <publicToken> <path/to/findings.json>
import { readFileSync } from 'node:fs';
import dns from 'node:dns';

// Some home routers refuse to resolve *.neon.tech (REFUSED), while public
// resolvers answer fine. Route those lookups through Cloudflare so the pg
// driver (which uses the system resolver via dns.lookup) can connect.
{
  const resolver = new dns.promises.Resolver();
  resolver.setServers(['1.1.1.1', '8.8.8.8']);
  const orig = dns.lookup as unknown as (...a: unknown[]) => unknown;
  (dns as unknown as { lookup: unknown }).lookup = function patched(host: string, opts: unknown, cb?: unknown) {
    const callback = (typeof opts === 'function' ? opts : cb) as (err: Error | null, addr: unknown, family?: number) => void;
    const options = (typeof opts === 'object' && opts) as { all?: boolean } | false;
    if (!/\.neon\.tech$/.test(host)) return orig(host, opts, cb);
    resolver.resolve4(host).then((addrs) => {
      if (options && options.all) callback(null, addrs.map((address) => ({ address, family: 4 })));
      else callback(null, addrs[0], 4);
    }).catch((err) => callback(err, undefined));
  };
}

import { prisma } from '../lib/prisma';

const [token, file] = process.argv.slice(2);
if (!token || !file) { console.error('usage: tsx scripts/update-report-findings.ts <publicToken> <findings.json>'); process.exit(1); }

async function main() {
  const report = await prisma.storeProofReport.findUniqueOrThrow({ where: { publicToken: token } });
  const existing = JSON.parse(report.findingsJson || '{}');
  const incoming = JSON.parse(readFileSync(file, 'utf8'));
  const merged = { ...existing };
  for (const k of ['findings', 'opener', 'working', 'walkthrough', 'design', 'opportunities', 'plan', 'method', 'speed', 'screenshots', 'healthByArea', 'checkStats'] as const) {
    if (incoming[k] !== undefined) merged[k] = incoming[k];
  }
  const findingsJson = JSON.stringify(merged);
  await prisma.storeProofReport.update({ where: { id: report.id }, data: { findingsJson } });
  console.log(`updated ${report.storeName} (${report.id}): ${merged.findings?.length} findings, ${merged.walkthrough?.steps?.length} steps, ${(findingsJson.length / 1024 / 1024).toFixed(2)} MB; kept: ${Object.keys(existing).filter((k) => !['findings', 'opener', 'working', 'walkthrough', 'design', 'opportunities', 'plan', 'method'].includes(k)).join(', ')}`);
}
main().finally(() => prisma.$disconnect());
