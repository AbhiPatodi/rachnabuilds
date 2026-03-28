import { prisma } from "@/lib/prisma";
import BlogListClient from "./BlogListClient";

export const dynamic = "force-dynamic";

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
    </>
  );
}
