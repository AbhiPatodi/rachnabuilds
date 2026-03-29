import type { Metadata } from 'next';
import CROChecklistClient from './CROChecklistClient';
import SiteNav from '@/app/components/SiteNav';
import SiteFooter from '@/app/components/SiteFooter';

export const metadata: Metadata = {
  title: '50-Point Shopify CRO Checklist | Rachna Builds',
  description: 'The exact 50-point checklist used for every Shopify store audit. Free download — homepage, product pages, cart, navigation, and trust signals.',
  openGraph: {
    title: '50-Point Shopify CRO Checklist',
    description: 'Free checklist covering homepage, product pages, cart & checkout, UX, and trust signals.',
    url: 'https://rachnabuilds.com/tools/cro-checklist',
  },
};

export default function CROChecklistPage() {
  return (
    <>
      <SiteNav />
      <CROChecklistClient />
      <SiteFooter />
    </>
  );
}
