'use client'
import Script from 'next/script'
import { Analytics } from '@vercel/analytics/react'

export function AnalyticsScripts() {
  const ga4Id = process.env.NEXT_PUBLIC_GA4_ID
  const clarityId = process.env.NEXT_PUBLIC_CLARITY_ID

  return (
    <>
      {/* Vercel Analytics — always on */}
      <Analytics />

      {/* Google Analytics 4 */}
      {ga4Id && (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${ga4Id}`}
            strategy="afterInteractive"
          />
          <Script id="ga4-init" strategy="afterInteractive">{`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${ga4Id}', { page_path: window.location.pathname });
          `}</Script>
        </>
      )}

      {/* Microsoft Clarity — heatmaps + session recordings */}
      {clarityId && (
        <Script id="clarity-init" strategy="afterInteractive">{`
          (function(c,l,a,r,i,t,y){
            c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
            t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
            y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
          })(window,document,"clarity","script","${clarityId}");
        `}</Script>
      )}
    </>
  )
}
