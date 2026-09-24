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
];

export const LEADS_HUB_PATHS = ITEMS.map((i) => i.href);

export default function LeadsSubNav() {
  const pathname = usePathname();
  return (
    <div style={{ display: 'flex', gap: 6, marginBottom: 18, borderBottom: '1px solid var(--border)', paddingBottom: 0 }}>
      {ITEMS.map((it) => {
        const active = pathname === it.href || pathname.startsWith(`${it.href}/`);
        return (
          <Link
            key={it.href}
            href={it.href}
            style={{
              padding: '9px 16px', fontSize: 13.5, fontWeight: 700, textDecoration: 'none',
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
