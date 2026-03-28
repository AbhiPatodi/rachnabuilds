"use client";

import { useState } from "react";
import Link from "next/link";

type Post = {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  coverImage: string | null;
  tags: string[];
  publishedAt: Date | null;
  createdAt: Date;
};

const GRADIENTS = [
  "linear-gradient(135deg, rgba(6,214,160,.15) 0%, rgba(167,139,250,.1) 100%)",
  "linear-gradient(135deg, rgba(255,107,107,.12) 0%, rgba(251,191,36,.08) 100%)",
  "linear-gradient(135deg, rgba(167,139,250,.15) 0%, rgba(6,214,160,.08) 100%)",
  "linear-gradient(135deg, rgba(251,191,36,.12) 0%, rgba(255,107,107,.08) 100%)",
  "linear-gradient(135deg, rgba(99,102,241,.15) 0%, rgba(6,214,160,.1) 100%)",
  "linear-gradient(135deg, rgba(6,214,160,.1) 0%, rgba(99,102,241,.12) 100%)",
];

function formatDate(date: Date | null): string {
  if (!date) return "";
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default function BlogListClient({ posts }: { posts: Post[] }) {
  const allTags = Array.from(new Set(posts.flatMap((p) => p.tags))).sort();
  const [activeTag, setActiveTag] = useState<string | null>(null);

  const filtered = activeTag
    ? posts.filter((p) => p.tags.includes(activeTag))
    : posts;

  return (
    <>
      <style>{`
        .tag-bar {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          margin-bottom: 40px;
        }
        .tag-pill {
          font-family: var(--mono);
          font-size: 11px;
          font-weight: 600;
          padding: 6px 14px;
          border-radius: 100px;
          border: 1px solid var(--border);
          background: transparent;
          color: var(--text-secondary);
          cursor: pointer;
          transition: all .2s;
          letter-spacing: .04em;
        }
        .tag-pill:hover {
          border-color: var(--accent);
          color: var(--accent);
          background: var(--accent-dim);
        }
        .tag-pill.active {
          background: var(--accent);
          color: var(--bg);
          border-color: var(--accent);
        }
        .blog-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 20px;
        }
        @media (max-width: 900px) {
          .blog-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }
        @media (max-width: 560px) {
          .blog-grid {
            grid-template-columns: 1fr;
          }
        }
        .blog-card {
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: var(--radius);
          overflow: hidden;
          display: flex;
          flex-direction: column;
          transition: all .35s cubic-bezier(.16,1,.3,1);
          text-decoration: none;
          color: var(--text);
        }
        .blog-card:hover {
          border-color: var(--accent);
          transform: translateY(-4px);
          box-shadow: 0 16px 48px rgba(6,214,160,.08);
        }
        .blog-card-img {
          width: 100%;
          aspect-ratio: 16/9;
          object-fit: cover;
          display: block;
        }
        .blog-card-placeholder {
          width: 100%;
          aspect-ratio: 16/9;
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: var(--mono);
          font-size: 11px;
          letter-spacing: .1em;
          text-transform: uppercase;
          color: var(--text-muted);
        }
        .blog-card-body {
          padding: 20px;
          display: flex;
          flex-direction: column;
          flex: 1;
          gap: 10px;
        }
        .blog-card-tags {
          display: flex;
          gap: 6px;
          flex-wrap: wrap;
        }
        .blog-tag {
          font-family: var(--mono);
          font-size: 9px;
          font-weight: 600;
          padding: 3px 8px;
          border-radius: 100px;
          background: var(--accent-dim);
          color: var(--accent);
          border: 1px solid rgba(6,214,160,.2);
          letter-spacing: .06em;
          text-transform: uppercase;
        }
        .blog-card-title {
          font-family: var(--heading);
          font-size: 17px;
          font-weight: 700;
          line-height: 1.25;
          letter-spacing: -.01em;
          color: var(--text);
        }
        .blog-card:hover .blog-card-title {
          color: var(--accent);
        }
        .blog-card-excerpt {
          font-size: 13px;
          color: var(--text-secondary);
          line-height: 1.6;
          display: -webkit-box;
          -webkit-line-clamp: 3;
          -webkit-box-orient: vertical;
          overflow: hidden;
          flex: 1;
        }
        .blog-card-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-top: 4px;
          padding-top: 12px;
          border-top: 1px solid var(--border);
        }
        .blog-card-date {
          font-family: var(--mono);
          font-size: 10px;
          color: var(--text-muted);
          letter-spacing: .04em;
        }
        .blog-card-link {
          font-size: 12px;
          font-weight: 600;
          color: var(--accent);
          display: flex;
          align-items: center;
          gap: 4px;
          transition: gap .2s;
        }
        .blog-card:hover .blog-card-link {
          gap: 8px;
        }
        .blog-empty {
          text-align: center;
          padding: 80px 24px;
          color: var(--text-secondary);
        }
        .blog-empty h3 {
          font-family: var(--heading);
          font-size: 22px;
          font-weight: 600;
          margin-bottom: 10px;
          color: var(--text);
        }
        .blog-empty p {
          font-size: 14px;
          line-height: 1.6;
        }
      `}</style>

      {/* Tag filter bar */}
      {allTags.length > 0 && (
        <div className="tag-bar">
          <button
            className={`tag-pill${activeTag === null ? " active" : ""}`}
            onClick={() => setActiveTag(null)}
          >
            All
          </button>
          {allTags.map((tag) => (
            <button
              key={tag}
              className={`tag-pill${activeTag === tag ? " active" : ""}`}
              onClick={() => setActiveTag(activeTag === tag ? null : tag)}
            >
              {tag}
            </button>
          ))}
        </div>
      )}

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="blog-empty">
          <h3>No posts yet.</h3>
          <p>Check back soon — new content is on the way!</p>
        </div>
      ) : (
        <div className="blog-grid">
          {filtered.map((post, idx) => (
            <Link key={post.id} href={`/blog/${post.slug}`} className="blog-card">
              {post.coverImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={post.coverImage}
                  alt={post.title}
                  className="blog-card-img"
                />
              ) : (
                <div
                  className="blog-card-placeholder"
                  style={{ background: GRADIENTS[idx % GRADIENTS.length] }}
                >
                  Post
                </div>
              )}
              <div className="blog-card-body">
                {post.tags.length > 0 && (
                  <div className="blog-card-tags">
                    {post.tags.slice(0, 3).map((tag) => (
                      <span key={tag} className="blog-tag">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
                <div className="blog-card-title">{post.title}</div>
                {post.excerpt && (
                  <div className="blog-card-excerpt">{post.excerpt}</div>
                )}
                <div className="blog-card-footer">
                  <span className="blog-card-date">
                    {formatDate(post.publishedAt ?? post.createdAt)}
                  </span>
                  <span className="blog-card-link">
                    Read more →
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
