'use client';

import { useState, useEffect, useCallback } from 'react';

interface Lead {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  service: string | null;
  budget: string | null;
  message: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

type FilterTab = 'all' | 'new' | 'contacted' | 'converted' | 'archived';

const STATUS_BADGE: Record<string, { label: string; color: string; bg: string }> = {
  new: { label: 'New', color: '#06D6A0', bg: 'rgba(6,214,160,0.12)' },
  contacted: { label: 'Contacted', color: '#F59E0B', bg: 'rgba(245,158,11,0.12)' },
  converted: { label: 'Converted', color: '#A78BFA', bg: 'rgba(167,139,250,0.12)' },
  archived: { label: 'Archived', color: '#6B7280', bg: 'rgba(107,114,128,0.12)' },
};

const NEXT_STATUS: Record<string, string | null> = {
  new: 'contacted',
  contacted: 'converted',
  converted: null,
  archived: null,
};

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchLeads = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/leads');
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setLeads(data);
    } catch {
      setError('Failed to load leads');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  const handleStatusChange = async (id: string, newStatus: string) => {
    setUpdatingId(id);
    try {
      const res = await fetch(`/api/admin/leads/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error('Failed to update');
      const updated = await res.json();
      setLeads(prev => prev.map(l => l.id === id ? updated : l));
    } catch {
      alert('Failed to update status');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete lead from ${name}? This cannot be undone.`)) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/admin/leads/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete');
      setLeads(prev => prev.filter(l => l.id !== id));
    } catch {
      alert('Failed to delete lead');
    } finally {
      setDeletingId(null);
    }
  };

  const filtered = activeTab === 'all' ? leads : leads.filter(l => l.status === activeTab);

  const counts = {
    all: leads.length,
    new: leads.filter(l => l.status === 'new').length,
    contacted: leads.filter(l => l.status === 'contacted').length,
    converted: leads.filter(l => l.status === 'converted').length,
    archived: leads.filter(l => l.status === 'archived').length,
  };

  if (loading) {
    return (
      <div className="admin-content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 200 }}>
        <span style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Loading leads...</span>
      </div>
    );
  }

  return (
    <div className="admin-content">
      <style>{`
        @media (max-width: 767px) {
          .leads-col-service, .leads-col-budget, .leads-col-message { display: none; }
          .leads-filter-tabs { overflow-x: auto; flex-wrap: nowrap; scrollbar-width: none; -ms-overflow-style: none; padding-bottom: 2px; }
          .leads-filter-tabs::-webkit-scrollbar { display: none; }
          .leads-filter-tabs button { white-space: nowrap; flex-shrink: 0; }
        }
      `}</style>
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Leads</h1>
          <p className="admin-page-subtitle">Manage contact form enquiries</p>
        </div>
      </div>

      {error && <div className="admin-alert admin-alert-error" style={{ marginBottom: 20 }}>{error}</div>}

      {/* Stats */}
      <div className="admin-stats">
        <div className="admin-stat-card">
          <div className="admin-stat-label">Total Leads</div>
          <div className="admin-stat-value">{counts.all}</div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-label">New</div>
          <div className="admin-stat-value accent">{counts.new}</div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-label">Contacted</div>
          <div className="admin-stat-value">{counts.contacted}</div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-label">Converted</div>
          <div className="admin-stat-value" style={{ color: 'var(--purple, #A78BFA)' }}>{counts.converted}</div>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="leads-filter-tabs" style={{ display: 'flex', gap: 4, marginBottom: 20, borderBottom: '1px solid var(--border)', paddingBottom: 0 }}>
        {(['all', 'new', 'contacted', 'converted', 'archived'] as FilterTab[]).map(tab => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            style={{
              padding: '8px 14px',
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: 500,
              color: activeTab === tab ? 'var(--accent)' : 'var(--text-secondary)',
              borderBottom: activeTab === tab ? '2px solid var(--accent)' : '2px solid transparent',
              marginBottom: -1,
              transition: 'all 0.15s',
              textTransform: 'capitalize',
            }}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
            <span
              style={{
                marginLeft: 6,
                fontSize: 11,
                padding: '1px 6px',
                borderRadius: 100,
                background: activeTab === tab ? 'var(--accent-dim)' : 'var(--bg-elevated)',
                color: activeTab === tab ? 'var(--accent)' : 'var(--text-muted)',
                fontFamily: 'JetBrains Mono, monospace',
              }}
            >
              {counts[tab]}
            </span>
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="admin-card" style={{ padding: 0, overflow: 'clip' }}>
        {filtered.length === 0 ? (
          <div className="admin-empty">
            <div style={{ marginBottom: 8, fontSize: 32 }}>📬</div>
            <div style={{ fontWeight: 600, marginBottom: 4 }}>No leads {activeTab !== 'all' ? `in "${activeTab}"` : 'yet'}</div>
            <div>Leads from your contact form will appear here.</div>
          </div>
        ) : (
          <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email / Phone</th>
                <th className="leads-col-service">Service</th>
                <th className="leads-col-budget">Budget</th>
                <th className="leads-col-message">Message</th>
                <th>Status</th>
                <th>Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(lead => (
                <>
                  <tr
                    key={lead.id}
                    style={{ cursor: 'pointer' }}
                    onClick={() => setExpandedId(expandedId === lead.id ? null : lead.id)}
                  >
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--text)' }}>{lead.name}</div>
                    </td>
                    <td>
                      <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{lead.email}</div>
                      {lead.phone && (
                        <div style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace' }}>{lead.phone}</div>
                      )}
                    </td>
                    <td className="leads-col-service">
                      <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{lead.service || '—'}</span>
                    </td>
                    <td className="leads-col-budget">
                      <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{lead.budget || '—'}</span>
                    </td>
                    <td className="leads-col-message">
                      <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                        {lead.message.length > 60 ? lead.message.slice(0, 60) + '…' : lead.message}
                      </span>
                    </td>
                    <td>
                      {(() => {
                        const s = STATUS_BADGE[lead.status] || STATUS_BADGE.new;
                        return (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 5,
                              padding: '3px 9px',
                              borderRadius: 100,
                              fontSize: 12,
                              fontWeight: 500,
                              color: s.color,
                              background: s.bg,
                            }}
                          >
                            <span style={{ width: 6, height: 6, borderRadius: '50%', background: s.color, flexShrink: 0 }} />
                            {s.label}
                          </span>
                        );
                      })()}
                    </td>
                    <td>
                      <span style={{ color: 'var(--text-secondary)', fontSize: 12, whiteSpace: 'nowrap' }}>
                        {new Date(lead.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </span>
                    </td>
                    <td onClick={e => e.stopPropagation()}>
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                        {NEXT_STATUS[lead.status] && (
                          <button
                            className="admin-btn admin-btn-ghost admin-btn-icon"
                            style={{ fontSize: 11, whiteSpace: 'nowrap' }}
                            disabled={updatingId === lead.id}
                            onClick={() => handleStatusChange(lead.id, NEXT_STATUS[lead.status]!)}
                          >
                            {updatingId === lead.id ? '...' : `→ ${NEXT_STATUS[lead.status]!.charAt(0).toUpperCase() + NEXT_STATUS[lead.status]!.slice(1)}`}
                          </button>
                        )}
                        {lead.status !== 'archived' && (
                          <button
                            className="admin-btn admin-btn-ghost admin-btn-icon"
                            style={{ fontSize: 11 }}
                            disabled={updatingId === lead.id}
                            onClick={() => handleStatusChange(lead.id, 'archived')}
                          >
                            Archive
                          </button>
                        )}
                        <button
                          className="admin-btn admin-btn-danger admin-btn-icon"
                          style={{ fontSize: 11 }}
                          disabled={deletingId === lead.id}
                          onClick={() => handleDelete(lead.id, lead.name)}
                        >
                          {deletingId === lead.id ? '...' : 'Del'}
                        </button>
                      </div>
                    </td>
                  </tr>
                  {expandedId === lead.id && (
                    <tr key={`${lead.id}-expanded`} style={{ background: 'var(--bg-elevated)' }}>
                      <td colSpan={8} style={{ padding: '16px 20px' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '8px 16px', fontSize: 13 }}>
                          <span style={{ color: 'var(--text-muted)', fontWeight: 500 }}>Full Message:</span>
                          <span style={{ color: 'var(--text)', lineHeight: 1.6 }}>{lead.message}</span>
                          {lead.phone && (
                            <>
                              <span style={{ color: 'var(--text-muted)', fontWeight: 500 }}>Phone:</span>
                              <span style={{ color: 'var(--text)' }}>{lead.phone}</span>
                            </>
                          )}
                          {lead.service && (
                            <>
                              <span style={{ color: 'var(--text-muted)', fontWeight: 500 }}>Service:</span>
                              <span style={{ color: 'var(--text)' }}>{lead.service}</span>
                            </>
                          )}
                          {lead.budget && (
                            <>
                              <span style={{ color: 'var(--text-muted)', fontWeight: 500 }}>Budget:</span>
                              <span style={{ color: 'var(--text)' }}>{lead.budget}</span>
                            </>
                          )}
                          <span style={{ color: 'var(--text-muted)', fontWeight: 500 }}>Received:</span>
                          <span style={{ color: 'var(--text)' }}>
                            {new Date(lead.createdAt).toLocaleString('en-GB', {
                              day: '2-digit', month: 'short', year: 'numeric',
                              hour: '2-digit', minute: '2-digit',
                            })}
                          </span>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </div>
    </div>
  );
}
