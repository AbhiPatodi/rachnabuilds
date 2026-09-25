// Sales proposal content model + the default two-tier StoreProof sprint
// template. The public page (/proposal/<token>) renders ProposalContent as-is,
// so everything a lead sees is editable from the admin Proposal tab.
import { randomBytes } from 'crypto';

export interface ProposalTier {
  id: string;
  name: string;
  price: number;
  currency: string;          // "USD" | "INR"
  duration: string;          // "14 days"
  tagline: string;
  recommended?: boolean;
  items: string[];
  missing?: string;          // honest line on what this tier does NOT get you
  payment?: string;          // "50% to start · 50% on delivery"
}

export interface ProposalContent {
  headline: string;
  intro: string;
  recap: { label: string; value: string }[];      // what we heard on the call
  problems: { title: string; body: string }[];    // outcome-level, never the how-to
  tiers: ProposalTier[];
  whyNow: string;
  terms: string[];
  nextSteps: string[];
}

export function newProposalToken(): string {
  return randomBytes(18).toString('base64url');
}

export function money(n: number, currency: string): string {
  return currency === 'INR' ? `₹${n.toLocaleString('en-IN')}` : `$${n.toLocaleString('en-US')}`;
}

export function defaultProposalContent(lead: { name: string; storeUrl?: string | null }): ProposalContent {
  const first = lead.name.split(' ')[0] || lead.name;
  return {
    headline: `${first}, here's the plan to get your store ready to sell`,
    intro: `Thanks for the time on our call. Below is what we found, what we'll do about it, and the two ways we can work together. Everything here is based on your own store, not a template.`,
    recap: [],
    problems: [],
    tiers: [
      {
        id: 'launch',
        name: 'Launch-Ready Sprint',
        price: 799,
        currency: 'USD',
        duration: '14 days',
        tagline: 'Fix the leaks and set up everything you need before you spend on marketing.',
        recommended: true,
        items: [
          'Everything in the Fix Sprint',
          'Email marketing set up with 3 core automations: welcome, abandoned cart, post-purchase review request',
          'Phone number + SMS signup capture, with proper consent',
          'A dedicated landing page for your best-seller, ready for ads',
          'Before/after proof from your own analytics',
          '30-day review call to go through the numbers together',
          'Strategy call with our ads specialist so marketing starts on a ready store',
        ],
        payment: '50% to start · 50% on delivery',
      },
      {
        id: 'fix',
        name: 'Fix Sprint',
        price: 299,
        currency: 'USD',
        duration: '7 days',
        tagline: 'Stop the leaks.',
        items: [
          'Tracking reconnected and verified',
          'Product pages fast on phones, with before/after numbers',
          'Reviews visible on every product + star ratings for Google',
          'Mobile friction fixed',
        ],
        missing: 'You would still start marketing without email capture, SMS or a landing page for your ads.',
        payment: 'Paid upfront',
      },
    ],
    whyNow: '',
    terms: [
      'We only publish real customer reviews.',
      'Nothing on your store changes without your approval; every change is reversible.',
      'You keep full ownership of your store, apps and data.',
    ],
    nextSteps: [
      'Pick a plan above (one tap, nothing is charged there)',
      'We send payment details on WhatsApp',
      'We start the next working day and share progress as we go',
    ],
  };
}

export function parseContent(raw: unknown): ProposalContent | null {
  if (!raw || typeof raw !== 'object') return null;
  const c = raw as Partial<ProposalContent>;
  if (!Array.isArray(c.tiers)) return null;
  return {
    headline: String(c.headline || ''),
    intro: String(c.intro || ''),
    recap: Array.isArray(c.recap) ? c.recap : [],
    problems: Array.isArray(c.problems) ? c.problems : [],
    tiers: c.tiers,
    whyNow: String(c.whyNow || ''),
    terms: Array.isArray(c.terms) ? c.terms : [],
    nextSteps: Array.isArray(c.nextSteps) ? c.nextSteps : [],
  };
}

/** Geo (Vercel edge headers) + device (UA) for a public page view. */
export function visitorContext(h: Headers) {
  const ua = h.get('user-agent') || '';
  const os =
    /iPhone|iPad/.test(ua) ? 'iPhone' : /Android/.test(ua) ? 'Android'
    : /Macintosh/.test(ua) ? 'Mac' : /Windows/.test(ua) ? 'Windows' : /Linux/.test(ua) ? 'Linux' : null;
  const browser =
    /Instagram/.test(ua) ? 'Instagram in-app' : /FBAN|FBAV/.test(ua) ? 'Facebook in-app'
    : /WhatsApp/.test(ua) ? 'WhatsApp' : /Edg\//.test(ua) ? 'Edge' : /SamsungBrowser/.test(ua) ? 'Samsung Internet'
    : /Chrome|CriOS/.test(ua) ? 'Chrome' : /Firefox|FxiOS/.test(ua) ? 'Firefox' : /Safari/.test(ua) ? 'Safari' : null;
  const city = h.get('x-vercel-ip-city');
  return {
    ip: (h.get('x-forwarded-for') || '').split(',')[0].trim() || null,
    country: h.get('x-vercel-ip-country') || null,
    city: city ? decodeURIComponent(city) : null,
    os,
    browser,
  };
}
