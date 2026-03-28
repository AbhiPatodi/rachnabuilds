import { prisma } from "@/lib/prisma";
import HomepageClient, {
  type HomepageProject,
  type HomepageTestimonial,
  type HomepageFaq,
  type HomepageStats,
  type ProjectStat,
  type HomepageService,
  type HomepageProcessStep,
  type HomepagePricingTier,
  type HomepageBlogPost,
} from "./HomepageClient";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [projectRows, testimonialRows, faqRows, settingRows, blogRows] = await Promise.all([
    prisma.project.findMany({
      where: { isVisible: true },
      orderBy: { displayOrder: "asc" },
    }),
    prisma.testimonial.findMany({
      where: { isVisible: true },
      orderBy: { displayOrder: "asc" },
    }),
    prisma.faq.findMany({
      where: { isVisible: true },
      orderBy: { displayOrder: "asc" },
    }),
    prisma.setting.findMany(),
    prisma.blogPost.findMany({
      where: { isPublished: true },
      orderBy: { publishedAt: "desc" },
      take: 3,
      select: { id: true, title: true, slug: true, excerpt: true, tags: true, publishedAt: true },
    }),
  ]);

  // Build settings map
  const settingsMap: Record<string, string> = {};
  for (const s of settingRows) {
    settingsMap[s.key] = s.value;
  }

  const stats: HomepageStats = {
    stat_stores: settingsMap["stat_stores"] ?? "50",
    stat_delivery: settingsMap["stat_delivery"] ?? "7",
    stat_countries: settingsMap["stat_countries"] ?? "12",
    stat_pagespeed: settingsMap["stat_pagespeed"] ?? "90",
    whatsapp_number: settingsMap["whatsapp_number"] ?? "919404643510",
    contact_email: settingsMap["contact_email"] ?? "rachnajain2103@gmail.com",
    availability_status: settingsMap["availability_status"] ?? "available",
    hero_typewriter: settingsMap["hero_typewriter"],
  };

  // Map DB rows to typed props (stats JSON needs casting)
  const projects: HomepageProject[] = projectRows.map((p) => ({
    id: p.id,
    title: p.title,
    description: p.description,
    tags: p.tags,
    liveUrl: p.liveUrl,
    stats: p.stats as ProjectStat[] | null,
    featured: p.featured,
    displayOrder: p.displayOrder,
  }));

  const testimonials: HomepageTestimonial[] = testimonialRows.map((t) => ({
    id: t.id,
    clientName: t.clientName,
    quote: t.quote,
    projectName: t.projectName,
    rating: t.rating,
    displayOrder: t.displayOrder,
  }));

  const faqs: HomepageFaq[] = faqRows.map((f) => ({
    id: f.id,
    question: f.question,
    answer: f.answer,
    displayOrder: f.displayOrder,
  }));

  // Parse services from settings JSON (fallback to hardcoded defaults if not seeded yet)
  const DEFAULT_SERVICES: HomepageService[] = [
    { iconKey: "shopify", title: "Shopify Development", description: "Custom Liquid themes, store migrations, app integrations, and product pages engineered to convert. From scratch builds to Shopify Plus enterprise solutions.", tags: ["Liquid", "Shopify Plus", "Migrations", "Apps"], featured: true },
    { iconKey: "wordpress", title: "WordPress & WooCommerce", description: "Full custom builds with clean PHP, bespoke themes, and seamless payments.", tags: ["PHP", "WooCommerce"] },
    { iconKey: "webflow", title: "Webflow Development", description: "Pixel-perfect builds with CMS, animations, and lead-capture forms.", tags: ["Webflow", "CMS"] },
    { iconKey: "speed", title: "Speed Optimization", description: "Core Web Vitals, LCP, CLS — measurable PageSpeed results, guaranteed.", tags: ["Core Web Vitals", "Performance"] },
    { iconKey: "email", title: "Email Marketing", description: "Klaviyo and Mailchimp — welcome flows, abandoned cart, revenue-driving sequences.", tags: ["Klaviyo", "Flows"] },
    { iconKey: "ai", title: "AI-Enhanced Delivery", description: "Modern AI tools mean faster builds, more iterations, higher quality.", tags: ["Claude AI", "Automation"] },
  ];

  const DEFAULT_PROCESS: HomepageProcessStep[] = [
    { num: "01", day: "Day 0", title: "Discovery", desc: "30-min call. Goals, brand, timeline. Hard questions upfront." },
    { num: "02", day: "Day 1-2", title: "Design", desc: "Full Figma mockup. You approve before code starts." },
    { num: "03", day: "Day 3-5", title: "Build", desc: "AI-enhanced dev. Daily Loom updates so you're never in the dark." },
    { num: "04", day: "Day 6", title: "Review", desc: "Your revision round. We polish every detail until 100%." },
    { num: "05", day: "Day 7", title: "Launch", desc: "Go live. Fully tested. 7-day post-launch support included." },
  ];

  const DEFAULT_MARQUEE = ["Shopify Expert","Custom Themes","WooCommerce","Webflow","Figma to Code","Speed Optimization","Klaviyo","AI-Enhanced","Shopify Plus","CRO Specialist"];

  const DEFAULT_PRICING: HomepagePricingTier[] = [
    {
      tier: "Starter",
      amount: "$500",
      description: "Clean, fast Shopify store for new brands and product launches.",
      features: ["Custom theme setup & configuration","Up to 3 page templates","Mobile-optimised design","Payment gateway setup","3 revision rounds","7-day post-launch support"],
      ctaText: "Get started →",
    },
    {
      tier: "Professional",
      amount: "$1,500",
      description: "Full custom build for brands serious about conversion and growth.",
      features: ["Everything in Starter","Custom Liquid theme development","Speed optimisation (90+ PageSpeed)","Klaviyo abandoned cart setup","Analytics & Meta Pixel","14-day post-launch support"],
      featured: true,
      popular: "Most Popular",
      ctaText: "Get started →",
    },
    {
      tier: "Enterprise",
      amount: "$3,000",
      description: "Complex builds, migrations, and Shopify Plus solutions.",
      features: ["Everything in Professional","Platform migrations (WooCommerce / Webflow)","Custom app integrations","Multi-currency & international","Shopify Plus features","Priority support & retainer options"],
      ctaText: "Let's discuss →",
    },
  ];

  let services: HomepageService[] = DEFAULT_SERVICES;
  let processSteps: HomepageProcessStep[] = DEFAULT_PROCESS;
  let marqueeTags: string[] = DEFAULT_MARQUEE;
  let pricingTiers: HomepagePricingTier[] = DEFAULT_PRICING;

  try {
    if (settingsMap["services"]) services = JSON.parse(settingsMap["services"]);
  } catch {}
  try {
    if (settingsMap["process_steps"]) processSteps = JSON.parse(settingsMap["process_steps"]);
  } catch {}
  try {
    if (settingsMap["marquee_tags"]) marqueeTags = JSON.parse(settingsMap["marquee_tags"]);
  } catch {}
  try {
    if (settingsMap["pricing_tiers"]) pricingTiers = JSON.parse(settingsMap["pricing_tiers"]);
  } catch {}

  const blogPosts: HomepageBlogPost[] = blogRows.map((b) => ({
    id: b.id,
    title: b.title,
    slug: b.slug,
    excerpt: b.excerpt,
    tags: b.tags,
    publishedAt: b.publishedAt,
  }));

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ProfessionalService',
    name: 'Rachna Builds',
    description: 'Shopify & E-Commerce Developer — Fast, conversion-optimised Shopify stores.',
    url: 'https://rachnabuilds.com',
    email: 'rachnajain2103@gmail.com',
    areaServed: 'Worldwide',
    serviceType: ['Shopify Development', 'E-commerce Development', 'Store Optimization'],
    sameAs: [
      'https://linkedin.com/in/rachnabuilds',
      'https://instagram.com/rachnabuilds',
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <HomepageClient
        projects={projects}
        testimonials={testimonials}
        faqs={faqs}
        stats={stats}
        services={services}
        processSteps={processSteps}
        marqueeTags={marqueeTags}
        pricingTiers={pricingTiers}
        blogPosts={blogPosts}
      />
    </>
  );
}
