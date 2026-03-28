import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Rachna Builds — Shopify & E-Commerce Developer",
  description:
    "Rachna Jain — Shopify, WooCommerce & Webflow developer. 4+ years, 50+ stores launched. Fast, conversion-focused builds.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "RB Admin",
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-theme="dark" suppressHydrationWarning>
      <head>
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
        <link rel="apple-touch-icon" href="/icon.svg" />
      </head>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
