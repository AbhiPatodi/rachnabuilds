import type { Metadata } from 'next';
import FreeAuditClient from './FreeAuditClient';
import SiteNav from '@/app/components/SiteNav';
import SiteFooter from '@/app/components/SiteFooter';

export const metadata: Metadata = {
  title: 'Free Shopify Conversion Audit | Rachna Builds',
  description: 'Find out why your store gets traffic but not enough sales. Free 15-minute personal Loom video audit of your Shopify (or WordPress) store — specific conversion fixes, no pitch, no obligation.',
  alternates: {
    canonical: 'https://rachnabuilds.com/free-audit',
  },
  openGraph: {
    title: 'Free Shopify Conversion Audit',
    description: "Why isn't your store converting? Personal 15-minute Loom review with specific conversion fixes. Free, no obligation.",
    url: 'https://rachnabuilds.com/free-audit',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'Free Store Audit — Rachna Builds' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Free Shopify Conversion Audit',
    description: "Why isn't your store converting? Personal 15-minute Loom review with specific conversion fixes. Free, no obligation.",
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
