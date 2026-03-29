import type { Metadata } from 'next';
import FreeAuditClient from './FreeAuditClient';

export const metadata: Metadata = {
  title: 'Free Shopify Store Audit | Rachna Builds',
  description: 'Get a free 15-minute personal Loom video audit of your Shopify store. Specific, actionable recommendations — no pitch, no obligation.',
  openGraph: {
    title: 'Free Shopify Store Audit',
    description: 'Personal 15-minute Loom review of your store with specific fixes. Free, no obligation.',
    url: 'https://rachnabuilds.com/free-audit',
  },
};

export default function FreeAuditPage() {
  return <FreeAuditClient />;
}
