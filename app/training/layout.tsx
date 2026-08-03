import type { Metadata } from 'next';
import './funnel.css';

export const metadata: Metadata = {
  title: 'Free Training — 2%+ Converting Shopify Store | Rachna Builds',
  description:
    'Free training for DTC e-commerce brands: increase your Shopify store conversion rate to 2%+ consistently without increasing ad spend.',
  robots: { index: false, follow: false },
};

export default function FunnelLayout({ children }: { children: React.ReactNode }) {
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
