'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface FeedbackReply {
  id: string; message: string; attachmentUrl: string | null;
  attachmentName: string | null; addedBy: string; createdAt: string;
}
interface TaskFeedback {
  id: string; message: string; attachmentUrl: string | null;
  attachmentName: string | null; addedBy: string; status: string;
  createdAt: string; replies: FeedbackReply[];
}
interface Task {
  id: string; title: string; description: string | null; previewUrl: string | null;
  status: string; milestoneId: string | null; displayOrder: number; addedBy: string;
  createdAt: string; feedback: TaskFeedback[];
}
interface Milestone { id: string; title: string; status: string; }
interface BuildLink { id: string; label: string; url: string; }

interface Props {
  projectId: string;
  milestones: Milestone[];
  clientSlug: string;
}

// ─── Column config ─────────────────────────────────────────────────────────

const COLUMNS = [
  { id: 'draft',             label: 'Backlog',           color: '#94A3B8', bg: 'rgba(148,163,184,0.1)',  border: 'rgba(148,163,184,0.25)' },
  { id: 'in_progress',       label: 'In Progress',       color: '#60A5FA', bg: 'rgba(96,165,250,0.1)',   border: 'rgba(96,165,250,0.25)'  },
  { id: 'under_review',      label: 'Ready for Review',  color: '#FBBF24', bg: 'rgba(251,191,36,0.1)',   border: 'rgba(251,191,36,0.25)'  },
  { id: 'changes_requested', label: 'Changes Requested', color: '#F87171', bg: 'rgba(248,113,113,0.1)',  border: 'rgba(248,113,113,0.25)' },
  { id: 'completed',         label: 'Approved',          color: '#06D6A0', bg: 'rgba(6,214,160,0.1)',    border: 'rgba(6,214,160,0.25)'   },
];
const STATUS_ORDER = COLUMNS.map(c => c.id);

const BUG_STATUS_LABEL: Record<string, string> = { open: 'Open', in_progress: 'In Progress', resolved: 'Fixed', reopened: 'Reopened', wont_fix: "Won't Fix" };
const BUG_STATUS_COLOR: Record<string, string> = { open: '#F87171', in_progress: '#FBBF24', resolved: '#06D6A0', reopened: '#FBBF24', wont_fix: '#64748B' };

// ─── Main Component ────────────────────────────────────────────────────────

export default function DeliverableKanban({ projectId, milestones, clientSlug }: Props) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [addingTo, setAddingTo] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [newMsId, setNewMsId] = useState('');
  const [adding, setAdding] = useState(false);
  const [movingId, setMovingId] = useState<string | null>(null);
  const [dragCardId, setDragCardId] = useState<string | null>(null);
  const [dragOverCol, setDragOverCol] = useState<string | null>(null);

  // Build links
  const [buildLinks, setBuildLinks] = useState<BuildLink[]>([]);
  const [showAddLink, setShowAddLink] = useState(false);
  const [newLinkLabel, setNewLinkLabel] = useState('');
  const [newLinkUrl, setNewLinkUrl] = useState('');
  const [savingLink, setSavingLink] = useState(false);

  // Detail panel state
  const [editingTask, setEditingTask] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editUrl, setEditUrl] = useState('');
  const [editMsId, setEditMsId] = useState('');
  const [editSaving, setEditSaving] = useState(false);
  const [replyText, setReplyText] = useState<Record<string, string>>({});
  const [replyLoading, setReplyLoading] = useState<Record<string, boolean>>({});
  const [replyAttach, setReplyAttach] = useState<Record<string, File | null>>({});
  const replyFileRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const loadTasks = useCallback(async () => {
    setLoading(true);
    const [delRes, linkRes] = await Promise.all([
      fetch(`/api/admin/projects/${projectId}/deliverables`),
      fetch(`/api/admin/projects/${projectId}/build-links`),
    ]);
    if (delRes.ok) { const d = await delRes.json(); setTasks(d.deliverables ?? []); }
    if (linkRes.ok) { const d = await linkRes.json(); setBuildLinks(d.links ?? []); }
    setLoading(false);
  }, [projectId]);

  useEffect(() => { loadTasks(); }, [loadTasks]);

  const saveBuildLinks = async (links: BuildLink[]) => {
    await fetch(`/api/admin/projects/${projectId}/build-links`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ links }),
    });
  };

  const addBuildLink = async () => {
    if (!newLinkLabel.trim() || !newLinkUrl.trim()) return;
    setSavingLink(true);
    const link: BuildLink = { id: `bl_${Date.now()}`, label: newLinkLabel.trim(), url: newLinkUrl.trim() };
    const updated = [...buildLinks, link];
    setBuildLinks(updated);
    await saveBuildLinks(updated);
    setNewLinkLabel(''); setNewLinkUrl(''); setShowAddLink(false); setSavingLink(false);
  };

  const removeBuildLink = async (id: string) => {
    const updated = buildLinks.filter(l => l.id !== id);
    setBuildLinks(updated);
    await saveBuildLinks(updated);
  };

  // Keep selectedTask in sync when tasks update
  useEffect(() => {
    if (selectedTask) {
      const updated = tasks.find(t => t.id === selectedTask.id);
      if (updated) setSelectedTask(updated);
    }
  }, [tasks, selectedTask?.id]);

  const handleAddTask = async (status: string) => {
    if (!newTitle.trim()) return;
    setAdding(true);
    try {
      const res = await fetch(`/api/admin/projects/${projectId}/deliverables`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTitle.trim(),
          description: newDesc.trim() || null,
          previewUrl: newUrl.trim() || null,
          milestoneId: newMsId || null,
          status,
          displayOrder: tasks.filter(t => t.status === status).length,
        }),
      });
      if (res.ok) {
        const t = await res.json();
        setTasks(prev => [...prev, { ...t, feedback: [] }]);
        setNewTitle(''); setNewDesc(''); setNewUrl(''); setNewMsId('');
        setAddingTo(null);
      }
    } finally { setAdding(false); }
  };

  const moveTaskToStatus = async (task: Task, newStatus: string) => {
    setMovingId(task.id);
    const res = await fetch(`/api/admin/projects/${projectId}/deliverables/${task.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    });
    if (res.ok) {
      setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: newStatus } : t));
    }
    setMovingId(null);
  };

  const moveTask = async (task: Task, dir: 'left' | 'right') => {
    const idx = STATUS_ORDER.indexOf(task.status);
    const newStatus = STATUS_ORDER[idx + (dir === 'right' ? 1 : -1)];
    if (!newStatus) return;
    await moveTaskToStatus(task, newStatus);
  };

  // ── Drag handlers ────────────────────────────────────────────────────────────

  const handleDragStart = (e: React.DragEvent, cardId: string) => {
    setDragCardId(cardId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragEnd = () => {
    setDragCardId(null);
    setDragOverCol(null);
  };

  const handleDragOver = (e: React.DragEvent, colId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverCol !== colId) setDragOverCol(colId);
  };

  const handleDrop = async (e: React.DragEvent, colId: string) => {
    e.preventDefault();
    setDragOverCol(null);
    if (!dragCardId) return;
    const card = tasks.find(t => t.id === dragCardId);
    if (!card || card.status === colId) { setDragCardId(null); return; }
    setDragCardId(null);
    await moveTaskToStatus(card, colId);
  };

  const deleteTask = async (id: string) => {
    if (!confirm('Delete this task?')) return;
    await fetch(`/api/admin/projects/${projectId}/deliverables/${id}`, { method: 'DELETE' });
    setTasks(prev => prev.filter(t => t.id !== id));
    if (selectedTask?.id === id) setSelectedTask(null);
  };

  const saveEdit = async () => {
    if (!selectedTask) return;
    setEditSaving(true);
    const res = await fetch(`/api/admin/projects/${projectId}/deliverables/${selectedTask.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: editTitle.trim(), description: editDesc.trim() || null, previewUrl: editUrl.trim() || null, milestoneId: editMsId || null }),
    });
    if (res.ok) {
      const updated = await res.json();
      setTasks(prev => prev.map(t => t.id === selectedTask.id ? { ...t, ...updated } : t));
      setEditingTask(false);
    }
    setEditSaving(false);
  };

  const changeBugStatus = async (feedbackId: string, taskId: string, status: string) => {
    const res = await fetch(`/api/admin/feedback/${feedbackId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      setTasks(prev => prev.map(t => t.id === taskId ? {
        ...t,
        feedback: t.feedback.map(f => f.id === feedbackId ? { ...f, status } : f),
      } : t));
    }
  };

  const sendReply = async (feedbackId: string, taskId: string) => {
    const msg = replyText[feedbackId]?.trim();
    if (!msg) return;
    setReplyLoading(prev => ({ ...prev, [feedbackId]: true }));
    try {
      let attachmentUrl = null, attachmentName = null;
      const file = replyAttach[feedbackId];
      if (file) {
        const fd = new FormData(); fd.append('file', file);
        const up = await fetch(`/api/portal/upload?slug=admin`, { method: 'POST', body: fd });
        if (up.ok) { const b = await up.json(); attachmentUrl = b.url; attachmentName = file.name; }
      }
      const res = await fetch(`/api/admin/feedback/${feedbackId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg, attachmentUrl, attachmentName, clientSlug }),
      });
      if (res.ok) {
        const reply = await res.json();
        setTasks(prev => prev.map(t => t.id === taskId ? {
          ...t,
          feedback: t.feedback.map(f => f.id === feedbackId ? { ...f, replies: [...f.replies, reply] } : f),
        } : t));
        setReplyText(prev => ({ ...prev, [feedbackId]: '' }));
        setReplyAttach(prev => ({ ...prev, [feedbackId]: null }));
      }
    } finally { setReplyLoading(prev => ({ ...prev, [feedbackId]: false })); }
  };

  const openDetail = (task: Task) => {
    setSelectedTask(task);
    setEditingTask(false);
    setEditTitle(task.title);
    setEditDesc(task.description ?? '');
    setEditUrl(task.previewUrl ?? '');
    setEditMsId(task.milestoneId ?? '');
  };

  const renderModal = () => {
    if (!selectedTask) return null;
    const col = COLUMNS.find(c => c.id === selectedTask.status)!;
    const ms = milestones.find(m => m.id === selectedTask.milestoneId);
    return (
      <div
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
        onClick={() => setSelectedTask(null)}
      >
        <div
          style={{ width: '100%', maxWidth: 640, maxHeight: '88vh', overflowY: 'auto', background: 'var(--bg-elevated)', border: `1px solid ${col.border}`, borderTop: `4px solid ${col.color}`, borderRadius: 16, display: 'flex', flexDirection: 'column' }}
          onClick={e => e.stopPropagation()}
        >
          {/* Panel header */}
          <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, background: 'var(--bg-elevated)', zIndex: 1 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: col.color, background: col.bg, padding: '3px 10px', borderRadius: 20, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              {col.label}
            </span>
            <div style={{ display: 'flex', gap: 6 }}>
              <button className="admin-btn admin-btn-ghost" style={{ fontSize: 12 }} onClick={() => { setEditingTask(true); setEditTitle(selectedTask.title); setEditDesc(selectedTask.description ?? ''); setEditUrl(selectedTask.previewUrl ?? ''); setEditMsId(selectedTask.milestoneId ?? ''); }}>✏️ Edit</button>
              <button className="admin-btn admin-btn-danger" style={{ fontSize: 12 }} onClick={() => deleteTask(selectedTask.id)}>Del</button>
              <button onClick={() => setSelectedTask(null)} style={{ width: 28, height: 28, borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-secondary)', fontSize: 16, cursor: 'pointer', lineHeight: 1 }}>×</button>
            </div>
          </div>

          <div style={{ padding: '16px', flex: 1 }}>
            {/* Title & details */}
            {editingTask ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
                <div>
                  <label className="admin-label">Title</label>
                  <input className="admin-input" value={editTitle} onChange={e => setEditTitle(e.target.value)} />
                </div>
                <div>
                  <label className="admin-label">Description</label>
                  <textarea className="admin-input" value={editDesc} onChange={e => setEditDesc(e.target.value)} rows={3} style={{ resize: 'vertical' }} />
                </div>
                <div>
                  <label className="admin-label">Preview URL</label>
                  <input className="admin-input" value={editUrl} onChange={e => setEditUrl(e.target.value)} placeholder="https://…" />
                </div>
                {milestones.length > 0 && (
                  <div>
                    <label className="admin-label">Milestone</label>
                    <select className="admin-select" value={editMsId} onChange={e => setEditMsId(e.target.value)}>
                      <option value="">— None —</option>
                      {milestones.map(m => <option key={m.id} value={m.id}>{m.title}</option>)}
                    </select>
                  </div>
                )}
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="admin-btn admin-btn-primary" style={{ fontSize: 13 }} disabled={editSaving} onClick={saveEdit}>{editSaving ? 'Saving…' : 'Save'}</button>
                  <button className="admin-btn admin-btn-ghost" style={{ fontSize: 13 }} onClick={() => setEditingTask(false)}>Cancel</button>
                </div>
              </div>
            ) : (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--text)', marginBottom: 8, lineHeight: 1.4 }}>{selectedTask.title}</div>
                {selectedTask.description && (
                  <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 12 }}>{selectedTask.description}</div>
                )}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {selectedTask.previewUrl && (
                    <a href={selectedTask.previewUrl} target="_blank" rel="noopener noreferrer"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'var(--accent)', color: '#fff', fontWeight: 600, fontSize: 13, padding: '7px 14px', borderRadius: 8, textDecoration: 'none', width: 'fit-content' }}>
                      🔗 View Preview
                    </a>
                  )}
                  {ms && <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>📌 {ms.title}</div>}
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Created {new Date(selectedTask.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
                </div>
              </div>
            )}

            {/* Move status */}
            {!editingTask && (
              <div style={{ marginBottom: 20, paddingBottom: 16, borderBottom: '1px solid var(--border)' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Move to</div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {COLUMNS.filter(c => c.id !== selectedTask.status).map(c => (
                    <button key={c.id}
                      style={{ fontSize: 11, fontWeight: 600, color: c.color, background: c.bg, border: `1px solid ${c.border}`, borderRadius: 8, padding: '4px 10px', cursor: 'pointer' }}
                      onClick={() => moveTaskToStatus(selectedTask, c.id)}
                    >{c.label}</button>
                  ))}
                </div>
              </div>
            )}

            {/* Feedback */}
            {!editingTask && (
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>
                  Feedback ({selectedTask.feedback.length})
                </div>

                {selectedTask.feedback.length === 0 ? (
                  <div style={{ fontSize: 13, color: 'var(--text-muted)', fontStyle: 'italic' }}>No feedback yet.</div>
                ) : selectedTask.feedback.map(f => (
                  <div key={f.id} style={{ marginBottom: 14, background: 'var(--bg)', border: `1px solid ${BUG_STATUS_COLOR[f.status]}33`, borderLeft: `3px solid ${BUG_STATUS_COLOR[f.status]}`, borderRadius: 10, padding: '10px 12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 6 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: BUG_STATUS_COLOR[f.status] }}>{BUG_STATUS_LABEL[f.status] ?? f.status}</span>
                      <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{new Date(f.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.5, marginBottom: 6 }}>{f.message}</div>
                    {f.attachmentUrl && (
                      <a href={f.attachmentUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: 'var(--accent)' }}>📎 {f.attachmentName || 'Attachment'}</a>
                    )}

                    {/* Status actions */}
                    <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginTop: 8, marginBottom: 8 }}>
                      {['in_progress', 'resolved', 'wont_fix'].filter(s => s !== f.status).map(s => (
                        <button key={s} className="admin-btn admin-btn-ghost" style={{ fontSize: 10, padding: '2px 7px' }} onClick={() => changeBugStatus(f.id, selectedTask.id, s)}>
                          {BUG_STATUS_LABEL[s]}
                        </button>
                      ))}
                    </div>

                    {/* Replies */}
                    {f.replies.length > 0 && (
                      <div style={{ borderTop: '1px solid var(--border)', paddingTop: 8, marginBottom: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {f.replies.map(r => (
                          <div key={r.id} style={{ padding: '7px 10px', background: r.addedBy === 'admin' ? 'rgba(6,214,160,0.08)' : 'var(--bg-elevated)', borderRadius: 8 }}>
                            <div style={{ fontSize: 10, fontWeight: 700, color: r.addedBy === 'admin' ? 'var(--accent)' : 'var(--text-muted)', marginBottom: 2 }}>
                              {r.addedBy === 'admin' ? '🛠 You' : '👤 Client'}
                            </div>
                            <div style={{ fontSize: 12, color: 'var(--text)' }}>{r.message}</div>
                            {r.attachmentUrl && <a href={r.attachmentUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: 'var(--accent)' }}>📎 {r.attachmentName}</a>}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Reply input */}
                    <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                      <input
                        className="admin-input"
                        style={{ flex: 1, fontSize: 12 }}
                        placeholder="Reply…"
                        value={replyText[f.id] ?? ''}
                        onChange={e => setReplyText(p => ({ ...p, [f.id]: e.target.value }))}
                        onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendReply(f.id, selectedTask.id)}
                      />
                      <input type="file" style={{ display: 'none' }} ref={el => { replyFileRefs.current[f.id] = el; }}
                        onChange={e => setReplyAttach(p => ({ ...p, [f.id]: e.target.files?.[0] ?? null }))} />
                      <button className="admin-btn admin-btn-ghost" style={{ fontSize: 12 }} onClick={() => replyFileRefs.current[f.id]?.click()} title="Attach">📎</button>
                      <button className="admin-btn admin-btn-primary" style={{ fontSize: 12 }} disabled={!replyText[f.id]?.trim() || replyLoading[f.id]} onClick={() => sendReply(f.id, selectedTask.id)}>
                        {replyLoading[f.id] ? '…' : '↑'}
                      </button>
                    </div>
                    {replyAttach[f.id] && <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>📎 {replyAttach[f.id]!.name}</div>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  if (loading) return <div style={{ color: 'var(--text-secondary)', fontSize: 14, padding: 24 }}>Loading tasks…</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, minHeight: 500 }}>

      {/* ── Build Links Strip ─────────────────────────────────────────────── */}
      <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 12, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', flexShrink: 0 }}>📦 Build Links</span>
        {buildLinks.map(link => (
          <div key={link.id} style={{ display: 'flex', alignItems: 'center', gap: 0, background: 'rgba(6,214,160,0.08)', border: '1px solid rgba(6,214,160,0.25)', borderRadius: 8, overflow: 'hidden' }}>
            <a href={link.url} target="_blank" rel="noopener noreferrer"
              style={{ padding: '5px 12px', fontSize: 12, fontWeight: 600, color: '#06D6A0', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 5 }}>
              🔗 {link.label}
            </a>
            <button onClick={() => removeBuildLink(link.id)}
              style={{ padding: '5px 8px', background: 'transparent', border: 'none', borderLeft: '1px solid rgba(6,214,160,0.2)', color: 'var(--text-muted)', fontSize: 12, cursor: 'pointer', lineHeight: 1 }}>×</button>
          </div>
        ))}
        {showAddLink ? (
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
            <input
              autoFocus
              placeholder="Label (e.g. Staging Build)"
              value={newLinkLabel}
              onChange={e => setNewLinkLabel(e.target.value)}
              style={{ padding: '5px 10px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 7, color: 'var(--text)', fontSize: 12, width: 170 }}
            />
            <input
              placeholder="https://…"
              value={newLinkUrl}
              onChange={e => setNewLinkUrl(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') addBuildLink(); if (e.key === 'Escape') { setShowAddLink(false); setNewLinkLabel(''); setNewLinkUrl(''); } }}
              style={{ padding: '5px 10px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 7, color: 'var(--text)', fontSize: 12, width: 200 }}
            />
            <button onClick={addBuildLink} disabled={savingLink || !newLinkLabel.trim() || !newLinkUrl.trim()}
              className="admin-btn admin-btn-primary" style={{ fontSize: 12 }}>
              {savingLink ? '…' : 'Add'}
            </button>
            <button onClick={() => { setShowAddLink(false); setNewLinkLabel(''); setNewLinkUrl(''); }}
              className="admin-btn admin-btn-ghost" style={{ fontSize: 12 }}>Cancel</button>
          </div>
        ) : (
          <button onClick={() => setShowAddLink(true)}
            style={{ padding: '5px 12px', background: 'transparent', border: '1px dashed var(--border)', borderRadius: 8, color: 'var(--text-muted)', fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>
            + Add Link
          </button>
        )}
      </div>

      {/* ── Kanban Board ─────────────────────────────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 8, paddingRight: selectedTask ? 0 : 0 }}>
        {COLUMNS.map(col => {
          const colTasks = tasks
            .filter(t => t.status === col.id)
            .sort((a, b) => a.displayOrder - b.displayOrder);
          const isAdding = addingTo === col.id;

          return (
            <div key={col.id} style={{ width: 270, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 0 }}>
              {/* Column header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', background: col.bg, borderRadius: '12px 12px 0 0', border: `1px solid ${col.border}`, borderBottom: 'none' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: col.color, flexShrink: 0 }} />
                  <span style={{ fontSize: 12, fontWeight: 700, color: col.color, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{col.label}</span>
                </div>
                <span style={{ fontSize: 11, fontWeight: 700, color: col.color, background: col.bg, border: `1px solid ${col.border}`, borderRadius: 20, padding: '2px 7px' }}>{colTasks.length}</span>
              </div>

              {/* Cards container */}
              <div
                onDragOver={e => handleDragOver(e, col.id)}
                onDragLeave={() => { if (dragOverCol === col.id) setDragOverCol(null); }}
                onDrop={e => handleDrop(e, col.id)}
                style={{ flex: 1, overflowY: 'auto', padding: '8px', background: dragOverCol === col.id ? `${col.color}18` : 'var(--bg-elevated)', border: `1px solid ${dragOverCol === col.id ? col.color : col.border}`, borderTop: 'none', display: 'flex', flexDirection: 'column', gap: 8, minHeight: 120, transition: 'background 0.15s, border-color 0.15s' }}>
                {colTasks.map(task => {
                  const openBugs = task.feedback.filter(f => f.status === 'open' || f.status === 'reopened').length;
                  const colIdx = STATUS_ORDER.indexOf(col.id);
                  const isSelected = selectedTask?.id === task.id;
                  const isMoving = movingId === task.id;

                  const isDragging = dragCardId === task.id;

                  return (
                    <div
                      key={task.id}
                      draggable
                      onDragStart={e => handleDragStart(e, task.id)}
                      onDragEnd={handleDragEnd}
                      onClick={() => openDetail(task)}
                      style={{
                        background: 'var(--bg)',
                        border: `1px solid ${isSelected ? col.color : 'var(--border)'}`,
                        borderLeft: `3px solid ${col.color}`,
                        borderRadius: 10,
                        padding: '11px 12px',
                        cursor: isDragging ? 'grabbing' : 'grab',
                        transition: 'border-color 0.15s, box-shadow 0.15s, opacity 0.15s',
                        boxShadow: isSelected ? `0 0 0 2px ${col.color}33` : 'none',
                        opacity: isDragging ? 0.45 : 1,
                        userSelect: 'none',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 6, marginBottom: 4 }}>
                        <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text)', lineHeight: 1.4 }}>{task.title}</div>
                        <span style={{ fontSize: 10, fontWeight: 600, color: task.addedBy === 'client' ? '#A78BFA' : 'var(--accent)', background: task.addedBy === 'client' ? 'rgba(167,139,250,0.1)' : 'rgba(6,214,160,0.1)', border: `1px solid ${task.addedBy === 'client' ? 'rgba(167,139,250,0.3)' : 'rgba(6,214,160,0.3)'}`, borderRadius: 6, padding: '2px 6px', flexShrink: 0, whiteSpace: 'nowrap' }}>
                          {task.addedBy === 'client' ? '👤 Client' : '🛠 Admin'}
                        </span>
                      </div>
                      {task.description && (
                        <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: 6, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                          {task.description}
                        </div>
                      )}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6, marginTop: 8 }}>
                        <div style={{ display: 'flex', gap: 5 }}>
                          {task.previewUrl && (
                            <a href={task.previewUrl} target="_blank" rel="noopener noreferrer"
                              onClick={e => e.stopPropagation()}
                              style={{ fontSize: 11, color: 'var(--accent)', fontWeight: 600, textDecoration: 'none' }}>
                              🔗 Preview
                            </a>
                          )}
                          {openBugs > 0 && (
                            <span style={{ fontSize: 11, color: '#F87171', fontWeight: 600 }}>🐛 {openBugs}</span>
                          )}
                          {task.feedback.length > 0 && openBugs === 0 && (
                            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>💬 {task.feedback.length}</span>
                          )}
                        </div>
                        {/* Move buttons */}
                        <div style={{ display: 'flex', gap: 3 }} onClick={e => e.stopPropagation()}>
                          {colIdx > 0 && (
                            <button
                              disabled={isMoving}
                              onClick={() => moveTask(task, 'left')}
                              style={{ width: 22, height: 22, borderRadius: 5, border: '1px solid var(--border)', background: 'var(--bg-elevated)', color: 'var(--text-secondary)', fontSize: 11, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                              title="Move left"
                            >←</button>
                          )}
                          {colIdx < STATUS_ORDER.length - 1 && (
                            <button
                              disabled={isMoving}
                              onClick={() => moveTask(task, 'right')}
                              style={{ width: 22, height: 22, borderRadius: 5, border: '1px solid var(--border)', background: 'var(--bg-elevated)', color: 'var(--text-secondary)', fontSize: 11, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                              title="Move right"
                            >→</button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* Add task inline form */}
                {isAdding ? (
                  <div style={{ background: 'var(--bg)', border: `1px solid ${col.border}`, borderRadius: 10, padding: 12 }}>
                    <input
                      className="admin-input"
                      autoFocus
                      placeholder="Task title…"
                      value={newTitle}
                      onChange={e => setNewTitle(e.target.value)}
                      style={{ marginBottom: 8, fontSize: 13 }}
                      onKeyDown={e => { if (e.key === 'Enter') handleAddTask(col.id); if (e.key === 'Escape') { setAddingTo(null); setNewTitle(''); } }}
                    />
                    <textarea
                      className="admin-input"
                      placeholder="Description (optional)…"
                      value={newDesc}
                      onChange={e => setNewDesc(e.target.value)}
                      rows={2}
                      style={{ marginBottom: 8, fontSize: 12, resize: 'none' }}
                    />
                    <input
                      className="admin-input"
                      placeholder="Preview URL (optional)…"
                      value={newUrl}
                      onChange={e => setNewUrl(e.target.value)}
                      style={{ marginBottom: 8, fontSize: 12 }}
                    />
                    {milestones.length > 0 && (
                      <select className="admin-select" value={newMsId} onChange={e => setNewMsId(e.target.value)} style={{ marginBottom: 10, fontSize: 12 }}>
                        <option value="">— No milestone —</option>
                        {milestones.map(m => <option key={m.id} value={m.id}>{m.title}</option>)}
                      </select>
                    )}
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="admin-btn admin-btn-primary" style={{ fontSize: 12 }} disabled={adding || !newTitle.trim()} onClick={() => handleAddTask(col.id)}>
                        {adding ? '…' : 'Add'}
                      </button>
                      <button className="admin-btn admin-btn-ghost" style={{ fontSize: 12 }} onClick={() => { setAddingTo(null); setNewTitle(''); setNewDesc(''); setNewUrl(''); }}>Cancel</button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => { setAddingTo(col.id); setNewTitle(''); setNewDesc(''); setNewUrl(''); setNewMsId(''); }}
                    style={{ width: '100%', padding: '8px', background: 'transparent', border: `1px dashed ${col.border}`, borderRadius: 10, color: col.color, fontSize: 12, cursor: 'pointer', fontWeight: 600, opacity: 0.7 }}
                  >+ Add Task</button>
                )}
              </div>

              {/* Column footer */}
              <div style={{ padding: '6px 12px', background: col.bg, border: `1px solid ${col.border}`, borderTop: 'none', borderRadius: '0 0 12px 12px', textAlign: 'center' }}>
                <span style={{ fontSize: 10, color: col.color, fontWeight: 600, opacity: 0.7 }}>{colTasks.length} task{colTasks.length !== 1 ? 's' : ''}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Task Detail Modal ─────────────────────────────────────────────── */}
      {renderModal()}
    </div>
  );
}
