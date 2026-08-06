import type { Metadata } from "next";
import "./globals.css";
import { AnalyticsScripts } from "./components/AnalyticsScripts";
import { TawkChat } from "./components/TawkChat";
import { ExitIntentPopup } from "./components/ExitIntentPopup";
import { ThemeProvider } from "./components/ThemeProvider";

export const metadata: Metadata = {
  metadataBase: new URL('https://rachnabuilds.com'),
  title: "Rachna Builds — Shopify Conversion Optimization & Store Development",
  description:
    "Rachna Jain — Shopify conversion optimization specialist & store developer. I turn underperforming stores into 2%+ converting storefronts, and build new ones that convert from day one. 50+ stores, 4+ years.",
  keywords: [
    'Shopify conversion optimization', 'Shopify CRO specialist', 'Shopify conversion rate',
    'Shopify developer', 'Shopify expert', 'Shopify store build',
    'WooCommerce to Shopify migration', 'Shopify speed optimisation',
    'e-commerce developer India', 'Rachna Jain', 'Rachna Builds',
  ],
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "RB Admin",
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
  openGraph: {
    title: "Rachna Builds — Shopify Conversion Optimization & Store Development",
    description:
      "Shopify stores that convert — built, fixed, and scaled. 2%+ converting storefronts for D2C brands. 50+ stores, 4+ years.",
    url: "https://rachnabuilds.com",
    siteName: "Rachna Builds",
    type: "website",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Rachna Builds — Shopify & E-Commerce Developer",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    creator: "@rachnabuilds",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Prevent flash: set theme before paint */}
        <script dangerouslySetInnerHTML={{ __html: `try{const m=localStorage.getItem('rb_theme');document.documentElement.setAttribute('data-theme',m==='light'||m==='dark'?m:'dark');}catch(e){}` }} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&family=Inter:wght@300;400;500;600&family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;1,400&family=JetBrains+Mono:wght@400;500&family=Lexend:wght@400;700;900&family=DM+Sans:wght@400;500;600;700&family=Caveat:wght@400;700&display=swap"
          rel="stylesheet"
        />
        <meta name="theme-color" content="#06D6A0" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
        {/* JSON-LD: Person + ProfessionalService schema */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify({
            "@context": "https://schema.org",
            "@graph": [
              {
                "@type": "Person",
                "@id": "https://rachnabuilds.com/#person",
                "name": "Rachna Jain",
                "url": "https://rachnabuilds.com",
                "image": "https://rachnabuilds.com/og-image.png",
                "jobTitle": "Shopify Conversion Optimization Specialist & E-Commerce Developer",
                "description": "Shopify conversion optimization specialist and store developer with 4+ years experience and 50+ stores launched. Turns underperforming stores into 2%+ converting storefronts.",
                "sameAs": [
                  "https://www.linkedin.com/in/rachnabuilds",
                  "https://www.instagram.com/rachnabuilds"
                ]
              },
              {
                "@type": "ProfessionalService",
                "@id": "https://rachnabuilds.com/#service",
                "name": "Rachna Builds",
                "url": "https://rachnabuilds.com",
                "image": "https://rachnabuilds.com/og-image.png",
                "description": "Shopify store development, CRO, speed optimisation, and e-commerce consulting for global brands.",
                "founder": { "@id": "https://rachnabuilds.com/#person" },
                "areaServed": ["IN", "GB", "US", "AU", "FR"],
                "serviceType": [
                  "Shopify Conversion Optimization",
                  "Shopify Development",
                  "Shopify Plus Development",
                  "Platform Migration to Shopify",
                  "Shopify Speed Optimisation"
                ],
                "offers": {
                  "@type": "Offer",
                  "name": "Free Shopify Store Audit",
                  "price": "0",
                  "priceCurrency": "USD",
                  "url": "https://rachnabuilds.com/free-audit"
                }
              }
            ]
          })}}
        />
      </head>
      <body suppressHydrationWarning>
        {process.env.NEXT_PUBLIC_META_PIXEL_ID && (
          <noscript>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              height="1"
              width="1"
              style={{ display: 'none' }}
              src={`https://www.facebook.com/tr?id=${process.env.NEXT_PUBLIC_META_PIXEL_ID}&ev=PageView&noscript=1`}
              alt=""
            />
          </noscript>
        )}
        <ThemeProvider>
          {children}
          <AnalyticsScripts />
          <TawkChat />
          <ExitIntentPopup />
        </ThemeProvider>
      </body>
    </html>
  );
}
