'use client';

// Phone bottom bar: the four places you go every day, plus "More" for the rest.
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

const ICON = {
  dash: <><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/></>,
  leads: <><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></>,
  money: <path d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>,
  bookings: <><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></>,
  outreach: <path d="M22 2 11 13M22 2l-7 20-4-9-9-4 20-7z"/>,
  more: <><circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/></>,
  clients: <><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></>,
  work: <><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></>,
  audits: <><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></>,
  prospects: <><path d="M4 4h16v4H4zM4 12h16v4H4zM4 20h10"/></>,
  notifications: <><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></>,
  calendar: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/></>,
  projects: <><path d="M3 7h18M3 12h18M3 17h12"/></>,
  settings: <><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></>,
};

const PRIMARY: { href: string; label: string; icon: keyof typeof ICON; match: string[] }[] = [
  { href: '/admin/dashboard', label: 'Dash', icon: 'dash', match: ['/admin/dashboard', '/admin'] },
  { href: '/admin/funnel-leads', label: 'Leads', icon: 'leads', match: ['/admin/funnel-leads'] },
  { href: '/admin/money', label: 'Money', icon: 'money', match: ['/admin/money'] },
  { href: '/admin/bookings', label: 'Bookings', icon: 'bookings', match: ['/admin/bookings'] },
];
const MORE: { href: string; label: string; icon: keyof typeof ICON; sub: string }[] = [
  { href: '/admin/storeproof', label: 'Store audits', icon: 'audits', sub: 'Reports, jobs, sharing' },
  { href: '/admin/clients', label: 'Clients', icon: 'clients', sub: 'Portal accounts' },
  { href: '/admin/projects', label: 'Projects', icon: 'projects', sub: 'Client work in progress' },
  { href: '/admin/outreach', label: 'Cold email', icon: 'outreach', sub: 'Pipeline, inboxes, replies' },
  { href: '/admin/prospects', label: 'Prospects', icon: 'prospects', sub: 'The Vela list' },
  { href: '/admin/notifications', label: 'Notifications', icon: 'notifications', sub: 'Push log and devices' },
  { href: '/admin/calendar', label: 'Calendar sync', icon: 'calendar', sub: 'Google Calendar' },
  { href: '/admin/portfolio', label: 'Portfolio', icon: 'work', sub: 'Website content' },
  { href: '/admin/settings', label: 'Settings', icon: 'settings', sub: 'Site settings' },
];

const Svg = ({ k }: { k: keyof typeof ICON }) => (
  <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>{ICON[k]}</svg>
);

export default function AdminMobileNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  useEffect(() => { setOpen(false); }, [pathname]);

  const isPrimary = (m: string[]) => m.some((p) => (p === '/admin' ? pathname === p : pathname.startsWith(p)));
  const moreActive = !PRIMARY.some((p) => isPrimary(p.match)) && pathname.startsWith('/admin');

  return (
    <>
      {open && (
        <div className="anm-sheet-bg" onClick={() => setOpen(false)}>
          <div className="anm-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="anm-sheet-handle" />
            {MORE.map((m) => (
              <Link key={m.href} href={m.href} className={`anm-sheet-item${pathname.startsWith(m.href) ? ' active' : ''}`}>
                <Svg k={m.icon} />
                <span><b>{m.label}</b><small>{m.sub}</small></span>
              </Link>
            ))}
          </div>
        </div>
      )}
      <nav className="admin-nav-mobile">
        {PRIMARY.map((p) => (
          <Link key={p.href} href={p.href} className={`anm-item${isPrimary(p.match) ? ' active' : ''}`}>
            <Svg k={p.icon} />
            <span>{p.label}</span>
          </Link>
        ))}
        <button type="button" className={`anm-item${open || moreActive ? ' active' : ''}`} onClick={() => setOpen(!open)} aria-expanded={open}>
          <Svg k="more" />
          <span>More</span>
        </button>
      </nav>
    </>
  );
}
