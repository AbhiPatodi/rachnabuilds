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

const services = [
  { iconKey: "shopify", title: "Shopify Development", description: "Custom Liquid themes, store migrations, app integrations, and product pages engineered to convert. From scratch builds to Shopify Plus enterprise solutions.", tags: ["Liquid", "Shopify Plus", "Migrations", "Apps"], featured: true },
  { iconKey: "wordpress", title: "WordPress & WooCommerce", description: "Full custom builds with clean PHP, bespoke themes, and seamless payments.", tags: ["PHP", "WooCommerce"], featured: false },
  { iconKey: "webflow", title: "Webflow Development", description: "Pixel-perfect builds with CMS, animations, and lead-capture forms.", tags: ["Webflow", "CMS"], featured: false },
  { iconKey: "speed", title: "Speed Optimization", description: "Core Web Vitals, LCP, CLS — measurable PageSpeed results, guaranteed.", tags: ["Core Web Vitals", "Performance"], featured: false },
  { iconKey: "email", title: "Email Marketing", description: "Klaviyo and Mailchimp — welcome flows, abandoned cart, revenue-driving sequences.", tags: ["Klaviyo", "Flows"], featured: false },
  { iconKey: "ai", title: "AI-Enhanced Delivery", description: "Modern AI tools mean faster builds, more iterations, higher quality.", tags: ["Claude AI", "Automation"], featured: false },
];

const processSteps = [
  { num: "01", day: "Day 0", title: "Discovery", desc: "30-min call. Goals, brand, timeline. Hard questions upfront." },
  { num: "02", day: "Day 1-2", title: "Design", desc: "Full Figma mockup. You approve before code starts." },
  { num: "03", day: "Day 3-5", title: "Build", desc: "AI-enhanced dev. Daily Loom updates so you're never in the dark." },
  { num: "04", day: "Day 6", title: "Review", desc: "Your revision round. We polish every detail until 100%." },
  { num: "05", day: "Day 7", title: "Launch", desc: "Go live. Fully tested. 7-day post-launch support included." },
];

const marqueeTags = ["Shopify Expert","Custom Themes","WooCommerce","Webflow","Figma to Code","Speed Optimization","Klaviyo","AI-Enhanced","Shopify Plus","CRO Specialist"];

async function main() {
  await Promise.all([
    prisma.setting.upsert({ where: { key: "services" }, update: { value: JSON.stringify(services) }, create: { key: "services", value: JSON.stringify(services) } }),
    prisma.setting.upsert({ where: { key: "process_steps" }, update: { value: JSON.stringify(processSteps) }, create: { key: "process_steps", value: JSON.stringify(processSteps) } }),
    prisma.setting.upsert({ where: { key: "marquee_tags" }, update: { value: JSON.stringify(marqueeTags) }, create: { key: "marquee_tags", value: JSON.stringify(marqueeTags) } }),
  ]);
  console.log("✓ services, process_steps, marquee_tags seeded");
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
