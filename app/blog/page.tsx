import type { Metadata } from 'next';
import { prisma } from "@/lib/prisma";
import BlogListClient from "./BlogListClient";
import SiteNav from "@/app/components/SiteNav";
import SiteFooter from "@/app/components/SiteFooter";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: 'Blog & Insights | Rachna Builds',
  description: 'Practical guides on Shopify, WordPress, and e-commerce growth. Tips on speed, SEO, conversion rate optimisation, and running a better online store.',
  alternates: {
    canonical: 'https://rachnabuilds.com/blog',
  },
  openGraph: {
    title: 'Blog & Insights — Rachna Builds',
    description: 'Practical Shopify and WordPress guides from an e-commerce developer. Speed, SEO, CRO, and store growth tips.',
    url: 'https://rachnabuilds.com/blog',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'Rachna Builds Blog' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Blog & Insights — Rachna Builds',
    description: 'Practical Shopify and WordPress guides from an e-commerce developer.',
    images: ['/og-image.png'],
  },
};

export default async function BlogPage() {
  const posts = await prisma.blogPost.findMany({
    where: { isPublished: true },
    orderBy: { publishedAt: "desc" },
    select: {
      id: true,
      title: true,
      slug: true,
      excerpt: true,
      coverImage: true,
      tags: true,
      publishedAt: true,
      createdAt: true,
    },
  });

  return (
    <>
      <SiteNav />
      <style>{`
        .blog-page {
          min-height: 100vh;
          background: var(--bg);
          padding-top: 80px;
        }
        .blog-hero {
          padding: clamp(60px, 10vw, 120px) clamp(20px, 4vw, 48px) clamp(48px, 6vw, 80px);
          max-width: 1200px;
          margin: 0 auto;
          text-align: center;
        }
        .blog-hero-label {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          font-family: var(--mono);
          font-size: 11px;
          font-weight: 600;
          letter-spacing: .14em;
          text-transform: uppercase;
          color: var(--accent);
          margin-bottom: 20px;
        }
        .blog-hero-label::before {
          content: '';
          width: 20px;
          height: 2px;
          background: var(--accent);
          border-radius: 2px;
        }
        .blog-hero h1 {
          font-family: var(--heading);
          font-weight: 700;
          font-size: clamp(40px, 7vw, 72px);
          line-height: 1.05;
          letter-spacing: -.04em;
          margin-bottom: 20px;
          color: var(--text);
        }
        .blog-hero p {
          font-size: clamp(15px, 1.8vw, 18px);
          color: var(--text-secondary);
          line-height: 1.65;
          max-width: 520px;
          margin: 0 auto;
        }
        .blog-body {
          max-width: 1200px;
          margin: 0 auto;
          padding: 0 clamp(20px, 4vw, 48px) clamp(60px, 8vw, 100px);
        }
      `}</style>

      <div className="blog-page">
        <div className="blog-hero">
          <div className="blog-hero-label">Blog &amp; Insights</div>
          <h1>Blog &amp; Insights</h1>
          <p>Thoughts on Shopify, e-commerce strategy, and building great online stores.</p>
        </div>
        <div className="blog-body">
          <BlogListClient posts={posts} />
        </div>
      </div>
      <SiteFooter />
    </>
  );
}
