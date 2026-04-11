import type { Metadata } from 'next';
import { prisma } from "@/lib/prisma";
import ContactClient from "./ContactClient";
import SiteNav from "@/app/components/SiteNav";
import SiteFooter from "@/app/components/SiteFooter";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: 'Contact | Rachna Builds',
  description: 'Get in touch with Rachna Jain — Shopify, WordPress & e-commerce developer. Quick response via WhatsApp or email. Let\'s talk about your store.',
  alternates: {
    canonical: 'https://rachnabuilds.com/contact',
  },
  openGraph: {
    title: 'Contact Rachna Builds',
    description: 'Reach out to discuss your Shopify or WordPress project. Fast response via WhatsApp or email.',
    url: 'https://rachnabuilds.com/contact',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'Contact Rachna Builds' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Contact Rachna Builds',
    description: 'Reach out to discuss your Shopify or WordPress project. Fast response via WhatsApp or email.',
    images: ['/og-image.png'],
  },
};

export default async function ContactPage() {
  const settings = await prisma.setting.findMany({
    where: { key: { in: ["whatsapp_number", "contact_email"] } },
  });
  const map: Record<string, string> = {};
  for (const s of settings) map[s.key] = s.value;

  const whatsappNumber = map["whatsapp_number"] ?? "919404643510";

  return (
    <>
      <SiteNav whatsappNumber={whatsappNumber} />
      <ContactClient
        whatsappNumber={whatsappNumber}
        contactEmail={map["contact_email"] ?? "rachnajain2103@gmail.com"}
      />
      <SiteFooter />
    </>
  );
}
