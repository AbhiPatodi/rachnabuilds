import type { Metadata } from 'next';
import FreeAuditClient from './FreeAuditClient';
import SiteNav from '@/app/components/SiteNav';
import SiteFooter from '@/app/components/SiteFooter';

export const metadata: Metadata = {
  title: 'Free Store Audit (Shopify & WordPress) | Rachna Builds',
  description: 'Get a free 15-minute personal Loom video audit of your Shopify or WordPress store. Specific, actionable recommendations — no pitch, no obligation.',
  alternates: {
    canonical: 'https://rachnabuilds.com/free-audit',
  },
  openGraph: {
    title: 'Free Store Audit — Shopify & WordPress',
    description: 'Personal 15-minute Loom review of your store with specific fixes. Free, no obligation.',
    url: 'https://rachnabuilds.com/free-audit',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'Free Store Audit — Rachna Builds' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Free Store Audit — Shopify & WordPress',
    description: 'Personal 15-minute Loom review of your store with specific fixes. Free, no obligation.',
    images: ['/og-image.png'],
  },
};

export default function FreeAuditPage() {
  return (
    <>
      <SiteNav />
      <FreeAuditClient />
      <SiteFooter />
    </>
  );
}
