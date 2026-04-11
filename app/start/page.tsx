import type { Metadata } from 'next';
import StartClient from './StartClient';

export const metadata: Metadata = {
  title: 'Start a Project | Rachna Builds',
  description: 'Tell us about your Shopify or WordPress project. Takes 2 minutes — get a response within 24 hours.',
  alternates: {
    canonical: 'https://rachnabuilds.com/start',
  },
  openGraph: {
    title: 'Start a Project — Rachna Builds',
    description: 'Ready to build or improve your store? Fill in a quick brief and get a response within 24 hours.',
    url: 'https://rachnabuilds.com/start',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'Start a Project — Rachna Builds' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Start a Project — Rachna Builds',
    description: 'Ready to build or improve your store? Fill in a quick brief and get a response within 24 hours.',
    images: ['/og-image.png'],
  },
};

export default function StartPage() {
  return <StartClient />;
}
