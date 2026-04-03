'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function AdminNav() {
  const pathname = usePathname();

  const isActive = (href: string) =>
    pathname === href || (href === '/admin/dashboard' && pathname === '/admin');

  return (
    <nav className="admin-nav">
      {/* Dashboard */}
      <Link
        href="/admin/dashboard"
        className={isActive('/admin/dashboard') ? 'active' : ''}
      >
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
          <rect x="3" y="3" width="7" height="7" rx="1"/>
          <rect x="14" y="3" width="7" height="7" rx="1"/>
          <rect x="14" y="14" width="7" height="7" rx="1"/>
          <rect x="3" y="14" width="7" height="7" rx="1"/>
        </svg>
        Dashboard
      </Link>

      {/* CONTENT */}
      <div className="admin-nav-section">Content</div>

      <Link
        href="/admin/portfolio"
        className={pathname.startsWith('/admin/portfolio') ? 'active' : ''}
      >
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
          <rect x="2" y="3" width="20" height="14" rx="2"/>
          <path d="M8 21h8M12 17v4"/>
        </svg>
        Portfolio
      </Link>

      <Link
        href="/admin/testimonials"
        className={pathname.startsWith('/admin/testimonials') ? 'active' : ''}
      >
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
        </svg>
        Testimonials
      </Link>

      <Link
        href="/admin/blog"
        className={pathname.startsWith('/admin/blog') ? 'active' : ''}
      >
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
          <path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
        </svg>
        Blog
      </Link>

      <Link
        href="/admin/faqs"
        className={pathname.startsWith('/admin/faqs') ? 'active' : ''}
      >
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
          <circle cx="12" cy="12" r="10"/>
          <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3M12 17h.01"/>
        </svg>
        FAQ
      </Link>

      {/* SOCIAL & LEADS */}
      <div className="admin-nav-section">Social &amp; Leads</div>

      <Link
        href="/admin/social"
        className={pathname.startsWith('/admin/social') ? 'active' : ''}
      >
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
          <circle cx="18" cy="5" r="3"/>
          <circle cx="6" cy="12" r="3"/>
          <circle cx="18" cy="19" r="3"/>
          <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
          <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
        </svg>
        Social Links
      </Link>

      <Link
        href="/admin/leads"
        className={pathname.startsWith('/admin/leads') ? 'active' : ''}
      >
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
          <circle cx="9" cy="7" r="4"/>
          <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>
        </svg>
        Leads
      </Link>

      {/* SETTINGS */}
      <div className="admin-nav-section">Settings</div>

      <Link
        href="/admin/settings"
        className={pathname.startsWith('/admin/settings') ? 'active' : ''}
      >
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
          <circle cx="12" cy="12" r="3"/>
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
        </svg>
        Site Settings
      </Link>

      {/* CLIENT PORTAL */}
      <div className="admin-nav-section">Client Portal</div>

      <Link
        href="/admin/clients"
        className={pathname.startsWith('/admin/clients') ? 'active' : ''}
      >
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
          <circle cx="9" cy="7" r="4"/>
          <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>
        </svg>
        Clients
      </Link>

    </nav>
  );
}
