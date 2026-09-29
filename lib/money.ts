// Money tracker helpers: settings (FX rate, budgets), month maths, recurring
// expense expansion, and the summary the admin Money page renders.
import { prisma } from './prisma';

export const MONEY_SETTINGS = {
  fx: 'money_fx_usd_inr',            // 1 USD = N INR (default 84)
  adBudget: 'money_ad_budget_monthly', // INR
  minBalance: 'money_min_balance',     // INR, alert line (default 1500)
  metaBalance: 'money_meta_balance',   // last known prepaid balance, INR
  metaBalanceAt: 'money_meta_balance_at',
  lowBalanceAlertOn: 'money_low_balance_alert_day', // YYYY-MM-DD of last push
} as const;

export const CATEGORIES = ['ads', 'tools', 'infra', 'contractors', 'other'] as const;
export type Category = (typeof CATEGORIES)[number];
export const CATEGORY_LABEL: Record<Category, string> = {
  ads: 'Ads', tools: 'Tools & subscriptions', infra: 'Hosting & infra', contractors: 'Contractors', other: 'Other',
};

export async function getMoneySettings() {
  const rows = await prisma.setting.findMany({ where: { key: { in: Object.values(MONEY_SETTINGS) } } });
  const m = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  return {
    fxUsdInr: Number(m[MONEY_SETTINGS.fx]) || 84,
    adBudgetMonthly: Number(m[MONEY_SETTINGS.adBudget]) || 0,
    minBalance: Number(m[MONEY_SETTINGS.minBalance]) || 1500,
    metaBalance: m[MONEY_SETTINGS.metaBalance] != null ? Number(m[MONEY_SETTINGS.metaBalance]) : null,
    metaBalanceAt: m[MONEY_SETTINGS.metaBalanceAt] || null,
  };
}

export async function setSetting(key: string, value: string) {
  await prisma.setting.upsert({ where: { key }, create: { key, value }, update: { value } });
}

/** Convert to INR for totals. Amounts stay in their own currency in the DB. */
export function toInr(amount: number, currency: string, fx: number): number {
  return currency === 'USD' ? amount * fx : amount;
}

/** "2026-09" → [start, end) in UTC. Ad days are stored at 00:00 UTC. */
export function monthRange(ym: string): { start: Date; end: Date } {
  const [y, m] = ym.split('-').map(Number);
  return { start: new Date(Date.UTC(y, m - 1, 1)), end: new Date(Date.UTC(y, m, 1)) };
}
export function ymOf(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}
export function dayKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export interface ExpenseRow {
  id: string; title: string; vendor: string | null; category: string; amount: number; currency: string;
  date: Date; recurring: string; active: boolean; note: string | null;
}

/**
 * A recurring expense (monthly/yearly from its start date) counts once in every
 * period from its start until it is deactivated. Returns the occurrences that
 * land inside [start, end).
 */
export function occurrencesIn(e: ExpenseRow, start: Date, end: Date): Date[] {
  if (e.recurring === 'none') return e.date >= start && e.date < end ? [e.date] : [];
  if (!e.active && e.date < start) return [];
  const out: Date[] = [];
  const d = new Date(e.date);
  let guard = 0;
  while (d < end && guard++ < 600) {
    if (d >= start) out.push(new Date(d));
    if (e.recurring === 'monthly') d.setUTCMonth(d.getUTCMonth() + 1);
    else d.setUTCFullYear(d.getUTCFullYear() + 1);
  }
  return out;
}

export function nextOccurrence(e: ExpenseRow, from = new Date()): Date | null {
  if (e.recurring === 'none' || !e.active) return null;
  const d = new Date(e.date);
  let guard = 0;
  while (d < from && guard++ < 600) {
    if (e.recurring === 'monthly') d.setUTCMonth(d.getUTCMonth() + 1);
    else d.setUTCFullYear(d.getUTCFullYear() + 1);
  }
  return d;
}

export async function monthSummary(ym: string) {
  const s = await getMoneySettings();
  const { start, end } = monthRange(ym);
  const [expenses, payments, adDays, topUps, topUpAll, spendAll] = await Promise.all([
    prisma.expense.findMany({ where: { OR: [{ recurring: { not: 'none' } }, { date: { gte: start, lt: end } }] } }),
    prisma.payment.findMany({ where: { date: { gte: start, lt: end } }, orderBy: { date: 'desc' }, include: { lead: { select: { name: true, storeUrl: true } } } }),
    prisma.adSpendDay.findMany({ where: { date: { gte: start, lt: end } }, orderBy: { date: 'asc' } }),
    prisma.adTopUp.findMany({ where: { date: { gte: start, lt: end } }, orderBy: { date: 'desc' } }),
    prisma.adTopUp.aggregate({ _sum: { amount: true } }),
    prisma.adSpendDay.aggregate({ _sum: { spend: true } }),
  ]);

  const byCategory: Record<string, number> = {};
  const expenseLines: { id: string; title: string; vendor: string | null; category: string; amount: number; currency: string; inr: number; date: string; recurring: string }[] = [];
  for (const e of expenses) {
    for (const d of occurrencesIn(e, start, end)) {
      const inr = toInr(e.amount, e.currency, s.fxUsdInr);
      byCategory[e.category] = (byCategory[e.category] || 0) + inr;
      expenseLines.push({ id: e.id, title: e.title, vendor: e.vendor, category: e.category, amount: e.amount, currency: e.currency, inr, date: dayKey(d), recurring: e.recurring });
    }
  }
  const adSpend = adDays.reduce((a, d) => a + toInr(d.spend, d.currency, s.fxUsdInr), 0);
  const adLeads = adDays.reduce((a, d) => a + d.leads, 0);
  // Ads are tracked from Meta directly; don't double count a manual "ads" expense.
  const expensesInr = Object.entries(byCategory).filter(([k]) => k !== 'ads').reduce((a, [, v]) => a + v, 0) + adSpend;
  byCategory.ads = (byCategory.ads || 0) + adSpend;

  const received = payments.filter((p) => p.status === 'received');
  const expected = payments.filter((p) => p.status === 'expected');
  const incomeInr = received.reduce((a, p) => a + toInr(p.amount - (p.fee || 0), p.currency, s.fxUsdInr), 0);
  const expectedInr = expected.reduce((a, p) => a + toInr(p.amount, p.currency, s.fxUsdInr), 0);

  const won = await prisma.funnelLead.count({ where: { status: 'closed_won', updatedAt: { gte: start, lt: end } } });

  return {
    month: ym,
    settings: s,
    income: { inr: incomeInr, count: received.length, expectedInr, expectedCount: expected.length },
    expenses: { inr: expensesInr, byCategory, lines: expenseLines.sort((a, b) => b.date.localeCompare(a.date)) },
    net: incomeInr - expensesInr,
    ads: {
      spendInr: adSpend, leads: adLeads,
      costPerLead: adLeads ? adSpend / adLeads : null,
      days: adDays.map((d) => ({ date: dayKey(d.date), spend: d.spend, leads: d.leads, impressions: d.impressions, clicks: d.clicks })),
      budget: s.adBudgetMonthly, balance: s.metaBalance, balanceAt: s.metaBalanceAt,
      burnPerDay: adDays.length ? adSpend / adDays.filter((d) => d.spend > 0).length || 0 : 0,
      topUps: topUps.map((t) => ({ id: t.id, date: t.date.toISOString(), amount: t.amount, currency: t.currency, method: t.method, source: t.source, note: t.note })),
      topUpTotal: topUps.reduce((a, t) => a + t.amount, 0),
      allTime: { paidIn: topUpAll._sum.amount || 0, spent: spendAll._sum.spend || 0 },
    },
    clientsWon: won,
    costPerClient: won ? expensesInr / won : null,
    payments: payments.map((p) => ({ id: p.id, clientName: p.clientName, leadId: p.leadId, amount: p.amount, currency: p.currency, method: p.method, fee: p.fee, status: p.status, date: dayKey(p.date), note: p.note, inr: toInr(p.amount, p.currency, s.fxUsdInr) })),
  };
}
