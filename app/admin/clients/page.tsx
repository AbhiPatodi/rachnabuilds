'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

interface Client {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  slug: string;
  isActive: boolean;
  createdAt: string;
  _count?: {
    projects: number;
  };
}

function formatDate(str: string) {
  return new Date(str).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleting, setDeleting] = useState<string | null>(null);

  const fetchClients = async () => {
    try {
      const res = await fetch('/api/admin/clients');
      if (!res.ok) throw new Error('Failed to load');
      const data = await res.json();
      setClients(data);
    } catch {
      setError('Failed to load clients');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchClients(); }, []);

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete client "${name}"? This cannot be undone.`)) return;
    setDeleting(id);
    try {
      const res = await fetch(`/api/admin/clients/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed');
      setClients(c => c.filter(x => x.id !== id));
    } catch {
      alert('Failed to delete client');
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div className="admin-content">
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Clients</h1>
          <p className="admin-page-subtitle">Manage client portals and projects</p>
        </div>
        <Link href="/admin/clients/new" className="admin-btn admin-btn-primary">
          <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          New Client
        </Link>
      </div>

      {error && <div className="admin-alert admin-alert-error">{error}</div>}

      <div className="admin-card">
        {loading ? (
          <div className="admin-empty">Loading clients…</div>
        ) : clients.length === 0 ? (
          <div className="admin-empty">
            No clients yet. <Link href="/admin/clients/new" style={{ color: 'var(--accent)' }}>Create your first client →</Link>
          </div>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Client</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>Projects</th>
                  <th>Portal URL</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {clients.map(client => (
                  <tr key={client.id}>
                    <td style={{ fontWeight: 600, color: 'var(--text)' }}>{client.name}</td>
                    <td style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{client.email || '—'}</td>
                    <td style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{client.phone || '—'}</td>
                    <td style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12 }}>
                      {client._count?.projects ?? 0}
                    </td>
                    <td>
                      <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: 'var(--text-muted)' }}>
                        /portal/{client.slug}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${client.isActive ? 'badge-green' : 'badge-red'}`}>
                        <span className="badge-dot" />
                        {client.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td style={{ color: 'var(--text-secondary)', fontSize: 12 }}>
                      {formatDate(client.createdAt)}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <Link
                          href={`/admin/clients/${client.id}`}
                          className="admin-btn admin-btn-ghost admin-btn-icon"
                          style={{ fontSize: 12 }}
                        >
                          View
                        </Link>
                        <Link
                          href={`/admin/clients/${client.id}?edit=1`}
                          className="admin-btn admin-btn-ghost admin-btn-icon"
                          style={{ fontSize: 12 }}
                        >
                          Edit
                        </Link>
                        <button
                          className="admin-btn admin-btn-danger admin-btn-icon"
                          style={{ fontSize: 12 }}
                          disabled={deleting === client.id}
                          onClick={() => handleDelete(client.id, client.name)}
                        >
                          {deleting === client.id ? '…' : 'Delete'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
