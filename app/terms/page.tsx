import type { Metadata } from 'next';
import SiteNav from '@/app/components/SiteNav';
import SiteFooter from '@/app/components/SiteFooter';
import LegalPage from '@/app/components/LegalPage';

export const metadata: Metadata = {
  title: 'Terms of Service | Rachna Builds',
  description:
    'The terms that apply when you use rachnabuilds.com, book a free store audit, or engage Rachna Builds for Shopify design and development work.',
  alternates: { canonical: 'https://rachnabuilds.com/terms' },
};

export default function TermsPage() {
  return (
    <>
      <SiteNav />
      <LegalPage title="Terms of Service" updated="13 September 2026">
        <p>
          These terms apply when you use rachnabuilds.com, book a free store audit call, or engage
          Rachna Builds for design and development work. Please read them before booking.
        </p>

        <h2>Who we are</h2>
        <p>
          Rachna Builds is a Shopify design and development studio operating from India, founded and
          run by Rachna Jain. You can reach us at{' '}
          <a href="mailto:hello@rachnabuilds.com">hello@rachnabuilds.com</a>.
        </p>

        <h2>The free store audit</h2>
        <ul>
          <li>
            The audit call is genuinely free and carries no obligation to buy anything. It typically
            runs 30 minutes.
          </li>
          <li>
            During the call we review your store and point out the issues we believe are costing you
            conversions. You are welcome to act on that advice yourself, with your own team, or with
            another agency.
          </li>
          <li>
            Our observations are professional opinion based on a short review. We give no guarantee
            of any particular sales, conversion-rate or revenue outcome — results depend on your
            product, pricing, traffic, market and execution.
          </li>
          <li>
            We may decline or end a call if it becomes clear we are not a fit, and we ask the same
            courtesy in return. Please give us notice if you cannot attend a booked slot.
          </li>
        </ul>

        <h2>Paid engagements</h2>
        <p>
          Any design or development work is governed by a separate written proposal covering scope,
          price, timeline and payment schedule. Those project terms take precedence over this page
          wherever the two differ. In general:
        </p>
        <ul>
          <li>Projects start once the agreed advance payment is received.</li>
          <li>
            You own the final delivered work on full payment. We keep the right to show it in our
            portfolio unless you ask us in writing not to.
          </li>
          <li>
            Timelines assume you provide content, product information, brand assets and feedback
            when needed. Delays on that side move the delivery date.
          </li>
          <li>
            Third-party costs — Shopify subscription, apps, themes, fonts, hosting, domains — are
            yours unless the proposal says otherwise.
          </li>
        </ul>

        <h2>Your responsibilities</h2>
        <p>
          You confirm that you have the right to give us any content, images, logos or store access
          you share with us, and that the information you give us about your business is accurate.
          Please do not send us passwords over WhatsApp or email — we will ask for proper
          collaborator or staff access instead.
        </p>

        <h2>Website content</h2>
        <p>
          The text, design, case studies and images on this site belong to Rachna Builds or their
          respective owners and may not be copied for commercial use. Client store screenshots are
          shown as examples of our work; those brands own their own trademarks and content. Articles
          and guides on this site are general information, not tailored advice for your business.
        </p>

        <h2>Limitation of liability</h2>
        <p>
          To the extent permitted by law, our total liability arising from any engagement is limited
          to the fees you have paid us for that engagement. We are not liable for indirect losses
          such as lost profit, lost sales or lost data. Nothing here limits liability that cannot
          legally be limited.
        </p>

        <h2>Governing law</h2>
        <p>
          These terms are governed by the laws of India, and the courts at Indore, Madhya Pradesh
          will have jurisdiction over any dispute.
        </p>

        <h2>Changes</h2>
        <p>
          We may update these terms; the version on this page at the time you book or sign is the
          one that applies to you.
        </p>

        <h2>Contact</h2>
        <p>
          Anything unclear? Email <a href="mailto:hello@rachnabuilds.com">hello@rachnabuilds.com</a>{' '}
          or message us on <a href="https://wa.me/919404643510">WhatsApp</a> and we will explain in
          plain terms.
        </p>
      </LegalPage>
      <SiteFooter />
    </>
  );
}
