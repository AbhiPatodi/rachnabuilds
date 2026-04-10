/**
 * Seed script — Auric Skincare demo client
 * Run: cd rachna-nextjs && npx tsx scripts/seed-auric.ts
 */
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Creating Auric Skincare demo client...');

  const passwordHash = await bcrypt.hash('auric2026', 10);

  // Create client
  const client = await prisma.client.upsert({
    where: { slug: 'auric-skincare' },
    update: {},
    create: {
      name: 'Priya Mehta',
      email: 'priya@auricskincare.com',
      phone: '+91 98200 45112',
      slug: 'auric-skincare',
      passwordHash,
      isActive: true,
      clientProfile: {
        portalPassword: 'auric2026',
        businessName: 'Auric Skincare',
        website: 'auricskincare.com',
        instagram: '@auricskincare',
        notes: 'Premium ayurvedic skincare brand. Launching D2C Shopify store.',
      },
    },
  });

  console.log('✅ Client created:', client.id);

  // Create project
  const project = await prisma.clientProject.upsert({
    where: { id: 'cp_auric_p1' },
    update: {},
    create: {
      id: 'cp_auric_p1',
      clientId: client.id,
      name: 'Shopify Store — Phase 1 Build',
      clientType: 'new_build',
      platform: 'shopify',
      status: 'active',
      viewCount: 14,
      lastViewedAt: new Date('2026-04-07T14:30:00Z'),
      adminProfile: {
        proposalVisible: true,
        budget: '₹74,999',
        timeline: '6 weeks',
        notes: 'Demo client for portal pitch video. Full premium build.',
      },
      tabConfig: {
        tabs: ['overview', 'proposal', 'milestones', 'documents', 'contract', 'messages'],
      },
    },
  });

  console.log('✅ Project created:', project.id);

  // Milestones
  const milestones = [
    { title: 'Discovery & Brand Onboarding', description: 'Collect brand assets, fonts, colors, tone of voice, and product catalog.', status: 'completed', order: 1, dueDate: new Date('2026-03-15') },
    { title: 'Wireframes & Design Mockups', description: 'Homepage, PDP, Collection & Cart page designs in Figma.', status: 'completed', order: 2, dueDate: new Date('2026-03-22') },
    { title: 'Theme Development', description: 'Custom Shopify theme built from approved mockups. Mobile-first, performance-optimised.', status: 'completed', order: 3, dueDate: new Date('2026-04-01') },
    { title: 'Product Upload & Store Setup', description: 'Upload 28 SKUs, set up collections, SEO titles, and Shopify Payments.', status: 'in_progress', order: 4, dueDate: new Date('2026-04-10') },
    { title: 'Review & Revisions Round', description: 'Client walkthrough, feedback, and up to 2 rounds of changes.', status: 'pending', order: 5, dueDate: new Date('2026-04-16') },
    { title: 'Go-Live & Handover', description: 'DNS switch, final QA, walkthrough recording, and 30-day support period begins.', status: 'pending', order: 6, dueDate: new Date('2026-04-22') },
  ];

  for (const m of milestones) {
    await prisma.projectMilestone.create({
      data: { projectId: project.id, ...m },
    });
  }
  console.log('✅ Milestones created');

  // Documents
  const docs = [
    {
      docType: 'design',
      title: 'Figma Design Mockups — Homepage & PDP',
      url: 'https://www.figma.com/design/placeholder',
      notes: 'All 5 pages approved. Theme dev started.',
      approvedAt: new Date('2026-03-23T10:00:00Z'),
      approvedBy: 'Priya Mehta',
    },
    {
      docType: 'brand',
      title: 'Auric Brand Guide v1.2',
      url: 'https://drive.google.com/file/placeholder-brand',
      notes: 'Colors, fonts, logo variants, photography guidelines.',
      approvedAt: new Date('2026-03-16T09:00:00Z'),
      approvedBy: 'Priya Mehta',
    },
    {
      docType: 'deliverable',
      title: 'Theme Preview — Development Store',
      url: 'https://auric-dev.myshopify.com',
      notes: 'Password: auricpreview. Please review on mobile too.',
      approvedAt: null,
    },
    {
      docType: 'invoice',
      title: 'Invoice #RB-2026-031 — Advance Payment',
      url: 'https://drive.google.com/file/placeholder-invoice',
      notes: '₹37,500 received on 14 March 2026.',
      approvedAt: new Date('2026-03-14T00:00:00Z'),
      approvedBy: 'Priya Mehta',
    },
  ];

  for (const d of docs) {
    await prisma.projectDocument.create({
      data: { projectId: project.id, ...d },
    });
  }
  console.log('✅ Documents created');

  // Contract (signed)
  await prisma.projectContract.create({
    data: {
      projectId: project.id,
      phase: 1,
      phaseLabel: 'Phase 1 — Full Store Build',
      status: 'signed',
      clientSignature: 'Priya Mehta',
      signedAt: new Date('2026-03-13T11:45:00Z'),
      sentAt: new Date('2026-03-12T16:00:00Z'),
      advancePaid: true,
      balancePaid: false,
      advanceReceiptUrl: 'https://drive.google.com/file/placeholder-receipt',
      content: `SERVICE AGREEMENT — RACHNA BUILDS × AURIC SKINCARE

Project: Shopify D2C Store — Phase 1 Build
Client: Priya Mehta / Auric Skincare (auricskincare.com)
Service Provider: Rachna Jain / Rachna Builds (rachnabuilds.com)

## SCOPE OF WORK

1. Custom Shopify theme development (Homepage, PDP, Collection, Cart, About)
2. Brand identity integration — colors, typography, logo, photography style
3. Mobile-first responsive design, Lighthouse score ≥ 85
4. Product upload: up to 30 SKUs with SEO-optimised titles and descriptions
5. Shopify Payments + Razorpay integration
6. Collection structure & navigation setup
7. Basic SEO setup (meta titles, alt texts, sitemap)
8. 30-day post-launch support period

## INVESTMENT

Total: ₹74,999 + GST
- Advance (50%): ₹37,500 — Due before work begins ✅ Received 14 Mar 2026
- Balance (50%): ₹37,499 — Due before go-live

## TIMELINE

Estimated delivery: 6 weeks from advance receipt (by ~25 April 2026)
Milestones shared via client portal in real time.

## REVISIONS

Up to 2 rounds of revisions are included per milestone. Additional revisions billed at ₹2,000/hr.

## INTELLECTUAL PROPERTY

All custom code, designs, and assets become the property of Auric Skincare upon final payment.

## CANCELLATION

If the client cancels after work has begun, the advance is non-refundable. If Rachna Builds cancels, the full advance is refunded.

_By signing below, both parties agree to the terms above._`,
    },
  });
  console.log('✅ Contract created (signed)');

  // Sections
  const sections = [
    {
      sectionType: 'executive_summary',
      title: 'Project Overview',
      displayOrder: 0,
      content: {
        text: `## Welcome to Your Portal, Priya! 👋

Everything for your Auric Skincare Shopify build lives here — your project timeline, files, contract, and a direct line to ask questions.

### What We're Building
A premium, high-converting D2C Shopify store for Auric Skincare. Clean, minimalist, and rooted in your brand's ayurvedic identity — designed to earn trust and convert first-time visitors into loyal customers.

### Where We Are Right Now
We've completed 3 of 6 milestones. Theme development is done and the preview store is ready for your review. We're now loading products and configuring Shopify Payments.

**Estimated Go-Live:** 22 April 2026`,
      },
    },
    {
      sectionType: 'proposal',
      title: 'What's Included',
      displayOrder: 1,
      content: {
        items: [
          '✅ Custom Shopify theme — 5 core pages, fully mobile-optimised',
          '✅ Brand identity integration — your colors, fonts, and photography style baked in',
          '✅ Product upload — up to 30 SKUs with SEO titles and descriptions',
          '✅ Shopify Payments + Razorpay setup and testing',
          '✅ Collections, navigation, and search configuration',
          '✅ Basic SEO — meta titles, alt texts, structured data',
          '✅ Speed optimisation — Lighthouse score target ≥ 85',
          '✅ 30-day post-launch support (bugs, how-to questions, minor tweaks)',
        ],
      },
    },
    {
      sectionType: 'competitor_analysis',
      title: 'Design References',
      displayOrder: 2,
      content: {
        items: [
          '💡 Forest Essentials — premium ayurvedic, rich imagery, editorial product pages',
          '💡 Juicy Chemistry — clean D2C, ingredient-forward, high trust signals',
          '💡 Minimalist (India) — minimalist, data-driven product copy, high conversion rate',
          '💡 Dermatica (UK) — clear hero section with strong CTA, no clutter',
        ],
      },
    },
  ];

  for (const s of sections) {
    await prisma.projectSection.create({
      data: { projectId: project.id, ...s },
    });
  }
  console.log('✅ Sections created');

  // Sessions for analytics
  const sessionsData = [
    { sessionId: 'auric-s1', ip: '49.206.12.44', country: 'India', countryCode: 'IN', city: 'Mumbai', device: 'desktop', browser: 'Chrome', totalDuration: 840, startedAt: new Date('2026-04-01T10:12:00Z'), lastActiveAt: new Date('2026-04-01T10:26:00Z') },
    { sessionId: 'auric-s2', ip: '49.206.12.44', country: 'India', countryCode: 'IN', city: 'Mumbai', device: 'mobile', browser: 'Safari', totalDuration: 320, startedAt: new Date('2026-04-03T18:45:00Z'), lastActiveAt: new Date('2026-04-03T18:50:00Z') },
    { sessionId: 'auric-s3', ip: '49.206.12.44', country: 'India', countryCode: 'IN', city: 'Mumbai', device: 'desktop', browser: 'Chrome', totalDuration: 1200, startedAt: new Date('2026-04-06T11:00:00Z'), lastActiveAt: new Date('2026-04-06T11:20:00Z') },
    { sessionId: 'auric-s4', ip: '49.206.12.44', country: 'India', countryCode: 'IN', city: 'Mumbai', device: 'desktop', browser: 'Safari', totalDuration: 450, startedAt: new Date('2026-04-07T14:30:00Z'), lastActiveAt: new Date('2026-04-07T14:38:00Z') },
  ];

  for (const s of sessionsData) {
    await prisma.projectSession.upsert({
      where: { sessionId: s.sessionId },
      update: {},
      create: { projectId: project.id, ...s },
    });
  }
  console.log('✅ Sessions created');

  // A message from the client
  await prisma.projectMessage.create({
    data: {
      projectId: project.id,
      senderType: 'client',
      text: 'Hi Rachna! Just reviewed the theme preview — it looks absolutely stunning 😍 The homepage hero is exactly what I envisioned. One small thing — can we try a slightly warmer beige for the background instead of pure white? Like #FAF7F2 maybe?',
      readByAdmin: true,
      readByClient: true,
    },
  });

  await prisma.projectMessage.create({
    data: {
      projectId: project.id,
      senderType: 'admin',
      text: 'So glad you love it, Priya! 🎉 Yes, absolutely — #FAF7F2 is a great call, it\'ll complement the gold accents beautifully. I\'ll update all 5 pages and ping you once it\'s live on the preview. Should have it done by tomorrow morning!',
      readByAdmin: true,
      readByClient: true,
    },
  });

  console.log('✅ Messages created');
  console.log('\n✨ Auric Skincare demo client fully seeded!');
  console.log('  Portal URL: /portal/auric-skincare/cp_auric_p1');
  console.log('  Password: auric2026');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
