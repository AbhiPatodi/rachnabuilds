'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  isPublished: boolean;
  publishedAt: string | null;
  tags: string[];
  createdAt: string;
}

export default function BlogListPage() {
  const router = useRouter();
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchPosts = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/blog');
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setPosts(data);
    } catch {
      setError('Failed to load blog posts');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Delete "${title}"? This cannot be undone.`)) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/admin/blog/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete');
      setPosts(prev => prev.filter(p => p.id !== id));
    } catch {
      alert('Failed to delete post');
    } finally {
      setDeletingId(null);
    }
  };

  const total = posts.length;
  const published = posts.filter(p => p.isPublished).length;
  const drafts = total - published;

  if (loading) {
    return (
      <div className="admin-content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 200 }}>
        <span style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Loading posts...</span>
      </div>
    );
  }

  return (
    <div className="admin-content">
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Blog</h1>
          <p className="admin-page-subtitle">Manage all blog posts</p>
        </div>
        <Link href="/admin/blog/new" className="admin-btn admin-btn-primary">
          <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
            <path d="M12 5v14M5 12h14"/>
          </svg>
          New Post
        </Link>
      </div>

      {error && <div className="admin-alert admin-alert-error" style={{ marginBottom: 20 }}>{error}</div>}

      <div className="admin-stats">
        <div className="admin-stat-card">
          <div className="admin-stat-label">Total Posts</div>
          <div className="admin-stat-value">{total}</div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-label">Published</div>
          <div className="admin-stat-value accent">{published}</div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-label">Drafts</div>
          <div className="admin-stat-value">{drafts}</div>
        </div>
      </div>

      <div className="admin-card" style={{ padding: 0, overflow: 'hidden' }}>
        {posts.length === 0 ? (
          <div className="admin-empty">
            <div style={{ marginBottom: 8, fontSize: 32 }}>✍️</div>
            <div style={{ fontWeight: 600, marginBottom: 4 }}>No blog posts yet</div>
            <div>Create your first post to get started.</div>
          </div>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Slug</th>
                <th>Status</th>
                <th>Published</th>
                <th>Tags</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {posts.map(post => (
                <tr
                  key={post.id}
                  style={{ cursor: 'pointer' }}
                  onClick={() => router.push(`/admin/blog/${post.id}`)}
                >
                  <td>
                    <div style={{ fontWeight: 600, color: 'var(--text)' }}>{post.title}</div>
                  </td>
                  <td>
                    <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: 'var(--text-secondary)' }}>
                      {post.slug}
                    </span>
                  </td>
                  <td>
                    <span className={`badge ${post.isPublished ? 'badge-green' : 'badge-red'}`}>
                      <span className="badge-dot" />
                      {post.isPublished ? 'Published' : 'Draft'}
                    </span>
                  </td>
                  <td>
                    <span style={{ color: 'var(--text-secondary)', fontSize: 12 }}>
                      {post.publishedAt
                        ? new Date(post.publishedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
                        : '—'}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                      {post.tags.slice(0, 3).map(tag => (
                        <span
                          key={tag}
                          style={{
                            fontSize: 11,
                            padding: '2px 7px',
                            background: 'var(--bg-elevated)',
                            borderRadius: 100,
                            color: 'var(--text-secondary)',
                            fontFamily: 'JetBrains Mono, monospace',
                          }}
                        >
                          {tag}
                        </span>
                      ))}
                      {post.tags.length > 3 && (
                        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>+{post.tags.length - 3}</span>
                      )}
                    </div>
                  </td>
                  <td onClick={e => e.stopPropagation()}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <Link
                        href={`/admin/blog/${post.id}`}
                        className="admin-btn admin-btn-ghost admin-btn-icon"
                        style={{ fontSize: 12 }}
                      >
                        Edit
                      </Link>
                      <button
                        className="admin-btn admin-btn-danger admin-btn-icon"
                        style={{ fontSize: 12 }}
                        disabled={deletingId === post.id}
                        onClick={() => handleDelete(post.id, post.title)}
                      >
                        {deletingId === post.id ? '...' : 'Delete'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
