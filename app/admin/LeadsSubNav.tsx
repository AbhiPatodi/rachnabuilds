'use client';

// Sub-navigation for the consolidated Leads hub:
//   Pipeline  — funnel_leads (people who raised a hand, any source)
//   Prospects — cold-email pool (we picked them; quarantined)
//   Inbox     — general contact-form submissions
//   Enquiries — "Start a Project" (/start) submissions → convertible to clients
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const ITEMS = [
  { href: '/admin/funnel-leads', label: 'Pipeline' },
  { href: '/admin/prospects', label: 'Prospects' },
  { href: '/admin/leads', label: 'Inbox' },
  { href: '/admin/portal-leads', label: 'Enquiries' },
  { href: '/admin/funnel-leads/ad-report', label: 'Ad report' },
  { href: '/admin/funnel-leads/duplicates', label: 'Duplicates' },
];

export const LEADS_HUB_PATHS = ITEMS.map((i) => i.href);

export default function LeadsSubNav({ rep = false }: { rep?: boolean }) {
  const pathname = usePathname();
  if (rep) return null;
  // Deepest matching item wins, so /funnel-leads/ad-report doesn't also light up Pipeline.
  const activeHref = ITEMS.map((i) => i.href)
    .filter((h) => pathname === h || pathname.startsWith(`${h}/`))
    .sort((a, b) => b.length - a.length)[0];
  return (
    <div style={{ display: 'flex', gap: 6, marginBottom: 18, borderBottom: '1px solid var(--border)', paddingBottom: 0, overflowX: 'auto' }}>
      {ITEMS.map((it) => {
        const active = it.href === activeHref;
        return (
          <Link
            key={it.href}
            href={it.href}
            style={{
              padding: '9px 16px', fontSize: 13.5, fontWeight: 700, textDecoration: 'none', whiteSpace: 'nowrap',
              color: active ? 'var(--accent)' : 'var(--text-secondary)',
              borderBottom: active ? '2px solid var(--accent)' : '2px solid transparent',
              marginBottom: -1,
            }}
          >
            {it.label}
          </Link>
        );
      })}
    </div>
  );
}
