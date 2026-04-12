'use client';
import { useState, useEffect, useRef, useCallback } from 'react';

// ── Types ─────────────────────────────────────────────────────────────────────

interface FeedbackReply {
  id: string;
  message: string;
  attachmentUrl: string | null;
  attachmentName: string | null;
  addedBy: string;
  createdAt: string;
}

interface CardFeedback {
  id: string;
  message: string;
  attachmentUrl: string | null;
  attachmentName: string | null;
  addedBy: string;
  status: string;
  createdAt: string;
  replies: FeedbackReply[];
}

interface KanbanCard {
  id: string;
  title: string;
  description: string | null;
  previewUrl: string | null;
  status: string;
  addedBy: string;
  feedback: CardFeedback[];
}

interface KanbanColumn {
  id: string;
  label: string;
  color: string;
  isCustom?: boolean;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const DEFAULT_COLS: KanbanColumn[] = [
  { id: 'backlog',           label: 'Backlog',           color: '#94A3B8' },
  { id: 'in_progress',       label: 'In Progress',       color: '#60A5FA' },
  { id: 'under_review',      label: 'Under Review',      color: '#FBBF24' },
  { id: 'changes_requested', label: 'Changes Requested', color: '#F87171' },
  { id: 'completed',         label: 'Approved',          color: '#06D6A0' },
];

const PRESET_COLORS = ['#60A5FA', '#FBBF24', '#F87171', '#06D6A0', '#A78BFA', '#FB923C', '#34D399', '#F472B6'];

const BUG_STATUS_LABEL: Record<string, string> = {
  open: 'Open',
  in_progress: 'In Progress',
  resolved: 'Fixed',
  reopened: 'Reopened',
  wont_fix: "Won't Fix",
};

const BUG_STATUS_COLOR: Record<string, string> = {
  open: '#F87171',
  in_progress: '#FBBF24',
  resolved: '#06D6A0',
  reopened: '#FBBF24',
  wont_fix: '#64748B',
};

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  projectId: string;
  clientSlug: string;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function PortalKanbanBoard({ projectId, clientSlug }: Props) {
  const [loading, setLoading] = useState(true);
  const [cards, setCards] = useState<KanbanCard[]>([]);
  const [columns, setColumns] = useState<KanbanColumn[]>(DEFAULT_COLS);
  const [buildLinks, setBuildLinks] = useState<{ id: string; label: string; url: string }[]>([]);

  // Selected card panel
  const [selectedCard, setSelectedCard] = useState<KanbanCard | null>(null);

  // Drag state
  const [dragCardId, setDragCardId] = useState<string | null>(null);
  const [dragOverCol, setDragOverCol] = useState<string | null>(null);

  // Comment form state
  const [commentText, setCommentText] = useState('');
  const [commentAttachFile, setCommentAttachFile] = useState<File | null>(null);
  const [commentSubmitting, setCommentSubmitting] = useState(false);
  const commentFileRef = useRef<HTMLInputElement>(null);

  // Reply state
  const [replyText, setReplyText] = useState<Record<string, string>>({});
  const [replyAttachFile, setReplyAttachFile] = useState<Record<string, File | null>>({});
  const [replySending, setReplySending] = useState<Record<string, boolean>>({});
  const replyFileRefs = useRef<Record<string, HTMLInputElement | null>>({});

  // Add task form
  const [addingTo, setAddingTo] = useState<string | null>(null);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDesc, setNewTaskDesc] = useState('');
  const [addingTask, setAddingTask] = useState(false);

  // Add column form
  const [showAddCol, setShowAddCol] = useState(false);
  const [newColName, setNewColName] = useState('');
  const [newColColor, setNewColColor] = useState(PRESET_COLORS[4]);
  const [savingCol, setSavingCol] = useState(false);

  // ── Load on mount ──────────────────────────────────────────────────────────

  useEffect(() => {
    Promise.all([
      fetch(`/api/portal/${clientSlug}/${projectId}/deliverables`).then(r => r.json()).catch(() => ({ deliverables: [] })),
      fetch(`/api/portal/${clientSlug}/${projectId}/kanban-columns`).then(r => r.json()).catch(() => ({ columns: [] })),
      fetch(`/api/portal/${clientSlug}/${projectId}/build-links`).then(r => r.json()).catch(() => ({ links: [] })),
    ]).then(([dData, cData, lData]) => {
      setCards(dData.deliverables ?? []);
      const extra = (cData.columns ?? []) as KanbanColumn[];
      setColumns([...DEFAULT_COLS, ...extra.map(c => ({ ...c, isCustom: true }))]);
      setBuildLinks(lData.links ?? []);
      setLoading(false);
    });
  }, [projectId, clientSlug]);

  // Keep selectedCard in sync when cards update
  useEffect(() => {
    if (selectedCard) {
      const updated = cards.find(c => c.id === selectedCard.id);
      if (updated) setSelectedCard(updated);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cards, selectedCard?.id]);

  // ── Move card ──────────────────────────────────────────────────────────────

  const moveCard = useCallback(async (cardId: string, newStatus: string) => {
    const prevCards = cards;
    // Optimistic update
    setCards(prev => prev.map(c => c.id === cardId ? { ...c, status: newStatus } : c));

    try {
      let res: Response;
      if (newStatus === 'completed') {
        res = await fetch(`/api/portal/${clientSlug}/${projectId}/deliverables/${cardId}/approve`, { method: 'POST' });
      } else {
        res = await fetch(`/api/portal/${clientSlug}/${projectId}/deliverables/${cardId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: newStatus }),
        });
      }
      if (!res.ok) {
        // Rollback
        setCards(prevCards);
      }
    } catch {
      setCards(prevCards);
    }
  }, [cards, clientSlug, projectId]);

  // ── Submit comment ─────────────────────────────────────────────────────────

  const submitComment = async (cardId: string) => {
    if (!commentText.trim()) return;
    setCommentSubmitting(true);
    try {
      let attachmentUrl: string | null = null;
      let attachmentName: string | null = null;
      if (commentAttachFile) {
        const fd = new FormData();
        fd.append('file', commentAttachFile);
        const upRes = await fetch(`/api/portal/upload?slug=${clientSlug}`, { method: 'POST', body: fd });
        if (upRes.ok) {
          const b = await upRes.json();
          attachmentUrl = b.url;
          attachmentName = commentAttachFile.name;
        }
      }
      const res = await fetch(`/api/portal/${clientSlug}/${projectId}/deliverables/${cardId}/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: commentText.trim(), attachmentUrl, attachmentName }),
      });
      if (res.ok) {
        const fb = await res.json();
        setCards(prev => prev.map(c => {
          if (c.id !== cardId) return c;
          // Only change status to changes_requested if not already completed
          const newStatus = c.status === 'completed' ? 'completed' : 'changes_requested';
          return { ...c, status: newStatus, feedback: [...c.feedback, { ...fb, replies: [] }] };
        }));
        setCommentText('');
        setCommentAttachFile(null);
        if (commentFileRef.current) commentFileRef.current.value = '';
      }
    } finally {
      setCommentSubmitting(false);
    }
  };

  // ── Submit reply ───────────────────────────────────────────────────────────

  const submitReply = async (feedbackId: string, cardId: string, action: 'reply' | 'reopen') => {
    const msg = replyText[feedbackId]?.trim();
    if (action === 'reply' && !msg) return;
    setReplySending(prev => ({ ...prev, [feedbackId]: true }));
    try {
      let attachmentUrl: string | null = null;
      let attachmentName: string | null = null;
      const file = replyAttachFile[feedbackId];
      if (file) {
        const fd = new FormData();
        fd.append('file', file);
        const upRes = await fetch(`/api/portal/upload?slug=${clientSlug}`, { method: 'POST', body: fd });
        if (upRes.ok) {
          const b = await upRes.json();
          attachmentUrl = b.url;
          attachmentName = file.name;
        }
      }
      const res = await fetch(`/api/portal/${clientSlug}/${projectId}/feedback/${feedbackId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, message: msg, attachmentUrl, attachmentName }),
      });
      if (res.ok) {
        const data = await res.json();
        setCards(prev => prev.map(c => {
          if (c.id !== cardId) return c;
          return {
            ...c,
            status: action === 'reopen' ? 'changes_requested' : c.status,
            feedback: c.feedback.map(f => {
              if (f.id !== feedbackId) return f;
              if (action === 'reopen') return { ...f, status: 'reopened' };
              return { ...f, replies: [...f.replies, data] };
            }),
          };
        }));
        setReplyText(prev => ({ ...prev, [feedbackId]: '' }));
        setReplyAttachFile(prev => ({ ...prev, [feedbackId]: null }));
        if (replyFileRefs.current[feedbackId]) {
          replyFileRefs.current[feedbackId]!.value = '';
        }
      }
    } finally {
      setReplySending(prev => ({ ...prev, [feedbackId]: false }));
    }
  };

  // ── Save custom columns ────────────────────────────────────────────────────

  const saveCustomColumns = async (newColumns: KanbanColumn[]) => {
    const customOnly = newColumns.filter(c => c.isCustom);
    await fetch(`/api/portal/${clientSlug}/${projectId}/kanban-columns`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ columns: customOnly.map(({ id, label, color }) => ({ id, label, color })) }),
    });
  };

  const addColumn = async () => {
    if (!newColName.trim()) return;
    setSavingCol(true);
    const newCol: KanbanColumn = {
      id: `custom_${Date.now()}`,
      label: newColName.trim(),
      color: newColColor,
      isCustom: true,
    };
    const updated = [...columns, newCol];
    setColumns(updated);
    await saveCustomColumns(updated);
    setNewColName('');
    setNewColColor(PRESET_COLORS[4]);
    setShowAddCol(false);
    setSavingCol(false);
  };

  const removeColumn = async (colId: string) => {
    const updated = columns.filter(c => c.id !== colId);
    setColumns(updated);
    await saveCustomColumns(updated);
  };

  // ── Drag handlers ──────────────────────────────────────────────────────────

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
    setDragOverCol(colId);
  };

  const handleDragLeave = (e: React.DragEvent, colId: string) => {
    // Only clear if leaving the column container itself
    if (!(e.currentTarget as HTMLElement).contains(e.relatedTarget as Node)) {
      setDragOverCol(prev => prev === colId ? null : prev);
    }
  };

  const handleDrop = async (e: React.DragEvent, colId: string) => {
    e.preventDefault();
    setDragOverCol(null);
    if (dragCardId) {
      await moveCard(dragCardId, colId);
    }
    setDragCardId(null);
  };

  // ── Add task ──────────────────────────────────────────────────────────────

  const addTask = async (colId: string) => {
    if (!newTaskTitle.trim()) return;
    setAddingTask(true);
    try {
      const res = await fetch(`/api/portal/${clientSlug}/${projectId}/deliverables`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newTaskTitle.trim(), description: newTaskDesc.trim() || null, status: colId }),
      });
      if (res.ok) {
        const newCard = await res.json();
        setCards(prev => [...prev, newCard]);
        setAddingTo(null);
        setNewTaskTitle('');
        setNewTaskDesc('');
      }
    } catch { /* ignore */ }
    setAddingTask(false);
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  const renderModal = () => {
    if (!selectedCard) return null;
    const col = columns.find(c => c.id === selectedCard.status) ?? columns[0];
    const hexToRgba = (hex: string, alpha: number) => {
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      return `rgba(${r},${g},${b},${alpha})`;
    };
    const colBg = col ? hexToRgba(col.color, 0.07) : 'transparent';
    const colBorder = col ? hexToRgba(col.color, 0.22) : 'var(--border)';
    return (
      <div
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
        onClick={() => setSelectedCard(null)}
      >
        <div
          style={{ width: '100%', maxWidth: 620, maxHeight: '88vh', overflowY: 'auto', background: 'var(--bg-elevated)', border: `1px solid ${colBorder}`, borderTop: col ? `4px solid ${col.color}` : undefined, borderRadius: 16, display: 'flex', flexDirection: 'column' }}
          onClick={e => e.stopPropagation()}
        >
          {/* Panel header */}
          <div style={{ padding: '13px 16px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, background: 'var(--bg-elevated)', zIndex: 1 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: col?.color, background: colBg, padding: '3px 10px', borderRadius: 20, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              {col?.label}
            </span>
            <button
              onClick={() => setSelectedCard(null)}
              style={{ width: 26, height: 26, borderRadius: 7, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-secondary)', fontSize: 16, cursor: 'pointer', lineHeight: 1 }}
            >×</button>
          </div>

          <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Title & details */}
            <div>
              <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--text)', marginBottom: 6, lineHeight: 1.4 }}>{selectedCard.title}</div>
              {selectedCard.description && (
                <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 8 }}>{selectedCard.description}</div>
              )}
              {selectedCard.previewUrl && (
                <a href={selectedCard.previewUrl} target="_blank" rel="noopener noreferrer"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'var(--accent)', color: '#fff', fontWeight: 600, fontSize: 13, padding: '7px 14px', borderRadius: 8, textDecoration: 'none' }}>
                  🔗 View Preview
                </a>
              )}
            </div>

            {/* Move To buttons */}
            <div style={{ paddingBottom: 14, borderBottom: '1px solid var(--border)' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Move To</div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {columns.filter(c => c.id !== selectedCard.status).map(c => {
                  const r = parseInt(c.color.slice(1, 3), 16);
                  const g = parseInt(c.color.slice(3, 5), 16);
                  const b = parseInt(c.color.slice(5, 7), 16);
                  return (
                    <button
                      key={c.id}
                      onClick={() => moveCard(selectedCard.id, c.id)}
                      style={{
                        fontSize: 11,
                        fontWeight: 600,
                        color: c.color,
                        background: `rgba(${r},${g},${b},0.08)`,
                        border: `1px solid rgba(${r},${g},${b},0.25)`,
                        borderRadius: 8,
                        padding: '4px 10px',
                        cursor: 'pointer',
                      }}
                    >
                      {c.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Comments thread */}
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>
                Comments ({selectedCard.feedback.length})
              </div>

              {selectedCard.feedback.length === 0 ? (
                <div style={{ fontSize: 13, color: 'var(--text-muted)', fontStyle: 'italic', marginBottom: 8 }}>No comments yet.</div>
              ) : (
                selectedCard.feedback.map(f => (
                  <div key={f.id} style={{ marginBottom: 12, background: 'var(--bg)', border: `1px solid ${BUG_STATUS_COLOR[f.status]}33`, borderLeft: `3px solid ${BUG_STATUS_COLOR[f.status]}`, borderRadius: 10, padding: '10px 12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 5 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: BUG_STATUS_COLOR[f.status] }}>{BUG_STATUS_LABEL[f.status] ?? f.status}</span>
                      <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{new Date(f.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.5, marginBottom: f.attachmentUrl ? 4 : 0 }}>{f.message}</div>
                    {f.attachmentUrl && (
                      <a href={f.attachmentUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: 'var(--accent)' }}>📎 {f.attachmentName || 'Attachment'}</a>
                    )}

                    {/* Replies */}
                    {f.replies.length > 0 && (
                      <div style={{ marginTop: 8, borderTop: '1px solid var(--border)', paddingTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {f.replies.map(r => (
                          <div key={r.id} style={{ padding: '7px 10px', background: r.addedBy === 'admin' ? 'rgba(6,214,160,0.08)' : 'var(--bg-elevated)', borderRadius: 8 }}>
                            <div style={{ fontSize: 10, fontWeight: 700, color: r.addedBy === 'admin' ? 'var(--accent)' : 'var(--text-muted)', marginBottom: 2 }}>
                              {r.addedBy === 'admin' ? '🛠 Rachna' : '👤 You'}
                            </div>
                            <div style={{ fontSize: 12, color: 'var(--text)' }}>{r.message}</div>
                            {r.attachmentUrl && <a href={r.attachmentUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: 'var(--accent)' }}>📎 {r.attachmentName}</a>}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Reopen button */}
                    {f.status === 'resolved' && (
                      <button
                        onClick={() => submitReply(f.id, selectedCard.id, 'reopen')}
                        disabled={replySending[f.id]}
                        style={{ marginTop: 8, background: 'transparent', border: '1px solid #F59E0B44', color: '#F59E0B', fontSize: 11, padding: '4px 10px', borderRadius: 6, cursor: 'pointer', fontWeight: 600 }}
                      >
                        🔄 Reopen
                      </button>
                    )}

                    {/* Reply input */}
                    {(f.status === 'in_progress' || f.status === 'open' || f.status === 'reopened') && (
                      <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 5 }}>
                        <div style={{ display: 'flex', gap: 5 }}>
                          <input
                            placeholder="Add a note…"
                            value={replyText[f.id] ?? ''}
                            onChange={e => setReplyText(prev => ({ ...prev, [f.id]: e.target.value }))}
                            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && submitReply(f.id, selectedCard.id, 'reply')}
                            style={{ flex: 1, background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 6, padding: '5px 9px', color: 'var(--text)', fontSize: 12 }}
                          />
                          <input
                            type="file"
                            style={{ display: 'none' }}
                            ref={el => { replyFileRefs.current[f.id] = el; }}
                            onChange={e => setReplyAttachFile(prev => ({ ...prev, [f.id]: e.target.files?.[0] ?? null }))}
                          />
                          <button
                            onClick={() => replyFileRefs.current[f.id]?.click()}
                            title="Attach file"
                            style={{ padding: '5px 8px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg-elevated)', color: 'var(--text-muted)', fontSize: 13, cursor: 'pointer' }}
                          >📎</button>
                          <button
                            onClick={() => submitReply(f.id, selectedCard.id, 'reply')}
                            disabled={!replyText[f.id]?.trim() || replySending[f.id]}
                            style={{ padding: '5px 10px', background: 'var(--accent)', color: '#fff', fontWeight: 700, fontSize: 13, border: 'none', borderRadius: 6, cursor: 'pointer' }}
                          >
                            {replySending[f.id] ? '…' : '↑'}
                          </button>
                        </div>
                        {replyAttachFile[f.id] && (
                          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>📎 {replyAttachFile[f.id]!.name}</div>
                        )}
                      </div>
                    )}
                  </div>
                ))
              )}

              {/* Add comment form */}
              <div style={{ marginTop: 8, padding: '12px', background: 'var(--bg)', border: '1px dashed var(--border)', borderRadius: 10 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', marginBottom: 8 }}>Add a comment</div>
                <textarea
                  value={commentText}
                  onChange={e => setCommentText(e.target.value)}
                  placeholder="Describe a change or add a note…"
                  rows={3}
                  style={{ width: '100%', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 7, padding: '8px 10px', color: 'var(--text)', fontSize: 12, resize: 'vertical', boxSizing: 'border-box' }}
                />
                <div style={{ display: 'flex', gap: 7, marginTop: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  <input
                    type="file"
                    ref={commentFileRef}
                    style={{ display: 'none' }}
                    onChange={e => setCommentAttachFile(e.target.files?.[0] ?? null)}
                    accept="image/*,application/pdf"
                  />
                  <button
                    onClick={() => commentFileRef.current?.click()}
                    style={{ padding: '5px 10px', borderRadius: 7, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-muted)', fontSize: 11, cursor: 'pointer' }}
                  >📎 Attach</button>
                  {commentAttachFile && <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>📎 {commentAttachFile.name}</span>}
                  <button
                    onClick={() => submitComment(selectedCard.id)}
                    disabled={!commentText.trim() || commentSubmitting}
                    style={{ marginLeft: 'auto', padding: '5px 14px', background: '#F87171', color: '#fff', fontWeight: 700, fontSize: 12, border: 'none', borderRadius: 7, cursor: 'pointer', opacity: !commentText.trim() || commentSubmitting ? 0.6 : 1 }}
                  >
                    {commentSubmitting ? '…' : 'Submit'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return <div style={{ color: 'var(--text-secondary)', fontSize: 14, padding: '20px 0' }}>Loading deliverables…</div>;
  }

  if (cards.length === 0) {
    return (
      <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 16, padding: '32px 24px', textAlign: 'center' }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>🏗️</div>
        <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--text)', marginBottom: 6 }}>Build in Progress</div>
        <div style={{ fontSize: 14, color: 'var(--text-muted)' }}>Deliverables will appear here as each part of the build is completed.</div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

      {/* ── Build Links Strip ─────────────────────────────────────────────── */}
      {buildLinks.length > 0 && (
        <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 12, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', flexShrink: 0 }}>📦 Latest Builds</span>
          {buildLinks.map(link => (
            <a key={link.id} href={link.url} target="_blank" rel="noopener noreferrer"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 12px', background: 'rgba(6,214,160,0.08)', border: '1px solid rgba(6,214,160,0.25)', borderRadius: 8, fontSize: 12, fontWeight: 600, color: '#06D6A0', textDecoration: 'none' }}>
              🔗 {link.label}
            </a>
          ))}
        </div>
      )}

      {/* ── Board ─────────────────────────────────────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 8, alignItems: 'flex-start' }}>
        {columns.map(col => {
          const colCards = cards.filter(c => c.status === col.id);
          const isDragTarget = dragOverCol === col.id;

          // Generate rgba versions from hex color
          const hexToRgba = (hex: string, alpha: number) => {
            const r = parseInt(hex.slice(1, 3), 16);
            const g = parseInt(hex.slice(3, 5), 16);
            const b = parseInt(hex.slice(5, 7), 16);
            return `rgba(${r},${g},${b},${alpha})`;
          };
          const colBg = hexToRgba(col.color, 0.07);
          const colBorder = hexToRgba(col.color, 0.22);

          return (
            <div key={col.id} style={{ width: 260, flexShrink: 0, display: 'flex', flexDirection: 'column' }}>
              {/* Column header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 12px', background: colBg, border: `1px solid ${colBorder}`, borderBottom: 'none', borderRadius: '12px 12px 0 0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  <div style={{ width: 9, height: 9, borderRadius: '50%', background: col.color, flexShrink: 0 }} />
                  <span style={{ fontSize: 11, fontWeight: 700, color: col.color, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{col.label}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: col.color, background: colBg, border: `1px solid ${colBorder}`, borderRadius: 20, padding: '2px 7px' }}>{colCards.length}</span>
                  {col.isCustom && (
                    <button
                      onClick={() => removeColumn(col.id)}
                      title="Remove column"
                      style={{ width: 18, height: 18, borderRadius: 4, border: `1px solid ${colBorder}`, background: 'transparent', color: col.color, fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1, opacity: 0.7 }}
                    >×</button>
                  )}
                </div>
              </div>

              {/* Cards container — droppable */}
              <div
                onDragOver={e => handleDragOver(e, col.id)}
                onDragLeave={e => handleDragLeave(e, col.id)}
                onDrop={e => handleDrop(e, col.id)}
                style={{
                  flex: 1,
                  padding: 8,
                  background: isDragTarget ? hexToRgba(col.color, 0.12) : 'var(--bg-elevated)',
                  border: isDragTarget ? `2px dashed ${col.color}` : `1px solid ${colBorder}`,
                  borderTop: 'none',
                  borderRadius: '0 0 12px 12px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                  minHeight: 120,
                  transition: 'background 0.15s, border 0.15s',
                }}
              >
                {colCards.length === 0 && !isDragTarget && (
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', padding: '16px 0', opacity: 0.5 }}>—</div>
                )}
                {colCards.map(card => {
                  const openBugs = card.feedback.filter(f => f.status === 'open' || f.status === 'reopened').length;
                  const isSelected = selectedCard?.id === card.id;

                  return (
                    <div
                      key={card.id}
                      draggable
                      onDragStart={e => handleDragStart(e, card.id)}
                      onDragEnd={handleDragEnd}
                      onClick={() => {
                        if (isSelected) {
                          setSelectedCard(null);
                        } else {
                          setSelectedCard(card);
                          setCommentText('');
                          setCommentAttachFile(null);
                        }
                      }}
                      style={{
                        background: 'var(--bg)',
                        border: `1px solid ${isSelected ? col.color : 'var(--border)'}`,
                        borderLeft: `3px solid ${col.color}`,
                        borderRadius: 10,
                        padding: '11px 12px',
                        cursor: 'grab',
                        transition: 'border-color 0.15s, box-shadow 0.15s, opacity 0.15s',
                        boxShadow: isSelected ? `0 0 0 2px ${hexToRgba(col.color, 0.2)}` : 'none',
                        opacity: dragCardId === card.id ? 0.5 : 1,
                        userSelect: 'none',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 6, marginBottom: 4 }}>
                        <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text)', lineHeight: 1.4 }}>{card.title}</div>
                        <span style={{ fontSize: 10, fontWeight: 600, color: card.addedBy === 'client' ? '#A78BFA' : 'var(--accent)', background: card.addedBy === 'client' ? 'rgba(167,139,250,0.1)' : 'rgba(6,214,160,0.1)', border: `1px solid ${card.addedBy === 'client' ? 'rgba(167,139,250,0.3)' : 'rgba(6,214,160,0.3)'}`, borderRadius: 6, padding: '2px 6px', flexShrink: 0, whiteSpace: 'nowrap' }}>
                          {card.addedBy === 'client' ? '👤 You' : '🛠 Rachna'}
                        </span>
                      </div>
                      {card.description && (
                        <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: 6, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                          {card.description}
                        </div>
                      )}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                        {card.previewUrl && (
                          <a href={card.previewUrl} target="_blank" rel="noopener noreferrer"
                            onClick={e => e.stopPropagation()}
                            style={{ fontSize: 11, color: 'var(--accent)', fontWeight: 600, textDecoration: 'none' }}>
                            🔗 Preview
                          </a>
                        )}
                        {openBugs > 0 && (
                          <span style={{ fontSize: 11, color: '#F87171', fontWeight: 600 }}>🐛 {openBugs}</span>
                        )}
                        {card.feedback.length > 0 && openBugs === 0 && (
                          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>💬 {card.feedback.length}</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Add task */}
              {addingTo === col.id ? (
                <div style={{ background: 'var(--bg-elevated)', border: `1px solid ${colBorder}`, borderTop: 'none', borderRadius: '0 0 12px 12px', padding: '10px 10px 12px' }}>
                  <input
                    autoFocus
                    placeholder="Task title…"
                    value={newTaskTitle}
                    onChange={e => setNewTaskTitle(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') addTask(col.id); if (e.key === 'Escape') { setAddingTo(null); setNewTaskTitle(''); setNewTaskDesc(''); } }}
                    style={{ width: '100%', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, padding: '7px 10px', color: 'var(--text)', fontSize: 12, marginBottom: 6, boxSizing: 'border-box' }}
                  />
                  <textarea
                    placeholder="Description (optional)…"
                    value={newTaskDesc}
                    onChange={e => setNewTaskDesc(e.target.value)}
                    rows={2}
                    style={{ width: '100%', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, padding: '7px 10px', color: 'var(--text)', fontSize: 12, resize: 'none', marginBottom: 8, boxSizing: 'border-box' }}
                  />
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button
                      onClick={() => addTask(col.id)}
                      disabled={addingTask || !newTaskTitle.trim()}
                      style={{ flex: 1, padding: '6px 0', background: col.color, color: '#fff', fontWeight: 700, fontSize: 12, border: 'none', borderRadius: 8, cursor: 'pointer', opacity: addingTask || !newTaskTitle.trim() ? 0.6 : 1 }}
                    >{addingTask ? '…' : 'Add'}</button>
                    <button
                      onClick={() => { setAddingTo(null); setNewTaskTitle(''); setNewTaskDesc(''); }}
                      style={{ padding: '6px 12px', background: 'transparent', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-muted)', fontSize: 12, cursor: 'pointer' }}
                    >Cancel</button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => { setAddingTo(col.id); setNewTaskTitle(''); setNewTaskDesc(''); }}
                  style={{ width: '100%', padding: '8px 0', background: 'transparent', border: `1px solid ${colBorder}`, borderTop: 'none', borderRadius: '0 0 12px 12px', color: col.color, fontSize: 12, cursor: 'pointer', fontWeight: 600, opacity: 0.7 }}
                >+ Add Task</button>
              )}
            </div>
          );
        })}

        {/* ── Add Board button / form ──────────────────────────────────────── */}
        <div style={{ width: 200, flexShrink: 0 }}>
          {showAddCol ? (
            <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 12, padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <input
                autoFocus
                placeholder="Column name…"
                value={newColName}
                onChange={e => setNewColName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') addColumn(); if (e.key === 'Escape') { setShowAddCol(false); setNewColName(''); } }}
                style={{ width: '100%', padding: '7px 10px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 7, color: 'var(--text)', fontSize: 13, boxSizing: 'border-box' }}
              />
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {PRESET_COLORS.map(c => (
                  <button
                    key={c}
                    onClick={() => setNewColColor(c)}
                    style={{ width: 22, height: 22, borderRadius: '50%', background: c, border: newColColor === c ? '2px solid var(--text)' : '2px solid transparent', cursor: 'pointer', padding: 0 }}
                  />
                ))}
              </div>
              <div style={{ display: 'flex', gap: 7 }}>
                <button
                  onClick={addColumn}
                  disabled={savingCol || !newColName.trim()}
                  style={{ flex: 1, padding: '6px 0', background: newColColor, color: '#0B0F1A', fontWeight: 700, fontSize: 12, border: 'none', borderRadius: 7, cursor: 'pointer', opacity: savingCol || !newColName.trim() ? 0.6 : 1 }}
                >
                  {savingCol ? '…' : 'Add'}
                </button>
                <button
                  onClick={() => { setShowAddCol(false); setNewColName(''); }}
                  style={{ padding: '6px 12px', background: 'transparent', color: 'var(--text-muted)', fontSize: 12, border: '1px solid var(--border)', borderRadius: 7, cursor: 'pointer' }}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowAddCol(true)}
              style={{ width: '100%', padding: '10px 0', background: 'transparent', border: '1.5px dashed var(--border)', borderRadius: 12, color: 'var(--text-muted)', fontSize: 13, cursor: 'pointer', fontWeight: 600, transition: 'opacity 0.15s' }}
            >
              + Add Board
            </button>
          )}
        </div>
      </div>

      {/* ── Card Detail Modal ──────────────────────────────────────────────── */}
      {renderModal()}
    </div>
  );
}
