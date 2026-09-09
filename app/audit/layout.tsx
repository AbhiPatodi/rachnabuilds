import type { Metadata } from 'next';
import '../training/funnel.css';
import './audit.css';

export const metadata: Metadata = {
  title: 'Free Shopify Store Audit — Rachna Builds',
  description:
    'Claim a free 1:1 Shopify store audit: we find exactly where your store is leaking sales and hand you the 90-day pathway to a 2%+ conversion rate.',
  robots: { index: false, follow: false },
};

export default function AuditLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="fn-root">
      <header className="fn-header">
        <span className="fn-logo"><img src="/branding/rachna-builds-wordmark.svg" alt="Rachna Builds" style={{ height: 22, width: 'auto', display: 'block' }} /></span>
      </header>
      <main className="fn-main">{children}</main>
      <footer className="fn-footer">
        © {new Date().getFullYear()} Rachna Builds. All rights reserved.
      </footer>
    </div>
  );
}
