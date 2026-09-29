// Instantly API v2 client (cold-email workspace). Read + the few writes we use:
// replying inside a thread, adding leads, registering the webhook.
const BASE = 'https://api.instantly.ai/api/v2';

function key(): string {
  const k = process.env.INSTANTLY_API_KEY;
  if (!k) throw new Error('INSTANTLY_API_KEY not set');
  return k;
}

async function call<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${key()}`, 'Content-Type': 'application/json', ...(init.headers || {}) },
  });
  const text = await res.text();
  let json: unknown = null;
  try { json = text ? JSON.parse(text) : null; } catch { /* non-json */ }
  if (!res.ok) throw new Error(`Instantly ${path} → ${res.status}: ${text.slice(0, 300)}`);
  return json as T;
}

export interface InstantlyAccount {
  email: string; status: number; warmup_status: number; setup_pending?: boolean;
  daily_limit?: number; stat_warmup_score?: number; timestamp_created?: string;
}
export const listAccounts = () => call<{ items: InstantlyAccount[] }>('/accounts?limit=100').then((r) => r.items || []);

export interface WarmupAnalytics { [email: string]: { health_score?: number; sent?: number; received?: number; spam?: number } }
export const warmupAnalytics = (emails: string[]) =>
  call<Record<string, unknown>>('/accounts/warmup-analytics', { method: 'POST', body: JSON.stringify({ emails }) });

export interface Campaign { id: string; name: string; status: number; timestamp_created?: string }
export const listCampaigns = () => call<{ items: Campaign[] }>('/campaigns?limit=50').then((r) => r.items || []);

export interface CampaignAnalytics {
  campaign_id: string; campaign_name?: string; leads_count?: number; contacted_count?: number; emails_sent_count?: number;
  open_count?: number; reply_count?: number; bounced_count?: number; unsubscribed_count?: number; completed_count?: number;
  total_opportunities?: number;
}
export const campaignAnalytics = (id?: string) =>
  call<CampaignAnalytics[]>(`/campaigns/analytics${id ? `?id=${id}` : ''}`);

export interface InstantlyEmail { id: string; subject?: string; body?: { text?: string; html?: string }; from_address_email?: string; to_address_email_list?: string; eaccount?: string; timestamp_created?: string; ue_type?: number; thread_id?: string; campaign_id?: string }
/** Emails for one lead (newest first). ue_type 2 = received reply. */
export const emailsForLead = (leadEmail: string, campaignId?: string) =>
  call<{ items: InstantlyEmail[] }>(`/emails?lead=${encodeURIComponent(leadEmail)}${campaignId ? `&campaign_id=${campaignId}` : ''}&limit=20`).then((r) => r.items || []);

/** Reply inside an existing thread from the same inbox that sent the original. */
export const replyToEmail = (replyToUuid: string, eaccount: string, subject: string, text: string) =>
  call<{ id: string }>('/emails/reply', {
    method: 'POST',
    body: JSON.stringify({ reply_to_uuid: replyToUuid, eaccount, subject, body: { text } }),
  });

export interface NewLead {
  campaign: string; email: string; first_name?: string; last_name?: string; company_name?: string; website?: string;
  custom_variables?: Record<string, string>; skip_if_in_workspace?: boolean; skip_if_in_campaign?: boolean;
}
export const addLead = (lead: NewLead) => call<{ id: string }>('/leads', { method: 'POST', body: JSON.stringify({ skip_if_in_workspace: true, skip_if_in_campaign: true, ...lead }) });

export const registerWebhook = (hookUrl: string, eventType: string, campaignId?: string) =>
  call<{ id: string }>('/webhooks', { method: 'POST', body: JSON.stringify({ hook_url: hookUrl, event_type: eventType, ...(campaignId ? { campaign: campaignId } : {}) }) });
export const listWebhooks = () => call<{ items: { id: string; hook_url: string; event_type: string }[] }>('/webhooks?limit=50').then((r) => r.items || []);

export const hasInstantlyKey = () => !!process.env.INSTANTLY_API_KEY;
