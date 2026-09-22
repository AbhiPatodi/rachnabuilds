import type { Metadata } from 'next';
import FreeAuditClient from './FreeAuditClient';
import SiteNav from '@/app/components/SiteNav';
import SiteFooter from '@/app/components/SiteFooter';

export const metadata: Metadata = {
  title: 'Free Shopify Conversion Audit | Rachna Builds',
  description: 'Find out why your store gets traffic but not enough sales. Free automated conversion audit of your Shopify store — a report naming your real products and pages, in about 15 minutes. No pitch, no obligation.',
  alternates: {
    canonical: 'https://rachnabuilds.com/free-audit',
  },
  openGraph: {
    title: 'Free Shopify Conversion Audit',
    description: "Why isn't your store converting? A full conversion audit of your actual store, delivered in ~15 minutes. Free, no obligation.",
    url: 'https://rachnabuilds.com/free-audit',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'Free Store Audit — Rachna Builds' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Free Shopify Conversion Audit',
    description: "Why isn't your store converting? A full conversion audit of your actual store, delivered in ~15 minutes. Free, no obligation.",
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
