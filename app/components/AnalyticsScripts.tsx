'use client'
import Script from 'next/script'
import { usePathname } from 'next/navigation'
import { Analytics } from '@vercel/analytics/react'

// Our own admin/portal browsing is not marketing traffic. Loading the
// trackers there inflated every GA number with our own sessions, and — worse —
// fed the Meta Pixel our team's behaviour, which teaches the ad algorithm to
// find more people like us instead of like our prospects.
const INTERNAL_PREFIXES = ['/admin', '/admin-login', '/portal', '/reports']

export function AnalyticsScripts() {
  const pathname = usePathname()
  const isInternal = INTERNAL_PREFIXES.some(
    (p) => pathname === p || pathname?.startsWith(p + '/') || pathname?.startsWith(p),
  )

  const ga4Id = isInternal ? undefined : process.env.NEXT_PUBLIC_GA4_ID
  const clarityId = isInternal ? undefined : process.env.NEXT_PUBLIC_CLARITY_ID
  const metaPixelId = isInternal ? undefined : process.env.NEXT_PUBLIC_META_PIXEL_ID

  return (
    <>
      {/* Vercel Analytics — kept on everywhere; its dashboard is ours alone
          and never feeds an ad platform. */}
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

      {/* Meta Pixel — ads conversion tracking + retargeting audiences.
          Custom Lead/CompleteRegistration/Schedule events are fired from
          the training funnel pages themselves (see lib/metaPixel.ts). */}
      {metaPixelId && (
        <Script id="meta-pixel-init" strategy="afterInteractive">{`
          !function(f,b,e,v,n,t,s)
          {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
          n.callMethod.apply(n,arguments):n.queue.push(arguments)};
          if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
          n.queue=[];t=b.createElement(e);t.async=!0;
          t.src=v;s=b.getElementsByTagName(e)[0];
          s.parentNode.insertBefore(t,s)}(window, document,'script',
          'https://connect.facebook.net/en_US/fbevents.js');
          fbq('init', '${metaPixelId}');
          fbq('track', 'PageView');
        `}</Script>
      )}
    </>
  )
}
