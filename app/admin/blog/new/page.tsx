'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

function toSlug(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

export default function NewBlogPostPage() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  const [excerpt, setExcerpt] = useState('');
  const [content, setContent] = useState('');
  const [coverImage, setCoverImage] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [isPublished, setIsPublished] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!slugManuallyEdited) {
      setSlug(toSlug(title));
    }
  }, [title, slugManuallyEdited]);

  const handleSlugChange = (val: string) => {
    setSlug(val);
    setSlugManuallyEdited(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!title.trim() || !slug.trim() || !content.trim()) {
      setError('Title, slug, and content are required');
      return;
    }
    setLoading(true);
    try {
      const tags = tagsInput
        .split(',')
        .map(t => t.trim())
        .filter(Boolean);
      const res = await fetch('/api/admin/blog', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, slug, excerpt, content, coverImage, tags, isPublished }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || 'Failed to create post');
        return;
      }
      const data = await res.json();
      router.push(`/admin/blog/${data.id}`);
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-content">
      <div className="admin-breadcrumb">
        <Link href="/admin/blog">Blog</Link>
        <span>/</span>
        <span className="current">New Post</span>
      </div>

      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">New Blog Post</h1>
          <p className="admin-page-subtitle">Create and publish a new article</p>
        </div>
      </div>

      {error && <div className="admin-alert admin-alert-error" style={{ marginBottom: 20 }}>{error}</div>}

      <form onSubmit={handleSubmit}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 20, alignItems: 'start' }}>
          {/* Left column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="admin-card">
              <div className="admin-field">
                <label className="admin-label" htmlFor="title">Title *</label>
                <input
                  id="title"
                  type="text"
                  className="admin-input"
                  placeholder="Post title"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  required
                />
              </div>

              <div className="admin-field">
                <label className="admin-label" htmlFor="slug">Slug *</label>
                <input
                  id="slug"
                  type="text"
                  className="admin-input"
                  placeholder="post-slug"
                  value={slug}
                  onChange={e => handleSlugChange(e.target.value)}
                  required
                />
                <div className="admin-slug-hint">URL: rachnabuilds.com/blog/{slug || 'post-slug'}</div>
              </div>

              <div className="admin-field">
                <label className="admin-label" htmlFor="content">Content *</label>
                <div className="admin-slug-hint" style={{ marginBottom: 6 }}>Markdown supported</div>
                <textarea
                  id="content"
                  className="admin-textarea"
                  placeholder="Write your post content here..."
                  value={content}
                  onChange={e => setContent(e.target.value)}
                  style={{ minHeight: 400, fontFamily: 'JetBrains Mono, monospace', fontSize: 13 }}
                  required
                />
              </div>

              <div className="admin-field">
                <label className="admin-label" htmlFor="excerpt">Excerpt</label>
                <textarea
                  id="excerpt"
                  className="admin-textarea"
                  placeholder="Short description shown in listings..."
                  value={excerpt}
                  onChange={e => setExcerpt(e.target.value)}
                  style={{ minHeight: 80 }}
                />
              </div>
            </div>
          </div>

          {/* Right column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="admin-card">
              <div className="admin-card-title" style={{ marginBottom: 16 }}>Publish</div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                <label className="admin-label" style={{ margin: 0 }}>Published</label>
                <button
                  type="button"
                  onClick={() => setIsPublished(v => !v)}
                  style={{
                    width: 44,
                    height: 24,
                    borderRadius: 12,
                    border: 'none',
                    background: isPublished ? 'var(--accent)' : 'var(--border)',
                    cursor: 'pointer',
                    position: 'relative',
                    transition: 'background 0.2s',
                    flexShrink: 0,
                  }}
                  aria-label="Toggle published"
                >
                  <span style={{
                    position: 'absolute',
                    top: 2,
                    left: isPublished ? 22 : 2,
                    width: 20,
                    height: 20,
                    borderRadius: '50%',
                    background: '#fff',
                    transition: 'left 0.2s',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                  }} />
                </button>
              </div>

              <button
                type="submit"
                className="admin-btn admin-btn-primary"
                disabled={loading}
                style={{ width: '100%', justifyContent: 'center', marginBottom: 8 }}
              >
                {loading ? 'Creating...' : 'Create Post →'}
              </button>

              <Link href="/admin/blog" className="admin-btn admin-btn-ghost" style={{ width: '100%', justifyContent: 'center' }}>
                ← Back to Blog
              </Link>
            </div>

            <div className="admin-card">
              <div className="admin-field">
                <label className="admin-label" htmlFor="coverImage">Cover Image URL</label>
                <input
                  id="coverImage"
                  type="text"
                  className="admin-input"
                  placeholder="https://..."
                  value={coverImage}
                  onChange={e => setCoverImage(e.target.value)}
                />
                {coverImage && (
                  <div style={{ marginTop: 8 }}>
                    <img
                      src={coverImage}
                      alt="Cover preview"
                      style={{ width: '100%', height: 120, objectFit: 'cover', borderRadius: 8, border: '1px solid var(--border)' }}
                      onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="admin-card">
              <div className="admin-field">
                <label className="admin-label" htmlFor="tags">Tags</label>
                <input
                  id="tags"
                  type="text"
                  className="admin-input"
                  placeholder="shopify, ecommerce, tips"
                  value={tagsInput}
                  onChange={e => setTagsInput(e.target.value)}
                />
                <div className="admin-slug-hint">Comma-separated</div>
                {tagsInput && (
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 8 }}>
                    {tagsInput.split(',').map(t => t.trim()).filter(Boolean).map(tag => (
                      <span
                        key={tag}
                        style={{
                          fontSize: 11,
                          padding: '3px 8px',
                          background: 'var(--accent-dim)',
                          borderRadius: 100,
                          color: 'var(--accent)',
                          fontFamily: 'JetBrains Mono, monospace',
                        }}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
