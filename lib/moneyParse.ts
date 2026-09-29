// Request-body validation for the money API (expenses + payments).
import { CATEGORIES } from './money';

export function parseExpense(body: Record<string, unknown>, partial = false) {
  const out: Record<string, unknown> = {};
  const err = (m: string) => { throw new Error(m); };
  if (!partial || body.title !== undefined) { const t = String(body.title || '').trim(); if (!t) err('title required'); out.title = t.slice(0, 120); }
  if (body.vendor !== undefined) out.vendor = body.vendor ? String(body.vendor).slice(0, 80) : null;
  if (!partial || body.category !== undefined) { const c = String(body.category || 'tools'); if (!(CATEGORIES as readonly string[]).includes(c)) err('bad category'); out.category = c; }
  if (!partial || body.amount !== undefined) { const a = Number(body.amount); if (!(a > 0)) err('amount must be > 0'); out.amount = a; }
  if (!partial || body.currency !== undefined) { const c = String(body.currency || 'INR').toUpperCase(); if (!['INR', 'USD'].includes(c)) err('currency INR or USD'); out.currency = c; }
  if (!partial || body.date !== undefined) { const d = new Date(`${String(body.date).slice(0, 10)}T00:00:00.000Z`); if (isNaN(d.getTime())) err('bad date'); out.date = d; }
  if (body.recurring !== undefined) { const r = String(body.recurring); if (!['none', 'monthly', 'yearly'].includes(r)) err('bad recurring'); out.recurring = r; }
  if (body.active !== undefined) out.active = !!body.active;
  if (body.note !== undefined) out.note = body.note ? String(body.note).slice(0, 1000) : null;
  return out;
}

export function parsePayment(body: Record<string, unknown>, partial = false) {
  const out: Record<string, unknown> = {};
  const err = (m: string) => { throw new Error(m); };
  if (!partial || body.clientName !== undefined) { const n = String(body.clientName || '').trim(); if (!n) err('clientName required'); out.clientName = n.slice(0, 120); }
  if (body.leadId !== undefined) out.leadId = body.leadId ? String(body.leadId) : null;
  if (!partial || body.amount !== undefined) { const a = Number(body.amount); if (!(a > 0)) err('amount must be > 0'); out.amount = a; }
  if (!partial || body.currency !== undefined) { const c = String(body.currency || 'USD').toUpperCase(); if (!['INR', 'USD'].includes(c)) err('currency INR or USD'); out.currency = c; }
  if (body.method !== undefined) out.method = body.method ? String(body.method).slice(0, 30) : null;
  if (body.fee !== undefined) out.fee = body.fee === '' || body.fee == null ? null : Math.max(0, Number(body.fee) || 0);
  if (body.status !== undefined) { const s = String(body.status); if (!['received', 'expected'].includes(s)) err('bad status'); out.status = s; }
  if (!partial || body.date !== undefined) { const d = new Date(`${String(body.date).slice(0, 10)}T00:00:00.000Z`); if (isNaN(d.getTime())) err('bad date'); out.date = d; }
  if (body.note !== undefined) out.note = body.note ? String(body.note).slice(0, 1000) : null;
  return out;
}
