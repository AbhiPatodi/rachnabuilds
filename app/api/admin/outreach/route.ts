// Cold-email overview: pipeline counts from prospects + live inbox/campaign
// health from Instantly. Instantly calls are best-effort; the page still
// renders the pipeline when the key is missing or the API is slow.
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { listAccounts, warmupAnalytics, listCampaigns, campaignAnalytics, hasInstantlyKey } from '@/lib/instantly';

export const dynamic = 'force-dynamic';

export async function GET() {
  const [byTier, byVerify, byScan, byStage, replied, lastHook] = await Promise.all([
    prisma.prospect.groupBy({ by: ['tier'], _count: true }),
    prisma.prospect.groupBy({ by: ['tier', 'verifyStatus'], _count: true }),
    prisma.prospect.groupBy({ by: ['tier', 'scanStatus'], _count: true }),
    prisma.prospect.groupBy({ by: ['stage'], _count: true }),
    prisma.funnelLead.findMany({ where: { utmSource: 'cold-email' }, orderBy: { createdAt: 'desc' }, take: 15, select: { id: true, name: true, email: true, storeUrl: true, status: true, createdAt: true } }),
    prisma.setting.findUnique({ where: { key: 'instantly_last_webhook' } }),
  ]);
  const top = (t: string) => t === 'A+' || t === 'A';
  const pipeline = {
    tiers: Object.fromEntries(byTier.map((r) => [r.tier, r._count])),
    verify: byVerify.filter((r) => top(r.tier)).reduce((a, r) => { a[r.verifyStatus] = (a[r.verifyStatus] || 0) + r._count; return a; }, {} as Record<string, number>),
    scan: byScan.filter((r) => top(r.tier)).reduce((a, r) => { a[r.scanStatus] = (a[r.scanStatus] || 0) + r._count; return a; }, {} as Record<string, number>),
    stage: Object.fromEntries(byStage.map((r) => [r.stage, r._count])),
  };

  let instantly: { connected: boolean; accounts: { email: string; ready: boolean; warmup: boolean; dailyLimit: number; score: number | null }[]; campaigns: unknown[]; error?: string } = { connected: hasInstantlyKey(), accounts: [], campaigns: [] };
  if (instantly.connected) {
    try {
      const accounts = await listAccounts();
      let scores: Record<string, { health_score?: number }> = {};
      try { scores = (await warmupAnalytics(accounts.map((a) => a.email))) as Record<string, { health_score?: number }>; } catch { /* optional */ }
      instantly.accounts = accounts.map((a) => ({
        email: a.email, ready: a.status === 1 && !a.setup_pending, warmup: a.warmup_status === 1, dailyLimit: a.daily_limit || 0,
        score: scores[a.email]?.health_score ?? a.stat_warmup_score ?? null,
      }));
      const camps = await listCampaigns();
      const analytics = camps.length ? await campaignAnalytics().catch(() => []) : [];
      instantly.campaigns = camps.map((c) => ({ id: c.id, name: c.name, status: c.status, ...(Array.isArray(analytics) ? analytics.find((x) => x.campaign_id === c.id) || {} : {}) }));
    } catch (e) {
      instantly = { ...instantly, error: (e as Error).message.slice(0, 200) };
    }
  }

  return NextResponse.json({ pipeline, instantly, replied, lastWebhook: lastHook ? JSON.parse(lastHook.value) : null });
}
