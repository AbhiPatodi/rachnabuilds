'use client';

// Money: income vs spend at a glance, Meta ad spend (auto), expenses
// (recurring + one-off), client payments, and month-by-month comparison.
import { useCallback, useEffect, useState } from 'react';

type Tab = 'overview' | 'ads' | 'expenses' | 'income' | 'months';

interface Summary {
  month: string;
  settings: { fxUsdInr: number; adBudgetMonthly: number; minBalance: number; metaBalance: number | null; metaBalanceAt: string | null };
  income: { inr: number; count: number; expectedInr: number; expectedCount: number };
  expenses: { inr: number; byCategory: Record<string, number>; lines: { id: string; title: string; vendor: string | null; category: string; amount: number; currency: string; inr: number; date: string; recurring: string }[] };
  net: number;
  ads: { spendInr: number; leads: number; costPerLead: number | null; days: { date: string; spend: number; leads: number; impressions: number; clicks: number }[]; budget: number; balance: number | null; balanceAt: string | null; burnPerDay: number };
  clientsWon: number;
  costPerClient: number | null;
  payments: { id: string; clientName: string; leadId: string | null; amount: number; currency: string; method: string | null; fee: number | null; status: string; date: string; note: string | null; inr: number }[];
  history: { month: string; income: number; expenses: number; net: number; adSpend: number; leads: number }[];
  adsConnected: boolean;
}
interface Expense { id: string; title: string; vendor: string | null; category: string; amount: number; currency: string; date: string; recurring: string; active: boolean; note: string | null; nextDue: string | null }

const CAT: Record<string, string> = { ads: 'Ads', tools: 'Tools & subscriptions', infra: 'Hosting & infra', contractors: 'Contractors', other: 'Other' };
const inr = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`;
const money = (n: number, c: string) => (c === 'USD' ? `$${n.toLocaleString('en-US', { maximumFractionDigits: 2 })}` : inr(n));
const monthLabel = (ym: string) => new Date(`${ym}-01T00:00:00Z`).toLocaleDateString('en-IN', { month: 'long', year: 'numeric', timeZone: 'UTC' });
const shortMonth = (ym: string) => new Date(`${ym}-01T00:00:00Z`).toLocaleDateString('en-IN', { month: 'short', timeZone: 'UTC' });
const dmy = (d: string) => { const dt = new Date(`${d}T00:00:00Z`); const y = dt.getUTCFullYear() !== new Date().getUTCFullYear(); return dt.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', ...(y ? { year: 'numeric' } : {}), timeZone: 'UTC' }); };
const today = () => new Date().toISOString().slice(0, 10);
const thisMonth = () => today().slice(0, 7);
const shiftMonth = (ym: string, n: number) => { const [y, m] = ym.split('-').map(Number); const d = new Date(Date.UTC(y, m - 1 + n, 1)); return d.toISOString().slice(0, 7); };

const inp: React.CSSProperties = { width: '100%', boxSizing: 'border-box', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 8, padding: '9px 11px', color: 'var(--text)', fontSize: 14, fontFamily: 'inherit' };
const lbl: React.CSSProperties = { fontSize: 11, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--text-muted)', margin: '10px 0 4px', display: 'block' };
const grid2: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10 };

function Stat({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: 'good' | 'bad' | 'warn' }) {
  const color = tone === 'good' ? 'var(--accent)' : tone === 'bad' ? '#FF6B6B' : tone === 'warn' ? '#FBBF24' : undefined;
  return (
    <div className="admin-stat-card">
      <div className="admin-stat-label">{label}</div>
      <div className="admin-stat-value" style={{ color }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

function Bars({ days, budgetPerDay }: { days: Summary['ads']['days']; budgetPerDay: number }) {
  const max = Math.max(1, ...days.map((d) => d.spend));
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 120, padding: '8px 0', borderBottom: '1px solid var(--border)', overflowX: 'auto' }}>
      {days.map((d) => (
        <div key={d.date} title={`${dmy(d.date)}: ${inr(d.spend)}, ${d.leads} lead${d.leads === 1 ? '' : 's'}`} style={{ flex: '1 0 12px', minWidth: 12, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
          {d.leads > 0 && <span style={{ fontSize: 10, fontWeight: 800, color: 'var(--accent)' }}>{d.leads}</span>}
          <div style={{ width: '100%', height: `${(d.spend / max) * 90}px`, background: d.leads > 0 ? 'var(--accent)' : 'rgba(148,163,184,0.45)', borderRadius: 3, border: budgetPerDay && d.spend > budgetPerDay * 1.2 ? '1px solid #FF6B6B' : 'none' }} />
        </div>
      ))}
    </div>
  );
}

export default function MoneyPage() {
  const [tab, setTab] = useState<Tab>('overview');
  useEffect(() => { const t = new URLSearchParams(window.location.search).get('tab') as Tab | null; if (t) setTab(t); }, []);
  const [month, setMonth] = useState(thisMonth());
  const [s, setS] = useState<Summary | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [a, b] = await Promise.all([fetch(`/api/admin/money/summary?month=${month}`), fetch('/api/admin/money/expenses')]);
    if (a.ok) setS(await a.json());
    if (b.ok) setExpenses((await b.json()).expenses);
  }, [month]);
  useEffect(() => { load(); }, [load]);

  const flash = (t: string) => { setMsg(t); setTimeout(() => setMsg(null), 2500); };
  const api = async (url: string, method: string, body?: unknown) => {
    setBusy(true);
    const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined }).catch(() => null);
    setBusy(false);
    if (!res?.ok) { const j = await res?.json().catch(() => ({})); alert(j?.error || 'Request failed'); return false; }
    await load();
    return true;
  };

  // ── forms ──
  const [ef, setEf] = useState({ title: '', vendor: '', category: 'tools', amount: '', currency: 'USD', date: today(), recurring: 'monthly', note: '' });
  const [pf, setPf] = useState({ clientName: '', amount: '', currency: 'USD', method: 'paypal', fee: '', status: 'received', date: today(), note: '' });
  const [showE, setShowE] = useState(false);
  const [showP, setShowP] = useState(false);
  const [editE, setEditE] = useState<string | null>(null);
  const [set, setSet] = useState({ fxUsdInr: '', adBudgetMonthly: '', minBalance: '', metaBalance: '' });
  useEffect(() => { if (s) setSet({ fxUsdInr: String(s.settings.fxUsdInr), adBudgetMonthly: String(s.settings.adBudgetMonthly || ''), minBalance: String(s.settings.minBalance), metaBalance: s.settings.metaBalance != null ? String(s.settings.metaBalance) : '' }); }, [s]);

  const addExpense = async () => {
    if (await api(editE ? `/api/admin/money/expenses/${editE}` : '/api/admin/money/expenses', editE ? 'PATCH' : 'POST', { ...ef, amount: Number(ef.amount) })) {
      setShowE(false); setEditE(null); setEf({ title: '', vendor: '', category: 'tools', amount: '', currency: 'USD', date: today(), recurring: 'monthly', note: '' }); flash(editE ? 'Expense updated' : 'Expense added');
    }
  };
  const addPayment = async () => {
    if (await api('/api/admin/money/payments', 'POST', { ...pf, amount: Number(pf.amount), fee: pf.fee === '' ? null : Number(pf.fee) })) {
      setShowP(false); setPf({ clientName: '', amount: '', currency: 'USD', method: 'paypal', fee: '', status: 'received', date: today(), note: '' }); flash('Payment recorded');
    }
  };
  const saveSettings = async () => { if (await api('/api/admin/money/settings', 'PATCH', { fxUsdInr: Number(set.fxUsdInr), adBudgetMonthly: Number(set.adBudgetMonthly) || 0, minBalance: Number(set.minBalance) || 0, ...(set.metaBalance !== '' ? { metaBalance: Number(set.metaBalance) } : {}) })) flash('Settings saved'); };
  const syncAds = async () => { if (await api('/api/admin/money/sync-ads', 'POST')) flash('Meta spend refreshed'); };

  if (!s) return <div className="admin-content"><div style={{ color: 'var(--text-secondary)', fontSize: 14, padding: 40, textAlign: 'center' }}>Loading money…</div></div>;

  const bal = s.ads.balance;
  const burn = s.ads.burnPerDay || 0;
  const daysLeft = bal != null && burn > 0 ? bal / burn : null;
  const balTone = bal == null ? undefined : bal < s.settings.minBalance ? 'bad' : daysLeft != null && daysLeft < 3 ? 'warn' : 'good';
  const TABS: { id: Tab; label: string }[] = [
    { id: 'overview', label: 'Overview' }, { id: 'ads', label: 'Meta Ads' }, { id: 'expenses', label: `Expenses (${expenses.length})` }, { id: 'income', label: `Income (${s.payments.length})` }, { id: 'months', label: 'Months' },
  ];
  const catRows = Object.entries(s.expenses.byCategory).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]);
  const upcoming = expenses.filter((e) => e.nextDue).sort((a, b) => (a.nextDue! < b.nextDue! ? -1 : 1)).slice(0, 6);

  return (
    <div className="admin-content">
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Money</h1>
          <p className="admin-page-subtitle">What came in, what went out, and what the ads are costing. Totals in INR at ₹{s.settings.fxUsdInr}/$.</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <button type="button" className="admin-btn admin-btn-secondary" onClick={() => setMonth(shiftMonth(month, -1))}>‹</button>
          <b style={{ fontSize: 14, minWidth: 130, textAlign: 'center' }}>{monthLabel(month)}</b>
          <button type="button" className="admin-btn admin-btn-secondary" disabled={month >= thisMonth()} onClick={() => setMonth(shiftMonth(month, 1))}>›</button>
        </div>
      </div>

      {msg && <div className="admin-alert admin-alert-success" style={{ marginBottom: 14 }}>{msg}</div>}

      <div className="settings-tabs">
        {TABS.map((t) => <button key={t.id} className={`settings-tab${tab === t.id ? ' active' : ''}`} onClick={() => setTab(t.id)}>{t.label}</button>)}
      </div>

      {/* quick actions: always visible, thumb-reachable on phone */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', margin: '16px 0' }}>
        <button type="button" className="admin-btn admin-btn-primary" onClick={() => { setShowP(!showP); setShowE(false); }}>💰 Record payment</button>
        <button type="button" className="admin-btn admin-btn-secondary" onClick={() => { setShowE(!showE); setShowP(false); setEditE(null); }}>＋ Expense</button>
        <a className="admin-btn admin-btn-secondary" href={`/api/admin/money/export?month=${month}`}>⬇ CSV</a>
      </div>

      {showP && (
        <div className="admin-card" style={{ padding: 18, marginBottom: 16 }}>
          <div style={{ fontWeight: 700, marginBottom: 4 }}>Record a payment</div>
          <div style={grid2}>
            <div><label style={lbl}>Client</label><input style={inp} value={pf.clientName} onChange={(e) => setPf({ ...pf, clientName: e.target.value })} placeholder="Empire Lumina" /></div>
            <div><label style={lbl}>Amount</label><input style={inp} type="number" inputMode="decimal" value={pf.amount} onChange={(e) => setPf({ ...pf, amount: e.target.value })} /></div>
            <div><label style={lbl}>Currency</label><select style={inp} value={pf.currency} onChange={(e) => setPf({ ...pf, currency: e.target.value })}><option>USD</option><option>INR</option></select></div>
            <div><label style={lbl}>Method</label><select style={inp} value={pf.method} onChange={(e) => setPf({ ...pf, method: e.target.value })}><option value="paypal">PayPal</option><option value="upi">UPI</option><option value="bank">Bank transfer</option><option value="razorpay">Razorpay</option><option value="cash">Cash</option></select></div>
            <div><label style={lbl}>Fee (optional)</label><input style={inp} type="number" inputMode="decimal" value={pf.fee} onChange={(e) => setPf({ ...pf, fee: e.target.value })} placeholder="PayPal fee" /></div>
            <div><label style={lbl}>Status</label><select style={inp} value={pf.status} onChange={(e) => setPf({ ...pf, status: e.target.value })}><option value="received">Received</option><option value="expected">Expected (due)</option></select></div>
            <div><label style={lbl}>{pf.status === 'expected' ? 'Due date' : 'Received on'}</label><input style={inp} type="date" value={pf.date} onChange={(e) => setPf({ ...pf, date: e.target.value })} /></div>
          </div>
          <label style={lbl}>Note</label><input style={inp} value={pf.note} onChange={(e) => setPf({ ...pf, note: e.target.value })} placeholder="50% advance, Fix Sprint" />
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }}>Tip: record client payments from the lead page instead, so they link to the lead.</div>
          <button type="button" className="admin-btn admin-btn-primary" style={{ marginTop: 12 }} disabled={busy} onClick={addPayment}>Save payment</button>
        </div>
      )}

      {showE && (
        <div className="admin-card" style={{ padding: 18, marginBottom: 16 }}>
          <div style={{ fontWeight: 700, marginBottom: 4 }}>{editE ? 'Edit expense' : 'Add an expense'}</div>
          <div style={grid2}>
            <div><label style={lbl}>What</label><input style={inp} value={ef.title} onChange={(e) => setEf({ ...ef, title: e.target.value })} placeholder="Instantly Growth plan" /></div>
            <div><label style={lbl}>Vendor</label><input style={inp} value={ef.vendor} onChange={(e) => setEf({ ...ef, vendor: e.target.value })} placeholder="Instantly" /></div>
            <div><label style={lbl}>Category</label><select style={inp} value={ef.category} onChange={(e) => setEf({ ...ef, category: e.target.value })}>{Object.entries(CAT).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
            <div><label style={lbl}>Amount</label><input style={inp} type="number" inputMode="decimal" value={ef.amount} onChange={(e) => setEf({ ...ef, amount: e.target.value })} /></div>
            <div><label style={lbl}>Currency</label><select style={inp} value={ef.currency} onChange={(e) => setEf({ ...ef, currency: e.target.value })}><option>USD</option><option>INR</option></select></div>
            <div><label style={lbl}>Repeats</label><select style={inp} value={ef.recurring} onChange={(e) => setEf({ ...ef, recurring: e.target.value })}><option value="none">One-off</option><option value="monthly">Every month</option><option value="yearly">Every year</option></select></div>
            <div><label style={lbl}>{ef.recurring === 'none' ? 'Date' : 'First charge date'}</label><input style={inp} type="date" value={ef.date} onChange={(e) => setEf({ ...ef, date: e.target.value })} /></div>
          </div>
          <label style={lbl}>Note</label><input style={inp} value={ef.note} onChange={(e) => setEf({ ...ef, note: e.target.value })} />
          <button type="button" className="admin-btn admin-btn-primary" style={{ marginTop: 12 }} disabled={busy} onClick={addExpense}>{editE ? 'Save changes' : 'Add expense'}</button>
        </div>
      )}

      {tab === 'overview' && (
        <>
          <div className="admin-stats">
            <Stat label="Money in" value={inr(s.income.inr)} sub={`${s.income.count} payment${s.income.count === 1 ? '' : 's'}${s.income.expectedInr ? ` · ${inr(s.income.expectedInr)} still due` : ''}`} tone="good" />
            <Stat label="Money out" value={inr(s.expenses.inr)} sub={`ads ${inr(s.ads.spendInr)} · tools & rest ${inr(s.expenses.inr - s.ads.spendInr)}`} tone="bad" />
            <Stat label="Net this month" value={`${s.net < 0 ? '−' : ''}${inr(Math.abs(s.net))}`} tone={s.net >= 0 ? 'good' : 'bad'} />
          </div>
          <div className="admin-stats">
            <Stat label="Meta balance" value={bal == null ? '—' : inr(bal)} sub={bal == null ? 'Not synced yet' : daysLeft != null ? `≈ ${daysLeft.toFixed(1)} days at ${inr(burn)}/day` : 'no spend yet'} tone={balTone} />
            <Stat label="Cost per lead (ads)" value={s.ads.costPerLead != null ? inr(s.ads.costPerLead) : '—'} sub={`${s.ads.leads} lead${s.ads.leads === 1 ? '' : 's'} from ${inr(s.ads.spendInr)}`} />
            <Stat label="Cost per client won" value={s.costPerClient != null ? inr(s.costPerClient) : '—'} sub={`${s.clientsWon} won this month`} />
          </div>
          {bal != null && bal < s.settings.minBalance && (
            <div className="admin-alert admin-alert-error" style={{ marginBottom: 16 }}>⚠️ Meta balance is under your ₹{s.settings.minBalance.toLocaleString('en-IN')} line. Top up or the ads stop.</div>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
            <div className="admin-card" style={{ padding: 18 }}>
              <h2 className="admin-card-title">Where the money went</h2>
              {catRows.length === 0 ? <p style={{ color: 'var(--text-muted)', fontSize: 13.5, margin: 0 }}>Nothing yet this month.</p> : catRows.map(([k, v]) => (
                <div key={k} style={{ margin: '8px 0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13.5 }}><span>{CAT[k] || k}</span><b>{inr(v)}</b></div>
                  <div style={{ height: 6, background: 'var(--border)', borderRadius: 3, marginTop: 4 }}><div style={{ width: `${(v / s.expenses.inr) * 100}%`, height: '100%', background: k === 'ads' ? '#F472B6' : 'var(--accent)', borderRadius: 3 }} /></div>
                </div>
              ))}
            </div>
            <div className="admin-card" style={{ padding: 18 }}>
              <h2 className="admin-card-title">Coming up</h2>
              {upcoming.length === 0 ? <p style={{ color: 'var(--text-muted)', fontSize: 13.5, margin: 0 }}>No recurring costs yet. Add Instantly, inboxes, hosting…</p> : upcoming.map((e) => (
                <div key={e.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13.5, padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
                  <span>{e.title}<span style={{ color: 'var(--text-muted)' }}> · {dmy(e.nextDue!.slice(0, 10))}</span></span><b>{money(e.amount, e.currency)}</b>
                </div>
              ))}
              {s.income.expectedCount > 0 && <div style={{ marginTop: 10, fontSize: 13, color: 'var(--accent)' }}>＋ {inr(s.income.expectedInr)} expected from {s.income.expectedCount} client payment{s.income.expectedCount === 1 ? '' : 's'}</div>}
            </div>
          </div>
        </>
      )}

      {tab === 'ads' && (
        <>
          {!s.adsConnected && (
            <div className="admin-alert admin-alert-error" style={{ marginBottom: 16 }}>
              Meta isn&apos;t connected yet. Add <code>META_ADS_ACCESS_TOKEN</code> (a system-user token with <code>ads_read</code>) in Vercel, then press Refresh. Until then you can type the balance in Settings below.
            </div>
          )}
          <div className="admin-stats">
            <Stat label="Spent this month" value={inr(s.ads.spendInr)} sub={s.settings.adBudgetMonthly ? `${Math.round((s.ads.spendInr / s.settings.adBudgetMonthly) * 100)}% of ${inr(s.settings.adBudgetMonthly)} budget` : 'no monthly budget set'} tone={s.settings.adBudgetMonthly && s.ads.spendInr > s.settings.adBudgetMonthly ? 'bad' : undefined} />
            <Stat label="Leads" value={String(s.ads.leads)} sub={s.ads.costPerLead != null ? `${inr(s.ads.costPerLead)} each` : undefined} />
            <Stat label="Balance" value={bal == null ? '—' : inr(bal)} sub={s.ads.balanceAt ? `as of ${new Date(s.ads.balanceAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}` : undefined} tone={balTone} />
          </div>
          <div className="admin-card" style={{ padding: 18, marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
              <h2 className="admin-card-title" style={{ margin: 0 }}>Spend per day · green = days with leads</h2>
              <button type="button" className="admin-btn admin-btn-secondary" disabled={busy || !s.adsConnected} onClick={syncAds}>↻ Refresh from Meta</button>
            </div>
            {s.ads.days.length ? <Bars days={s.ads.days} budgetPerDay={s.settings.adBudgetMonthly ? s.settings.adBudgetMonthly / 30 : 0} /> : <p style={{ color: 'var(--text-muted)', fontSize: 13.5 }}>No spend recorded for this month.</p>}
            {s.ads.days.length > 0 && (
              <div className="admin-table-wrap" style={{ marginTop: 12 }}>
                <table className="admin-table">
                  <thead><tr><th>Day</th><th>Spent</th><th>Leads</th><th>Cost / lead</th><th>Clicks</th></tr></thead>
                  <tbody>{[...s.ads.days].reverse().map((d) => (
                    <tr key={d.date}><td>{dmy(d.date)}</td><td>{inr(d.spend)}</td><td>{d.leads || '—'}</td><td>{d.leads ? inr(d.spend / d.leads) : '—'}</td><td>{d.clicks}</td></tr>
                  ))}</tbody>
                </table>
              </div>
            )}
          </div>
          <div className="admin-card" style={{ padding: 18 }}>
            <h2 className="admin-card-title">Settings</h2>
            <div style={grid2}>
              <div><label style={lbl}>USD → INR rate</label><input style={inp} type="number" inputMode="decimal" value={set.fxUsdInr} onChange={(e) => setSet({ ...set, fxUsdInr: e.target.value })} /></div>
              <div><label style={lbl}>Monthly ad budget (₹)</label><input style={inp} type="number" inputMode="numeric" value={set.adBudgetMonthly} onChange={(e) => setSet({ ...set, adBudgetMonthly: e.target.value })} placeholder="30000" /></div>
              <div><label style={lbl}>Warn when balance under (₹)</label><input style={inp} type="number" inputMode="numeric" value={set.minBalance} onChange={(e) => setSet({ ...set, minBalance: e.target.value })} /></div>
              <div><label style={lbl}>Balance now (₹, manual)</label><input style={inp} type="number" inputMode="numeric" value={set.metaBalance} onChange={(e) => setSet({ ...set, metaBalance: e.target.value })} placeholder="type it after a top-up" /></div>
            </div>
            <button type="button" className="admin-btn admin-btn-primary" style={{ marginTop: 12 }} disabled={busy} onClick={saveSettings}>Save</button>
          </div>
        </>
      )}

      {tab === 'expenses' && (
        <div className="admin-card" style={{ padding: 0, overflow: 'clip' }}>
          {expenses.length === 0 ? <div className="admin-empty">No expenses yet. Tap ＋ Expense to add Instantly, inboxes, hosting and the rest.</div> : (
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead><tr><th>What</th><th>Category</th><th>Amount</th><th>Repeats</th><th>Next</th><th></th></tr></thead>
                <tbody>{expenses.map((e) => (
                  <tr key={e.id} style={{ opacity: e.active ? 1 : 0.5 }}>
                    <td><b>{e.title}</b>{e.vendor && <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{e.vendor}</div>}</td>
                    <td style={{ fontSize: 13 }}>{CAT[e.category] || e.category}</td>
                    <td><b>{money(e.amount, e.currency)}</b></td>
                    <td style={{ fontSize: 13 }}>{e.recurring === 'none' ? dmy(e.date.slice(0, 10)) : e.recurring === 'monthly' ? 'monthly' : 'yearly'}{!e.active && ' (stopped)'}</td>
                    <td style={{ fontSize: 13 }}>{e.nextDue ? dmy(e.nextDue.slice(0, 10)) : '—'}</td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <button type="button" className="admin-btn admin-btn-secondary" style={{ fontSize: 12, marginRight: 4 }} onClick={() => { setEditE(e.id); setEf({ title: e.title, vendor: e.vendor || '', category: e.category, amount: String(e.amount), currency: e.currency, date: e.date.slice(0, 10), recurring: e.recurring, note: e.note || '' }); setShowE(true); setShowP(false); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>Edit</button>
                      {e.recurring !== 'none' && <button type="button" className="admin-btn admin-btn-secondary" style={{ fontSize: 12, marginRight: 4 }} onClick={() => api(`/api/admin/money/expenses/${e.id}`, 'PATCH', { active: !e.active })}>{e.active ? 'Stop' : 'Resume'}</button>}
                      <button type="button" className="admin-btn admin-btn-danger" style={{ fontSize: 12 }} onClick={() => { if (confirm(`Delete "${e.title}"?`)) api(`/api/admin/money/expenses/${e.id}`, 'DELETE'); }}>✕</button>
                    </td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === 'income' && (
        <div className="admin-card" style={{ padding: 0, overflow: 'clip' }}>
          {s.payments.length === 0 ? <div className="admin-empty">No payments in {monthLabel(month)}.</div> : (
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead><tr><th>Client</th><th>Amount</th><th>In INR</th><th>Method</th><th>Status</th><th>Date</th><th></th></tr></thead>
                <tbody>{s.payments.map((p) => (
                  <tr key={p.id}>
                    <td><b>{p.leadId ? <a href={`/admin/funnel-leads/${p.leadId}`} style={{ color: 'var(--text)' }}>{p.clientName}</a> : p.clientName}</b>{p.note && <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{p.note}</div>}</td>
                    <td><b>{money(p.amount, p.currency)}</b>{p.fee ? <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>fee {money(p.fee, p.currency)}</div> : null}</td>
                    <td>{inr(p.inr)}</td>
                    <td style={{ fontSize: 13 }}>{p.method || '—'}</td>
                    <td><span style={{ fontSize: 10.5, fontWeight: 800, textTransform: 'uppercase', padding: '3px 9px', borderRadius: 99, background: p.status === 'received' ? 'rgba(6,214,160,0.12)' : 'rgba(251,191,36,0.12)', color: p.status === 'received' ? 'var(--accent)' : '#FBBF24' }}>{p.status}</span></td>
                    <td style={{ fontSize: 13 }}>{dmy(p.date)}</td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      {p.status === 'expected' && <button type="button" className="admin-btn admin-btn-primary" style={{ fontSize: 12, marginRight: 4 }} onClick={() => api(`/api/admin/money/payments/${p.id}`, 'PATCH', { status: 'received', date: today() })}>Mark received</button>}
                      <button type="button" className="admin-btn admin-btn-danger" style={{ fontSize: 12 }} onClick={() => { if (confirm('Delete this payment?')) api(`/api/admin/money/payments/${p.id}`, 'DELETE'); }}>✕</button>
                    </td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === 'months' && (
        <div className="admin-card" style={{ padding: 0, overflow: 'clip' }}>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead><tr><th>Month</th><th>In</th><th>Out</th><th>Net</th><th>Ad spend</th><th>Leads</th><th>₹ / lead</th></tr></thead>
              <tbody>{[...s.history].reverse().map((h) => (
                <tr key={h.month} style={{ fontWeight: h.month === month ? 700 : 400 }}>
                  <td><button type="button" onClick={() => setMonth(h.month)} style={{ background: 'none', border: 'none', color: 'var(--text)', cursor: 'pointer', fontWeight: 'inherit', fontFamily: 'inherit', fontSize: 'inherit', padding: 0 }}>{shortMonth(h.month)} {h.month.slice(0, 4)}</button></td>
                  <td style={{ color: 'var(--accent)' }}>{inr(h.income)}</td><td>{inr(h.expenses)}</td>
                  <td style={{ color: h.net >= 0 ? 'var(--accent)' : '#FF6B6B' }}>{h.net < 0 ? '−' : ''}{inr(Math.abs(h.net))}</td>
                  <td>{inr(h.adSpend)}</td><td>{h.leads}</td><td>{h.leads ? inr(h.adSpend / h.leads) : '—'}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
