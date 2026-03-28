import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const DATABASE_URL =
  "postgresql://neondb_owner:npg_OSFG5QsjX2iT@ep-bitter-mud-aelteye5-pooler.c-2.us-east-2.aws.neon.tech/neondb?channel_binding=require&sslmode=require";

async function main() {
  const pool = new Pool({ connectionString: DATABASE_URL, ssl: true });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter } as any);

  // Delete existing if re-running
  const existing = await prisma.report.findUnique({
    where: { slug: "sage-and-veda-2026" },
  });
  if (existing) {
    await prisma.report.delete({ where: { id: existing.id } });
    console.log("Deleted existing report");
  }

  const passwordHash = await bcrypt.hash("sageandveda2026", 10);

  const report = await prisma.report.create({
    data: {
      slug: "sage-and-veda-2026",
      clientName: "Sage & Veda — Amar Japawar",
      clientEmail: "hello@sageandveda.com",
      passwordHash,
      isActive: true,
    },
  });

  console.log("Created report:", report.id);

  // ── Section 1: Executive Summary ──────────────────────────────────────────
  await prisma.reportSection.create({
    data: {
      reportId: report.id,
      sectionType: "executive_summary",
      title: "Executive Summary",
      displayOrder: 1,
      content: {
        text: "sageandveda.com is a Shopify store on the DT Theme (Debutify family) with serious performance, SEO, and CRO gaps that are costing conversions every day. The homepage currently weighs 32MB — 16× heavier than industry best practice — primarily due to SVG banners being used instead of optimised images. Klaviyo loads 8 times per page. There are zero H1 tags and zero structured data anywhere on the site. The cart page is completely bare. These are fixable, high-impact problems.",
        metrics: [
          { label: "Homepage Size", value: "32MB", note: "Target: <2MB" },
          { label: "DOM Content Loaded", value: "4.8s", note: "Target: <2s" },
          { label: "Klaviyo Loads", value: "8×", note: "Should be 1×" },
          { label: "H1 Tags", value: "0", note: "Every page needs one" },
          { label: "Structured Data", value: "None", note: "Critical for SEO" },
          { label: "JS Files / Page", value: "64–67", note: "Target: <20" },
        ],
      },
    },
  });

  // ── Section 2: Performance Audit ──────────────────────────────────────────
  await prisma.reportSection.create({
    data: {
      reportId: report.id,
      sectionType: "performance_audit",
      title: "Performance Audit",
      displayOrder: 2,
      content: {
        items: [
          "🔴 Homepage = 32MB total — SVG banners used as photos: New_roll-on_Banner_Shopify.svg (12.5MB), Roll-on_shopify_mobile_768x940.svg (12.5MB), banner_Jan.svg (3.2MB), Amrit_Jan_768x940.svg (3.2MB). Fix: re-export all as WebP, max 150KB each.",
          "🔴 DOM Content Loaded: 4.8 seconds (target: under 2s)",
          "🔴 Klaviyo loaded 8 times — critical script duplication bug causing repeated tracking calls",
          "🔴 Google Ads / GTM loaded twice — duplicate tracking tags",
          "🔴 9 render-blocking CSS files: dt-framework, dt-custom, swiper, select2, slick, font-all, and more",
          "🔴 64–67 JS files per page (target: under 20)",
          "🔴 Zero lazy loading on homepage images",
          "🔴 All Mulish font faces show status 'unloaded' — FOUT issue, no preload hints in <head>",
          "🟠 PDP = 5.7MB, recommended product images stuck as loading.gif (lazy-load broken on product page)",
        ],
      },
    },
  });

  // ── Section 3: SEO Audit ───────────────────────────────────────────────────
  await prisma.reportSection.create({
    data: {
      reportId: report.id,
      sectionType: "seo_audit",
      title: "SEO Audit",
      displayOrder: 3,
      content: {
        items: [
          "🔴 ZERO H1 tags on any page — homepage, collection, PDP, about page all missing H1",
          "🔴 ZERO structured data (JSON-LD) anywhere — no Product, Organization, FAQ, or Breadcrumb schema",
          "🔴 H2 content duplicated 3× on homepage — sections rendering in triplicate (theme bug)",
          "🔴 All page headings use H4 on About page — heading hierarchy broken site-wide",
          "🔴 Meta title includes domain: 'www.sageandveda.com – sage & veda' (wrong format, wastes characters)",
          "🔴 Meta description = 26 characters: 'Next global wellness house' — not keyword-optimised",
          "🔴 PDP meta description = 18 characters: 'Hydrating Body Oil' — not useful for search",
          "🟠 Collection page title: 'all – sage & veda' — generic, no keywords",
          "🟠 About page title: 'About – sage & veda' — no keywords",
          "🟠 No breadcrumb navigation anywhere on site",
          "🟠 No hreflang tags (international audience likely given pricing in USD)",
          "🟠 15 homepage images without alt text, 12 with empty alt attributes",
        ],
      },
    },
  });

  // ── Section 4: CRO Audit ──────────────────────────────────────────────────
  await prisma.reportSection.create({
    data: {
      reportId: report.id,
      sectionType: "cro_audit",
      title: "CRO Audit",
      displayOrder: 4,
      content: {
        items: [
          "🔴 Cart page completely bare — no upsell, no free shipping progress bar, no trust badges, no express checkout (Shop Pay / Apple Pay / Google Pay), no gift note option",
          "🔴 No sticky Add-to-Cart on PDP — button scrolls off-screen, user must scroll back up to purchase",
          "🔴 'PLEASE CHOOSE' variant default on homepage carousel — blocks add-to-cart for visitors who don't notice",
          "🔴 Star ratings not showing on collection page cards — Judge.me is enabled but not surfaced in theme card templates",
          "🔴 Only 2 reviews shown on homepage despite 25 reviews at 4.64★ average",
          "🟠 No free shipping callout near ATC button on PDP",
          "🟠 No shipping / returns information near Add-to-Cart",
          "🟠 Announcement bar offer '17% off + heart necklace with orders $65+' not reinforced near ATC",
          "🟠 'Design Themes' credit link in footer — unprofessional, should be removed",
          "🟠 Footer 'Contact Us' link duplicated twice in Quick Links",
          "🟠 No TikTok social link (only FB, Pinterest, Instagram, LinkedIn present)",
          "🟠 No Instagram feed / UGC section on homepage or PDPs",
          "🟠 No express checkout anywhere on site",
        ],
      },
    },
  });

  // ── Section 5: Competitor Analysis ────────────────────────────────────────
  await prisma.reportSection.create({
    data: {
      reportId: report.id,
      sectionType: "competitor_analysis",
      title: "Competitor Analysis",
      displayOrder: 5,
      content: {
        competitors: [
          {
            name: "Sage & Veda",
            size: "32MB 🔴",
            speed: "4.8s DCL 🔴",
            notes: "SVG banners, 64+ JS files, no H1, no schema, bare cart",
          },
          {
            name: "Indewild",
            size: "2.7MB ✅",
            speed: "Fast ✅",
            notes:
              "Instagram feed, video, Organization + WebSite schema, sticky header, TikTok presence",
          },
          {
            name: "Fable & Mane",
            size: "1.4MB ✅✅",
            speed: "Fastest ✅✅",
            notes:
              "Best performer. Full schema (WebSite + Organization + BreadcrumbList + ItemList), H1, Bundle Builder, multi-currency. 61 lazy-loaded images.",
          },
          {
            name: "Ranavat",
            size: "2.1MB ✅",
            speed: "Good ✅",
            notes:
              "449 lazy-loaded images, video homepage, Skin Quiz nav item, Instagram feed, Discovery sizes, Gift Cards",
          },
        ],
      },
    },
  });

  // ── Section 6: PDP Analysis ───────────────────────────────────────────────
  await prisma.reportSection.create({
    data: {
      reportId: report.id,
      sectionType: "pdp_analysis",
      title: "Reference PDP Analysis",
      displayOrder: 6,
      content: {
        text: "These are the four PDPs you referenced as benchmarks. Each does something exceptional worth replicating on Sage & Veda.",
        items: [
          "Hello Sanctuary (/products/red-panda): Charitable mission integrated near ATC ('Together we have raised $133,122 for Red Pandas'), 13 gallery images, Product schema, breadcrumbs, free shipping callout + 30-day guarantee near ATC. Page: 947KB.",
          "The Ouai (/products/detox-shampoo): Problem-first headline pattern ('OVERDID IT LAST WEEK? TIME TO DETOX.' before product name), sticky ATC, 'PERFECT FOR' benefit tags (Oiliness/Shine/Flaky scalp), scent story section, free sample selector. Page: 343KB.",
          "Rhode Skin (/products/glazing-milk): 'COMPLETE THE ROUTINE / THE RHODE KIT' cross-sell module below ATC — drives bundle revenue. Sticky ATC, video, 5 schema types. Page: 1.1MB.",
          "Olaplex (/products/n-3plus): 'CLINICAL RESULTS' section with data builds credibility for premium pricing. Sticky ATC, cross-sell Recommended Routine, video, 112 lazy images. Page: 2.2MB.",
        ],
      },
    },
  });

  // ── Section 7: Mockup Review ──────────────────────────────────────────────
  await prisma.reportSection.create({
    data: {
      reportId: report.id,
      sectionType: "mockup_review",
      title: "Homepage Mockup Review",
      displayOrder: 7,
      content: {
        text: "Your Canva mockup (amarjapawar.my.canva.site/sage-veda-website-2026) shows a strong editorial direction — dark background, warm off-white typography, serif font (Times), mood-led navigation. This is a significant upgrade from the current Debutify theme.",
        items: [
          "✅ Dark editorial aesthetic is on-brand and competitive — closest to Fable & Mane / Ranavat",
          "✅ Mood-led category navigation (face / hair / home / rituals / about) is a UX upgrade",
          "✅ Product storytelling first, SKU grid second — correct priority for wellness brand",
          "✅ 'OUR EVERYDAY ESSENTIAL' feature section builds hero product authority",
          "✅ Philosophy section ('our philosophy — Wellness, designed...') differentiates from competitors",
          "⚠️ Testimonials marked as placeholder — will need real review content before launch",
          "⚠️ Mobile rendering needs verification — dark + serif can be hard to read on small screens",
          "⚠️ 11 homepage sections is ambitious — ensure page weight stays under 2MB",
        ],
      },
    },
  });

  // ── Section 8: Action Plan ────────────────────────────────────────────────
  await prisma.reportSection.create({
    data: {
      reportId: report.id,
      sectionType: "action_plan",
      title: "Recommended Quick Wins",
      displayOrder: 8,
      content: {
        rows: [
          {
            label: "Replace 4 SVG banners → WebP",
            value: "32MB → ~2MB instantly",
            status: "critical",
          },
          {
            label: "Fix Klaviyo duplicate loading (8×→1×)",
            value: "Eliminates tracking errors",
            status: "critical",
          },
          {
            label: "Fix GTM / Google Ads duplicate tags",
            value: "Clean analytics data",
            status: "critical",
          },
          {
            label: "Add H1 to every page template",
            value: "Baseline SEO requirement",
            status: "critical",
          },
          {
            label: "Add Product + Organization JSON-LD",
            value: "Rich snippets in search results",
            status: "critical",
          },
          {
            label: "Surface Judge.me stars on collection cards",
            value: "Social proof at browse stage",
            status: "high",
          },
          {
            label: "Fix 'PLEASE CHOOSE' variant default",
            value: "Remove ATC blocker",
            status: "high",
          },
          {
            label: "Add sticky ATC to PDP",
            value: "Never lose the buy button",
            status: "high",
          },
          {
            label: "Add free shipping progress bar to cart",
            value: "Increase AOV",
            status: "high",
          },
          {
            label: "Remove 'Design Themes' footer credit",
            value: "Professional appearance",
            status: "medium",
          },
        ],
      },
    },
  });

  // ── Section 9: Proposal ───────────────────────────────────────────────────
  await prisma.reportSection.create({
    data: {
      reportId: report.id,
      sectionType: "proposal",
      title: "Proposal & Pricing",
      displayOrder: 9,
      content: {
        text: "Based on the audit and your RFP, here is the proposed scope for Sage & Veda. Ohana Earth pricing will follow separately at approximately 65% of these rates (simpler scope, launch phase).",
        items: [
          "CRO Implementation — $4,500: Sticky ATC, cart optimisation (free shipping bar, upsell, trust badges, express checkout), fix PLEASE CHOOSE bug, surface Judge.me stars on collection cards, fix lazy loading, announcement bar near ATC",
          "SEO Implementation — $3,000: H1 tags across all templates, Product + Organization + BreadcrumbList JSON-LD, fix meta titles / descriptions across homepage / collection / PDP / about, image alt text audit, heading hierarchy fix",
          "Performance Optimisation — $2,000: SVG → WebP conversion, Klaviyo/GTM deduplication, CSS/JS bundle reduction, font preloading, lazy load implementation",
          "Optional: Theme Migration (custom editorial build based on mockup) — $5,500: Full custom Shopify theme, dark editorial aesthetic, mood-led navigation, all CRO/SEO built-in from day one",
          "Optional: Monthly Retainer — $1,200/month: Ongoing CRO testing, analytics review, content updates, priority support",
          "Timeline: 10–12 weeks for full implementation. 2 weeks for quick wins only.",
          "Payment: 50% upfront, 50% on final delivery. Revision rounds: 2 included.",
        ],
      },
    },
  });

  // ── Section 10: Project Status ────────────────────────────────────────────
  await prisma.reportSection.create({
    data: {
      reportId: report.id,
      sectionType: "project_status",
      title: "Project Status",
      displayOrder: 10,
      content: {
        rows: [
          { label: "Audit Delivered", value: "March 2026", status: "done" },
          { label: "Proposal Sent", value: "March 2026", status: "done" },
          {
            label: "Scope Confirmation",
            value: "Pending your response",
            status: "pending",
          },
          { label: "Kickoff Call", value: "TBD", status: "pending" },
          {
            label: "Phase 1: Quick Wins",
            value: "Week 1–2 after kickoff",
            status: "pending",
          },
          { label: "Phase 2: CRO + SEO", value: "Week 3–8", status: "pending" },
          {
            label: "Phase 3: Testing + Launch",
            value: "Week 9–12",
            status: "pending",
          },
        ],
      },
    },
  });

  console.log("Created 10 sections");

  // ── Client Documents ──────────────────────────────────────────────────────
  const documents = [
    {
      docType: "rfp",
      title: "Website Optimization RFP",
      url: "https://www.canva.com",
      notes: "Original RFP document from Amar Japawar (March 2026)",
    },
    {
      docType: "mockup",
      title: "Homepage Design Mockup",
      url: "https://amarjapawar.my.canva.site/sage-veda-website-2026",
      notes:
        "Dark editorial mockup — approved direction for theme migration",
    },
    {
      docType: "competitor_ref",
      title: "Competitor Reference: Indewild",
      url: "https://indewild.com",
      notes:
        "Ayurvedic competitor — note schema, Instagram feed, TikTok presence",
    },
    {
      docType: "competitor_ref",
      title: "Competitor Reference: Fable & Mane",
      url: "https://fableandmane.com",
      notes: "Best performer at 1.4MB — target benchmark for page size",
    },
    {
      docType: "competitor_ref",
      title: "Competitor Reference: Ranavat",
      url: "https://ranavat.com",
      notes:
        "Strong merchandising — Skin Quiz, Discovery sizes, 449 lazy images",
    },
    {
      docType: "competitor_ref",
      title: "Reference PDP: The Ouai",
      url: "https://theouai.com/products/detox-shampoo",
      notes: "Problem-first headline + sticky ATC + benefit tags pattern",
    },
    {
      docType: "competitor_ref",
      title: "Reference PDP: Rhode Skin",
      url: "https://rhodeskin.com/products/glazing-milk",
      notes: "COMPLETE THE ROUTINE cross-sell module near ATC",
    },
  ];

  for (const doc of documents) {
    await prisma.clientDocument.create({
      data: {
        reportId: report.id,
        ...doc,
      },
    });
  }

  console.log("Created 7 client documents");
  console.log("✅ Seed complete!");

  await prisma.$disconnect();
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
