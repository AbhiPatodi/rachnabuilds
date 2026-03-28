export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { JSX } from "react";

function formatDate(date: Date | null): string {
  if (!date) return "";
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function renderContent(text: string): JSX.Element[] {
  const paragraphs = text.split(/\n\n+/);
  const elements: JSX.Element[] = [];

  paragraphs.forEach((block, i) => {
    const lines = block.split("\n");

    // Check if this block is a list
    if (lines.every((l) => l.trimStart().startsWith("- "))) {
      elements.push(
        <ul key={i} className="post-list">
          {lines.map((l, j) => (
            <li key={j} dangerouslySetInnerHTML={{ __html: inlineFormat(l.replace(/^-\s+/, "")) }} />
          ))}
        </ul>
      );
      return;
    }

    // Single line checks
    if (lines.length === 1) {
      const line = lines[0];
      if (line.startsWith("# ")) {
        elements.push(
          <h1 key={i} className="post-h1" dangerouslySetInnerHTML={{ __html: inlineFormat(line.slice(2)) }} />
        );
        return;
      }
      if (line.startsWith("## ")) {
        elements.push(
          <h2 key={i} className="post-h2" dangerouslySetInnerHTML={{ __html: inlineFormat(line.slice(3)) }} />
        );
        return;
      }
      if (line.startsWith("### ")) {
        elements.push(
          <h3 key={i} className="post-h3" dangerouslySetInnerHTML={{ __html: inlineFormat(line.slice(4)) }} />
        );
        return;
      }
    }

    // Multi-line or normal paragraph
    const html = lines
      .map((l) => {
        if (l.startsWith("# ")) return `<h1 class="post-h1">${inlineFormat(l.slice(2))}</h1>`;
        if (l.startsWith("## ")) return `<h2 class="post-h2">${inlineFormat(l.slice(3))}</h2>`;
        if (l.startsWith("### ")) return `<h3 class="post-h3">${inlineFormat(l.slice(4))}</h3>`;
        if (l.trimStart().startsWith("- ")) return `<li>${inlineFormat(l.replace(/^-\s+/, ""))}</li>`;
        return inlineFormat(l);
      })
      .join("<br />");

    elements.push(
      <p key={i} className="post-p" dangerouslySetInnerHTML={{ __html: html }} />
    );
  });

  return elements;
}

function inlineFormat(text: string): string {
  // Bold: **text**
  let result = text.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  // Inline code: `code`
  result = result.replace(/`([^`]+)`/g, "<code class=\"post-code\">$1</code>");
  // Italic: *text*
  result = result.replace(/\*(.+?)\*/g, "<em>$1</em>");
  return result;
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const post = await prisma.blogPost.findUnique({
    where: { slug, isPublished: true },
  });

  if (!post) notFound();

  return (
    <>
      <style>{`
        .post-page {
          min-height: 100vh;
          background: var(--bg);
          padding-top: 80px;
        }
        .post-container {
          max-width: 760px;
          margin: 0 auto;
          padding: clamp(40px, 6vw, 80px) clamp(20px, 4vw, 48px) clamp(60px, 8vw, 100px);
        }
        .post-back {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 13px;
          font-weight: 600;
          color: var(--text-secondary);
          margin-bottom: 32px;
          transition: color .2s;
          text-decoration: none;
        }
        .post-back:hover {
          color: var(--accent);
        }
        .post-back svg {
          width: 14px;
          height: 14px;
          transition: transform .2s;
        }
        .post-back:hover svg {
          transform: translateX(-3px);
        }
        .post-cover {
          width: 100%;
          max-height: 500px;
          object-fit: cover;
          border-radius: var(--radius);
          margin-bottom: 32px;
          border: 1px solid var(--border);
        }
        .post-tags {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          margin-bottom: 20px;
        }
        .post-tag {
          font-family: var(--mono);
          font-size: 10px;
          font-weight: 600;
          padding: 4px 10px;
          border-radius: 100px;
          background: var(--accent-dim);
          color: var(--accent);
          border: 1px solid rgba(6,214,160,.2);
          letter-spacing: .06em;
          text-transform: uppercase;
        }
        .post-title {
          font-family: var(--heading);
          font-size: clamp(28px, 5vw, 42px);
          font-weight: 700;
          line-height: 1.1;
          letter-spacing: -.03em;
          color: var(--text);
          margin-bottom: 16px;
        }
        .post-meta {
          font-family: var(--mono);
          font-size: 12px;
          color: var(--text-muted);
          letter-spacing: .06em;
          margin-bottom: 32px;
        }
        .post-divider {
          height: 1px;
          background: var(--border);
          margin-bottom: 40px;
        }
        .post-content {
          color: var(--text-secondary);
          line-height: 1.75;
          font-size: 16px;
        }
        .post-content .post-h1 {
          font-family: var(--heading);
          font-size: clamp(24px, 3.5vw, 32px);
          font-weight: 700;
          color: var(--text);
          margin: 40px 0 16px;
          letter-spacing: -.03em;
          line-height: 1.15;
        }
        .post-content .post-h2 {
          font-family: var(--heading);
          font-size: clamp(20px, 2.5vw, 26px);
          font-weight: 700;
          color: var(--text);
          margin: 32px 0 12px;
          letter-spacing: -.02em;
          line-height: 1.2;
        }
        .post-content .post-h3 {
          font-family: var(--heading);
          font-size: 18px;
          font-weight: 600;
          color: var(--text);
          margin: 24px 0 10px;
        }
        .post-content .post-p {
          margin-bottom: 20px;
        }
        .post-content .post-list {
          margin: 0 0 20px 0;
          padding-left: 20px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .post-content .post-list li {
          list-style: none;
          position: relative;
          padding-left: 16px;
        }
        .post-content .post-list li::before {
          content: '';
          position: absolute;
          left: 0;
          top: 10px;
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: var(--accent);
          flex-shrink: 0;
        }
        .post-content .post-code {
          font-family: var(--mono);
          font-size: .85em;
          background: var(--bg-elevated);
          border: 1px solid var(--border);
          border-radius: 6px;
          padding: 2px 6px;
          color: var(--accent);
        }
        .cta-card {
          margin-top: 56px;
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: var(--radius);
          padding: clamp(28px, 4vw, 48px);
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 24px;
          flex-wrap: wrap;
        }
        .cta-card-text h3 {
          font-family: var(--heading);
          font-size: 22px;
          font-weight: 700;
          letter-spacing: -.02em;
          margin-bottom: 8px;
          color: var(--text);
        }
        .cta-card-text p {
          font-size: 14px;
          color: var(--text-secondary);
          line-height: 1.6;
          max-width: 360px;
        }
        .cta-card-btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          font-size: 14px;
          font-weight: 700;
          padding: 14px 28px;
          background: var(--accent);
          color: var(--bg);
          border-radius: var(--radius-sm);
          text-decoration: none;
          transition: all .3s;
          white-space: nowrap;
          font-family: var(--heading);
        }
        .cta-card-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 32px var(--accent-glow);
        }
      `}</style>

      <div className="post-page">
        <div className="post-container">
          <Link href="/blog" className="post-back">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 5l-7 7 7 7" />
            </svg>
            Back to Blog
          </Link>

          {post.coverImage && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={post.coverImage}
              alt={post.title}
              className="post-cover"
            />
          )}

          {post.tags.length > 0 && (
            <div className="post-tags">
              {post.tags.map((tag) => (
                <span key={tag} className="post-tag">
                  {tag}
                </span>
              ))}
            </div>
          )}

          <h1 className="post-title">{post.title}</h1>

          <div className="post-meta">
            {formatDate(post.publishedAt ?? post.createdAt)}
          </div>

          <div className="post-divider" />

          <div className="post-content">
            {renderContent(post.content)}
          </div>

          {/* CTA */}
          <div className="cta-card">
            <div className="cta-card-text">
              <h3>Want to work together?</h3>
              <p>
                Got a Shopify, WooCommerce, or Webflow project in mind? Let&apos;s talk — I&apos;d love to help bring your store to life.
              </p>
            </div>
            <Link href="/contact" className="cta-card-btn">
              Get in Touch →
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
