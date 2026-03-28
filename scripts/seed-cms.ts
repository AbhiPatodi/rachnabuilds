import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

function createClient() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL!, ssl: true });
  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
}

const prisma = createClient();

async function main() {
  console.log("Seeding CMS data...");

  // ── Projects ──────────────────────────────────────────────────────────────
  await prisma.project.createMany({
    skipDuplicates: true,
    data: [
      {
        title: "Welevate Club",
        description:
          "Built a custom Shopify theme from scratch for a luxury membership club — clean animations, fast load times, and a checkout flow designed for conversion.",
        tags: ["Shopify", "Custom Theme", "Performance"],
        liveUrl: "",
        stats: [
          { label: "Load Time", value: "2.8s" },
          { label: "ATC Lift", value: "+40%" },
        ],
        featured: true,
        isVisible: true,
        displayOrder: 0,
      },
      {
        title: "Oh Little Wren",
        description:
          "Took a children's boutique from zero to launch in 6 days flat. Custom collection filtering, size guides, and a product page designed to stop the scroll.",
        tags: ["Shopify", "Theme Dev", "UX"],
        liveUrl: "",
        stats: [{ label: "Launch Time", value: "6 days" }],
        featured: true,
        isVisible: true,
        displayOrder: 1,
      },
      {
        title: "Galatea",
        description:
          "Bespoke Shopify build for a luxury jewelry brand. Multi-currency support, custom product configurator, and white-glove checkout experience.",
        tags: ["Shopify Plus", "Multi-currency", "Custom Dev"],
        liveUrl: "",
        stats: [],
        featured: true,
        isVisible: true,
        displayOrder: 2,
      },
      {
        title: "Revoo Concept",
        description:
          "Full redesign and performance overhaul for a streetwear brand. Stripped dead code, optimized images, rebuilt the theme — PageSpeed went from 38 to 92.",
        tags: ["Shopify", "Speed Optimization", "Redesign"],
        liveUrl: "",
        stats: [{ label: "PageSpeed", value: "38→92" }],
        featured: true,
        isVisible: true,
        displayOrder: 3,
      },
      {
        title: "MyWaveX",
        description:
          "Built a D2C subscription model for a surf lifestyle brand — Recharge integration, custom bundle builder, and recurring revenue from day one.",
        tags: ["Shopify", "Recharge", "Subscriptions"],
        liveUrl: "",
        stats: [],
        featured: true,
        isVisible: true,
        displayOrder: 4,
      },
      {
        title: "Halo Coffee",
        description:
          "Migrated a WooCommerce store to Shopify in 5 days without a single order lost. Full product, customer, and order history preserved.",
        tags: ["WooCommerce", "Shopify", "Migration"],
        liveUrl: "",
        stats: [
          { label: "Migration Time", value: "5 days" },
          { label: "Orders Lost", value: "0" },
        ],
        featured: true,
        isVisible: true,
        displayOrder: 5,
      },
    ],
  });
  console.log("✓ Projects seeded");

  // ── Testimonials ──────────────────────────────────────────────────────────
  await prisma.testimonial.createMany({
    skipDuplicates: true,
    data: [
      {
        clientName: "Marcus T.",
        quote:
          "Working with Rachna was an absolute game-changer. She delivered a beautiful, fast Shopify store in less time than I expected.",
        projectName: "Website Transfer & Backend Audit",
        rating: 5,
        isVisible: true,
        displayOrder: 0,
      },
      {
        clientName: "Priya S.",
        quote:
          "Rachna rebuilt our store from scratch and the results speak for themselves — 40% increase in add-to-cart rate within the first week.",
        projectName: "Shopify Store Customization",
        rating: 5,
        isVisible: true,
        displayOrder: 1,
      },
      {
        clientName: "James W.",
        quote:
          "Fast, professional, and genuinely invested in the outcome. Our PageSpeed went from 48 to 94 and sales jumped immediately.",
        projectName: "Speed Optimization & Theme Fix",
        rating: 5,
        isVisible: true,
        displayOrder: 2,
      },
      {
        clientName: "Sofia L.",
        quote:
          "I've worked with developers before but Rachna is different. She actually understands e-commerce, not just code.",
        projectName: "WooCommerce Development",
        rating: 5,
        isVisible: true,
        displayOrder: 3,
      },
      {
        clientName: "Aiden K.",
        quote:
          "The migration from WooCommerce to Shopify was seamless. Zero downtime, all data preserved, and the new store is so much faster.",
        projectName: "WooCommerce to Shopify Migration",
        rating: 5,
        isVisible: true,
        displayOrder: 4,
      },
      {
        clientName: "Nadia R.",
        quote:
          "Rachna delivered exactly what we needed — a Webflow site that looks stunning and performs even better.",
        projectName: "Webflow Website Build",
        rating: 5,
        isVisible: true,
        displayOrder: 5,
      },
    ],
  });
  console.log("✓ Testimonials seeded");

  // ── FAQs ──────────────────────────────────────────────────────────────────
  await prisma.faq.createMany({
    skipDuplicates: true,
    data: [
      {
        question: "How long does it take to build a Shopify store?",
        answer:
          "Most projects are completed within 5–7 business days for standard builds. Complex custom development can take 2–3 weeks. I'll give you a precise timeline before we start.",
        isVisible: true,
        displayOrder: 0,
      },
      {
        question: "How much does a Shopify store cost?",
        answer:
          "Basic store setups start from $500. Full custom theme builds typically range from $1,500–$4,000 depending on complexity. I'll send you a detailed quote after our discovery call.",
        isVisible: true,
        displayOrder: 1,
      },
      {
        question: "Do you work with international clients?",
        answer:
          "Yes — I've worked with clients across the US, UK, Australia, UAE, and Europe. All communication happens over Slack/WhatsApp and I accommodate different time zones.",
        isVisible: true,
        displayOrder: 2,
      },
      {
        question: "What if I need changes after launch?",
        answer:
          "Every project includes a revision window post-launch. I also offer ongoing support retainers if you need someone on call for updates and fixes.",
        isVisible: true,
        displayOrder: 3,
      },
      {
        question: "Can you redesign my existing store?",
        answer:
          "Absolutely. Store redesigns are one of my specialties — I audit your current setup, identify conversion killers, and rebuild with performance and UX in mind.",
        isVisible: true,
        displayOrder: 4,
      },
      {
        question: "Why should I hire you instead of an agency?",
        answer:
          "With an agency, you get a team of people who may never fully understand your brand. With me, you get direct communication, faster turnaround, and a developer who is personally invested in your results.",
        isVisible: true,
        displayOrder: 5,
      },
    ],
  });
  console.log("✓ FAQs seeded");

  // ── Settings ──────────────────────────────────────────────────────────────
  const settings: Array<{ key: string; value: string }> = [
    { key: "availability_status", value: "available" },
    { key: "whatsapp_number", value: "919404643510" },
    { key: "contact_email", value: "rachnajain2103@gmail.com" },
    { key: "stat_stores", value: "50" },
    { key: "stat_delivery", value: "7" },
    { key: "stat_countries", value: "12" },
    { key: "stat_pagespeed", value: "90" },
    { key: "hero_headline", value: "Your last developer missed deadlines and delivered a broken store." },
    { key: "hero_subtext", value: "Shopify, WooCommerce & Webflow — 4+ years, global clients, zero excuses." },
  ];

  for (const s of settings) {
    await prisma.setting.upsert({
      where: { key: s.key },
      update: { value: s.value },
      create: { key: s.key, value: s.value },
    });
  }
  console.log("✓ Settings seeded");

  console.log("Done! All CMS data seeded successfully.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
