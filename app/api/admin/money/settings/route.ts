import { NextRequest, NextResponse } from 'next/server';
import { MONEY_SETTINGS, getMoneySettings, setSetting } from '@/lib/money';

export const dynamic = 'force-dynamic';

export async function GET() { return NextResponse.json(await getMoneySettings()); }

export async function PATCH(req: NextRequest) {
  const b = await req.json().catch(() => ({}));
  if (b.fxUsdInr !== undefined) { const v = Number(b.fxUsdInr); if (!(v > 0)) return NextResponse.json({ error: 'bad fx' }, { status: 400 }); await setSetting(MONEY_SETTINGS.fx, String(v)); }
  if (b.adBudgetMonthly !== undefined) await setSetting(MONEY_SETTINGS.adBudget, String(Math.max(0, Number(b.adBudgetMonthly) || 0)));
  if (b.gstPct !== undefined) await setSetting(MONEY_SETTINGS.gstPct, String(Math.max(0, Number(b.gstPct) || 0)));
  if (b.minBalance !== undefined) await setSetting(MONEY_SETTINGS.minBalance, String(Math.max(0, Number(b.minBalance) || 0)));
  if (b.metaBalance !== undefined) { await setSetting(MONEY_SETTINGS.metaBalance, String(Math.max(0, Number(b.metaBalance) || 0))); await setSetting(MONEY_SETTINGS.metaBalanceAt, new Date().toISOString()); }
  return NextResponse.json(await getMoneySettings());
}
