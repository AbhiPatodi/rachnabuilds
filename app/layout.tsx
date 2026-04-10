import type { Metadata } from "next";
import "./globals.css";
import { AnalyticsScripts } from "./components/AnalyticsScripts";
import { TawkChat } from "./components/TawkChat";
import { ExitIntentPopup } from "./components/ExitIntentPopup";
import { ThemeProvider } from "./components/ThemeProvider";

export const metadata: Metadata = {
  metadataBase: new URL('https://rachnabuilds.com'),
  title: "Rachna Builds — Shopify & E-Commerce Developer",
  description:
    "Rachna Jain — Shopify, WordPress, WooCommerce & Webflow developer. 4+ years, 50+ stores launched. Fast, conversion-focused builds.",
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
    title: "Rachna Builds — Shopify & E-Commerce Developer",
    description:
      "Rachna Jain — Shopify, WordPress, WooCommerce & Webflow developer. 4+ years, 50+ stores launched. Fast, conversion-focused builds.",
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
        <script dangerouslySetInnerHTML={{ __html: `try{const m=localStorage.getItem('rb_theme');const h=new Date().getHours();const auto=h>=6&&h<20?'light':'dark';document.documentElement.setAttribute('data-theme',m==='light'||m==='dark'?m:auto);}catch(e){}` }} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&family=Inter:wght@300;400;500;600&family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;1,400&family=JetBrains+Mono:wght@400;500&display=swap"
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
                "jobTitle": "Shopify & E-Commerce Developer",
                "description": "Shopify, WordPress, WooCommerce & Webflow developer with 4+ years experience and 50+ stores launched.",
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
                  "Shopify Development",
                  "Shopify Plus Development",
                  "WooCommerce Development",
                  "E-Commerce CRO",
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
