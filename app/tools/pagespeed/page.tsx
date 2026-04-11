import type { Metadata } from 'next';
import PageSpeedClient from './PageSpeedClient';
import SiteNav from '@/app/components/SiteNav';
import SiteFooter from '@/app/components/SiteFooter';

export const metadata: Metadata = {
  title: 'Free Shopify Speed Checker | Rachna Builds',
  description: 'Check your Shopify store\'s Google PageSpeed score in seconds. Get your mobile performance score + top 3 fixes — free.',
  alternates: {
    canonical: 'https://rachnabuilds.com/tools/pagespeed',
  },
  openGraph: {
    title: 'Free Shopify Speed Checker',
    description: 'Instant PageSpeed score for your Shopify store + the top 3 things slowing it down.',
    url: 'https://rachnabuilds.com/tools/pagespeed',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'Free Shopify Speed Checker — Rachna Builds' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Free Shopify Speed Checker — Rachna Builds',
    description: 'Instant PageSpeed score for your Shopify store + the top 3 things slowing it down.',
    images: ['/og-image.png'],
  },
};

export default function PageSpeedPage() {
  return (
    <>
      <SiteNav />
      <PageSpeedClient />
      <SiteFooter />
    </>
  );
}
