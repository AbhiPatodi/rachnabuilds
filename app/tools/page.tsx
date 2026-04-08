import type { Metadata } from 'next';
import Link from 'next/link';
import './tools.css';
import SiteNav from '@/app/components/SiteNav';
import SiteFooter from '@/app/components/SiteFooter';

export const metadata: Metadata = {
  title: 'Free E-Commerce Tools | Rachna Builds',
  description: 'Free tools for Shopify and WordPress store owners — speed checker, CRO checklist, and personal store audit. No signup required.',
};

export default function ToolsPage() {
  return (
    <>
      <SiteNav />
    <div className="tool-page">
      <div style={{ height: 72 }} />

      <div className="tool-hero">
        <div className="tool-tag">Free · No Signup Required</div>
        <h1 className="tool-h1">Free E-Commerce Tools</h1>
        <p className="tool-sub">
          Everything you need to diagnose and improve your Shopify or WordPress store&apos;s performance.<br />
          Built by an e-commerce consultant who uses these daily.
        </p>
      </div>

      <div className="tools-grid">
        <Link href="/free-audit" className="tools-card">
          <div className="tools-card-icon">🔍</div>
          <div className="tools-card-badge">Most Popular</div>
          <h2>Free Store Audit</h2>
          <p>
            Get a personal 15-minute Loom video review of your Shopify or WordPress store
            with specific, actionable recommendations. No pitch. No obligation.
          </p>
          <ul className="tools-card-list">
            <li>✓ Personal video walkthrough</li>
            <li>✓ Speed + conversion analysis</li>
            <li>✓ Prioritised action list</li>
            <li>✓ Delivered within 24–48 hours</li>
          </ul>
          <div className="tools-card-cta">Request Free Audit →</div>
        </Link>

<Link href="/tools/cro-checklist" className="tools-card">
          <div className="tools-card-icon">📋</div>
          <h2>CRO Checklist</h2>
          <p>
            The exact 50-point checklist used on every client audit. Covers homepage,
            product pages, checkout, navigation, and trust signals.
          </p>
          <ul className="tools-card-list">
            <li>✓ 50 actionable checkpoints</li>
            <li>✓ 5 categories covered</li>
            <li>✓ Interactive — track your score</li>
            <li>✓ Free, instant access</li>
          </ul>
          <div className="tools-card-cta">Get Free Checklist →</div>
        </Link>
      </div>

      <div className="tools-footer-cta">
        <h2>Want an expert to do this for you?</h2>
        <p>Book a free 30-minute call to discuss your store's specific challenges.</p>
        <Link href="/free-audit" className="tool-cta-btn">Get Free Audit →</Link>
      </div>
    </div>
      <SiteFooter />
    </>
  );
}
