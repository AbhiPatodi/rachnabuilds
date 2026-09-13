import type { Metadata } from 'next';
import SiteNav from '@/app/components/SiteNav';
import SiteFooter from '@/app/components/SiteFooter';
import LegalPage from '@/app/components/LegalPage';

export const metadata: Metadata = {
  title: 'Privacy Policy | Rachna Builds',
  description:
    'How Rachna Builds collects, uses, stores and protects your personal information — including data received from Facebook and Instagram lead forms.',
  alternates: { canonical: 'https://rachnabuilds.com/privacy' },
};

export default function PrivacyPolicyPage() {
  return (
    <>
      <SiteNav />
      <LegalPage title="Privacy Policy" updated="13 September 2026">
        <p>
          Rachna Builds (&ldquo;we&rdquo;, &ldquo;us&rdquo;) designs and builds Shopify and
          WordPress stores for e-commerce brands. This policy explains what personal information we
          collect, why we collect it, how we use it, and the choices you have. It applies to
          rachnabuilds.com and to enquiries you send us through any of our forms, including lead
          forms on Facebook and Instagram.
        </p>

        <h2>Information we collect</h2>
        <p>We only collect information you give us, plus basic analytics. Specifically:</p>
        <ul>
          <li>
            <strong>Contact details you submit</strong> — your name, email address, phone or
            WhatsApp number, and your website or store URL, when you fill in a form on our site or a
            lead form on one of our Facebook or Instagram ads.
          </li>
          <li>
            <strong>Information about your business</strong> — anything you choose to tell us about
            your store, revenue range, challenges or timeline, so we can prepare for our
            conversation.
          </li>
          <li>
            <strong>Booking details</strong> — the date and time you select for a call, and the
            email address we send the confirmation to.
          </li>
          <li>
            <strong>Usage data</strong> — pages visited, time on page, approximate location by
            country, device and browser type, and how you arrived at our site. This is collected via
            Google Analytics and the Meta Pixel.
          </li>
        </ul>

        <h2>How we use it</h2>
        <ul>
          <li>To contact you about the store audit or enquiry you requested, by email or WhatsApp.</li>
          <li>To send booking confirmations and reminders for calls you have scheduled with us.</li>
          <li>To prepare and deliver the audit or proposal you asked for.</li>
          <li>To measure which of our ads and pages work, so we can spend our advertising budget sensibly.</li>
        </ul>
        <p>
          We do not sell your personal information, and we do not share it with anyone for their own
          marketing.
        </p>

        <h2>Facebook and Instagram lead forms</h2>
        <p>
          When you submit one of our lead forms on Facebook or Instagram, Meta passes us the details
          you entered — typically your name, email address and phone number — together with the name
          of the ad and campaign you responded to. We store those details in our own customer
          records so we can follow up with you, and we use them for nothing else. You can ask us to
          delete them at any time (see below).
        </p>

        <h2>Advertising and analytics tools</h2>
        <ul>
          <li>
            <strong>Google Analytics 4</strong> — aggregated website usage statistics.
          </li>
          <li>
            <strong>Meta Pixel and Conversions API</strong> — tells us which ads led to enquiries.
            When we send Meta a conversion event, any email address or phone number is hashed
            (irreversibly scrambled) before it leaves our server.
          </li>
        </ul>

        <h2>Where your data is stored</h2>
        <p>
          Our website runs on Vercel and our customer records are held in a Neon PostgreSQL
          database, both on servers located outside India. Email is sent through Gmail. Each of
          these providers is bound by its own data-processing terms. We keep enquiry records for as
          long as we may reasonably need them for follow-up and our own accounts, and delete them on
          request.
        </p>

        <h2>Your rights</h2>
        <p>
          You can ask us at any time to tell you what information we hold about you, to correct it,
          or to delete it entirely. You can also ask us to stop contacting you — replying
          &ldquo;stop&rdquo; to any message is enough. Email{' '}
          <a href="mailto:hello@rachnabuilds.com">hello@rachnabuilds.com</a> and we will action it
          within 30 days.
        </p>

        <h2>Cookies</h2>
        <p>
          We use cookies for analytics and advertising measurement as described above. You can block
          or delete cookies in your browser settings; the site will continue to work normally
          without them.
        </p>

        <h2>Children</h2>
        <p>
          Our services are sold to businesses. We do not knowingly collect information from anyone
          under 18.
        </p>

        <h2>Changes to this policy</h2>
        <p>
          If we change how we handle personal information we will update this page and change the
          date at the top.
        </p>

        <h2>Contact us</h2>
        <p>
          Questions about this policy or about your data: email{' '}
          <a href="mailto:hello@rachnabuilds.com">hello@rachnabuilds.com</a> or message us on{' '}
          <a href="https://wa.me/919404643510">WhatsApp</a>.
        </p>
      </LegalPage>
      <SiteFooter />
    </>
  );
}
