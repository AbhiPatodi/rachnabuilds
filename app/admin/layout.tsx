import './admin.css';
import Link from 'next/link';
import LogoutButton from './LogoutButton';
import AdminNav from './AdminNav';
import AdminMobileNav from './AdminMobileNav';
import { PushSubscribeButton } from '@/app/components/PushSubscribeButton';
import { ThemeToggle } from '@/app/components/ThemeToggle';

export const dynamic = 'force-dynamic';

const LogoSVG = () => (
  <svg viewBox="0 0 64 72" fill="none" width="28" height="32">
    <rect width="11" height="72" fill="currentColor"/>
    <rect width="42" height="11" fill="currentColor"/>
    <path d="M42 0Q64 0 64 16Q64 32 42 32" stroke="currentColor" strokeWidth="11" fill="none"/>
    <rect y="27" width="38" height="11" fill="currentColor"/>
    <path d="M36 38L64 72" stroke="currentColor" strokeWidth="11" strokeLinecap="square"/>
  </svg>
);

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="admin-layout">
      {/* Desktop sidebar — hidden on mobile via CSS */}
      <aside className="admin-sidebar">
        <Link href="/admin/dashboard" className="admin-sidebar-logo">
          <span className="admin-sidebar-logo-mark">
            <LogoSVG />
          </span>
          <div className="admin-sidebar-logo-text">
            <span className="brand">Rachna Builds</span>
            <span className="panel">Admin Panel</span>
          </div>
        </Link>

        <AdminNav />

        <div className="admin-sidebar-footer">
          <div style={{ padding: '0 0 8px 0' }}>
            <PushSubscribeButton />
          </div>
          <div style={{ padding: '0 0 8px 0' }}>
            <ThemeToggle className="admin-theme-toggle" />
          </div>
          <LogoutButton />
        </div>
      </aside>

      <main className="admin-main">
        {children}
      </main>

      {/* Mobile bottom nav — rendered outside aside so display:none on aside doesn't suppress it */}
      <AdminMobileNav />
    </div>
  );
}
