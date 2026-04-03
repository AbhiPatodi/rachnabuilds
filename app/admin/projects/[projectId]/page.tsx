'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

const SECTION_TYPES = [
  { value: 'executive_summary', label: 'Executive Summary' },
  { value: 'performance_audit', label: 'Performance Audit' },
  { value: 'seo_audit', label: 'SEO Audit' },
  { value: 'cro_audit', label: 'CRO Audit' },
  { value: 'competitor_analysis', label: 'Competitor Analysis' },
  { value: 'pdp_analysis', label: 'PDP Analysis' },
  { value: 'mockup_review', label: 'Mockup Review' },
  { value: 'action_plan', label: 'Action Plan' },
  { value: 'proposal', label: 'Proposal' },
  { value: 'project_status', label: 'Project Status' },
];

const DOC_TYPES = [
  { value: 'rfp', label: 'RFP' },
  { value: 'mockup', label: 'Mockup' },
  { value: 'competitor_ref', label: 'Competitor Reference' },
  { value: 'brand_assets', label: 'Brand Assets' },
  { value: 'other', label: 'Other' },
];

const CLIENT_TYPES: Record<string, string> = {
  new_build: 'New Build',
  existing_optimisation: 'Existing Optimisation',
  audit_only: 'Audit Only',
  retainer: 'Retainer',
  landing_page: 'Landing Page',
  migration: 'Migration',
};

const EVENT_ICONS: Record<string, string> = {
  tab_view: '👁',
  doc_open: '📄',
  comment_add: '💬',
  file_submit: '📤',
  login: '🔑',
};

type Tab = 'overview' | 'sections' | 'documents' | 'sessions' | 'contract' | 'settings';

interface Section {
  id: string;
  sectionType: string;
  title: string;
  content: unknown;
  displayOrder: number;
}

interface Document {
  id: string;
  docType: string;
  title: string;
  url: string;
  notes?: string | null;
}

interface PortalSession {
  id: string;
  sessionId: string;
  ip: string | null;
  country: string | null;
  countryCode?: string | null;
  city?: string | null;
  device: string | null;
  browser: string | null;
  totalDuration: number;
  startedAt: string;
  lastActiveAt: string;
  tabsViewed: string[];
}

interface SessionStats {
  totalSessions: number;
  returnSessions: number;
  avgDuration: number;
  topTab: string | null;
}

interface PortalEvent {
  id: string;
  eventType: string;
  meta: unknown;
  sessionId?: string;
  createdAt: string;
}

interface PortalComment {
  id: string;
  author: string;
  context: string;
  text: string;
  createdAt: string;
}

interface AdminProfile {
  email?: string;
  phone?: string;
  whatsapp?: string;
  website?: string;
  instagram?: string;
  linkedin?: string;
  twitter?: string;
  notes?: string;
  proposalVisible?: boolean;
}

interface Project {
  id: string;
  name: string;
  clientType: string;
  status: string;
  isActive?: boolean;
  viewCount?: number;
  lastViewedAt?: string | null;
  createdAt: string;
  tabConfig?: unknown;
  adminProfile?: AdminProfile | null;
  client: {
    id: string;
    name: string;
    email?: string | null;
    phone?: string | null;
    slug: string;
    passwordPlain?: string | null;
  };
  sections: Section[];
  documents: Document[];
  analytics?: {
    commentCount: number;
    eventCounts: { eventType: string; _count: { eventType: number } }[];
  };
}

function formatDate(str: string) {
  return new Date(str).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatDuration(ms: number) {
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const rs = s % 60;
  if (m < 60) return rs > 0 ? `${m}m ${rs}s` : `${m}m`;
  const h = Math.floor(m / 60);
  const rm = m % 60;
  return rm > 0 ? `${h}h ${rm}m` : `${h}h`;
}

function countryFlag(code?: string | null) {
  if (!code || code.length !== 2) return '';
  return String.fromCodePoint(...code.toUpperCase().split('').map(c => 0x1F1E6 + c.charCodeAt(0) - 65));
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
}

export default function ProjectManagePage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.projectId as string;

  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<Tab>('overview');

  // Sections
  const [showSectionForm, setShowSectionForm] = useState(false);
  const [sectionType, setSectionType] = useState('executive_summary');
  const [sectionTitle, setSectionTitle] = useState('');
  const [sectionContent, setSectionContent] = useState('{}');
  const [sectionOrder, setSectionOrder] = useState(0);
  const [sectionLoading, setSectionLoading] = useState(false);
  const [sectionError, setSectionError] = useState('');

  // Documents — add form
  const [showDocForm, setShowDocForm] = useState(false);
  const [docType, setDocType] = useState('rfp');
  const [docTitle, setDocTitle] = useState('');
  const [docUrl, setDocUrl] = useState('');
  const [docNotes, setDocNotes] = useState('');
  const [docLoading, setDocLoading] = useState(false);
  const [docError, setDocError] = useState('');

  // Documents — inline edit
  const [editingDocId, setEditingDocId] = useState<string | null>(null);
  const [editDocType, setEditDocType] = useState('rfp');
  const [editDocTitle, setEditDocTitle] = useState('');
  const [editDocUrl, setEditDocUrl] = useState('');
  const [editDocNotes, setEditDocNotes] = useState('');
  const [editDocLoading, setEditDocLoading] = useState(false);

  // Sessions & events
  const [sessions, setSessions] = useState<{ sessions: PortalSession[]; stats: SessionStats } | null>(null);
  const [events, setEvents] = useState<PortalEvent[]>([]);
  const [comments, setComments] = useState<PortalComment[]>([]);
  const [activityLoading, setActivityLoading] = useState(false);
  const [expandedSession, setExpandedSession] = useState<string | null>(null);

  // Document logs
  type DocLogEntry = { id: string; documentId: string; action: string; actorType: string; docTitle?: string | null; createdAt: string };
  const [docLogs, setDocLogs] = useState<DocLogEntry[]>([]);
  const [docLogsLoaded, setDocLogsLoaded] = useState(false);
  const [showDocHistory, setShowDocHistory] = useState<Record<string, boolean>>({});

  // Settings
  const [tabConfigText, setTabConfigText] = useState('');
  const [proposalVisible, setProposalVisible] = useState(false);
  const [proposalToggling, setProposalToggling] = useState(false);
  const [adminNotes, setAdminNotes] = useState('');
  const [settingsSaving, setSettingsSaving] = useState(false);

  // Contract
  type ContractData = { id: string; content: string; status: string; clientSignature?: string | null; signedAt?: string | null; sentAt?: string | null };
  const [contract, setContract] = useState<ContractData | null>(null);
  const [contractLoading, setContractLoading] = useState(false);
  const [contractSaving, setContractSaving] = useState(false);
  const [contractSaved, setContractSaved] = useState(false);
  const [contractContent, setContractContent] = useState('');
  const [contractSending, setContractSending] = useState(false);

  // Overview — edit client info
  const [editingClientInfo, setEditingClientInfo] = useState(false);
  const [editClientName, setEditClientName] = useState('');
  const [editClientEmail, setEditClientEmail] = useState('');
  const [editClientPhone, setEditClientPhone] = useState('');
  const [clientInfoSaving, setClientInfoSaving] = useState(false);

  // Overview — edit admin profile
  const [editingAdminProfile, setEditingAdminProfile] = useState(false);
  const [adminDraft, setAdminDraft] = useState<AdminProfile>({});
  const [adminProfileSaving, setAdminProfileSaving] = useState(false);

  // Share modal
  const [showShareModal, setShowShareModal] = useState(false);
  const [sharePassword, setSharePassword] = useState('');
  const [msgCopied, setMsgCopied] = useState(false);
  const [pwCopied, setPwCopied] = useState(false);

  const fetchProject = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/projects/${projectId}`);
      if (!res.ok) { setError('Project not found'); return; }
      const data = await res.json();
      setProject(data);
      setTabConfigText(JSON.stringify(data.tabConfig ?? {}, null, 2));
      setProposalVisible(!!(data.adminProfile as Record<string, unknown>)?.proposalVisible);
      setAdminNotes((data.adminProfile as Record<string, unknown>)?.notes as string ?? '');
    } catch {
      setError('Failed to load project');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  const loadActivity = useCallback(async () => {
    setActivityLoading(true);
    try {
      const [evRes, sessRes] = await Promise.all([
        fetch(`/api/admin/projects/${projectId}/events`),
        fetch(`/api/admin/projects/${projectId}/sessions`),
      ]);
      if (evRes.ok) {
        const d = await evRes.json();
        setEvents(d.events ?? []);
        setComments(d.comments ?? []);
      }
      if (sessRes.ok) {
        const d = await sessRes.json();
        setSessions(d);
      }
    } catch {
      // non-critical
    } finally {
      setActivityLoading(false);
    }
  }, [projectId]);

  useEffect(() => { fetchProject(); loadActivity(); }, [fetchProject, loadActivity]);

  // Load contract when tab is opened
  useEffect(() => {
    if (activeTab !== 'contract' || contract !== null) return;
    setContractLoading(true);
    fetch(`/api/admin/projects/${projectId}/contract`)
      .then(r => r.json())
      .then(d => { setContract(d); setContractContent(d.content ?? ''); })
      .catch(() => {})
      .finally(() => setContractLoading(false));
  }, [activeTab, projectId, contract]);

  // ─── Share modal helpers ───────────────────────────────────────────────────
  const openShareModal = (p: Project) => {
    const pw = p.client.passwordPlain
      || (typeof localStorage !== 'undefined' ? localStorage.getItem(`share_pw_${p.client.slug}`) : '')
      || '';
    setSharePassword(pw);
    setShowShareModal(true);
  };

  const updateSharePassword = (val: string, slug: string) => {
    setSharePassword(val);
    if (typeof localStorage !== 'undefined') {
      if (val) localStorage.setItem(`share_pw_${slug}`, val);
      else localStorage.removeItem(`share_pw_${slug}`);
    }
  };

  const shareMessage = (p: Project) => {
    const link = `https://rachnabuilds.com/portal/${p.client.slug}`;
    const pw = sharePassword || '[password]';
    return `Hi ${p.client.name}! 👋\n\nYour portal is ready for review.\n\n🔗 Portal: ${link}\n🔑 Password: ${pw}\n\nLet me know if you have any questions!\n\n— Rachna\nrachnabuilds.com`;
  };

  const copyShareMessage = async () => {
    if (!project) return;
    await navigator.clipboard.writeText(shareMessage(project));
    setMsgCopied(true);
    setTimeout(() => setMsgCopied(false), 2000);
  };

  const copyPassword = async () => {
    if (!sharePassword) return;
    await navigator.clipboard.writeText(sharePassword);
    setPwCopied(true);
    setTimeout(() => setPwCopied(false), 2000);
  };

  const openWhatsApp = () => {
    if (!project) return;
    window.open(`https://wa.me/?text=${encodeURIComponent(shareMessage(project))}`, '_blank');
  };

  // ─── Proposal toggle ─────────────────────────────────────────────────────
  const toggleProposalVisible = async () => {
    if (!project) return;
    setProposalToggling(true);
    const next = !proposalVisible;
    await fetch(`/api/admin/projects/${projectId}/admin-profile`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ proposalVisible: next }),
    });
    setProposalVisible(next);
    setProject(p => p ? { ...p, adminProfile: { ...p.adminProfile, proposalVisible: next } } : p);
    setProposalToggling(false);
  };

  // ─── Delete project ──────────────────────────────────────────────────────
  const handleDeleteProject = async () => {
    if (!confirm('Delete this entire project? This cannot be undone.')) return;
    await fetch(`/api/admin/projects/${projectId}`, { method: 'DELETE' });
    router.push('/admin/clients');
  };

  // ─── Activate/deactivate ─────────────────────────────────────────────────
  const toggleActive = async () => {
    if (!project) return;
    await fetch(`/api/admin/projects/${projectId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !project.isActive }),
    });
    fetchProject();
  };

  // ─── Client info edit ────────────────────────────────────────────────────
  const startEditClientInfo = () => {
    if (!project) return;
    setEditClientName(project.client.name);
    setEditClientEmail(project.client.email ?? '');
    setEditClientPhone(project.client.phone ?? '');
    setEditingClientInfo(true);
  };

  const saveClientInfo = async () => {
    if (!project) return;
    setClientInfoSaving(true);
    await fetch(`/api/admin/clients/${project.client.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: editClientName.trim(),
        email: editClientEmail.trim() || null,
        phone: editClientPhone.trim() || null,
      }),
    });
    setClientInfoSaving(false);
    setEditingClientInfo(false);
    fetchProject();
  };

  // ─── Admin profile edit ──────────────────────────────────────────────────
  const startEditAdminProfile = () => {
    setAdminDraft(project?.adminProfile ?? {});
    setEditingAdminProfile(true);
  };

  const saveAdminProfile = async () => {
    setAdminProfileSaving(true);
    await fetch(`/api/admin/projects/${projectId}/admin-profile`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(adminDraft),
    });
    setAdminProfileSaving(false);
    setEditingAdminProfile(false);
    fetchProject();
  };

  // ─── Sections ─────────────────────────────────────────────────────────────
  const handleAddSection = async (e: React.FormEvent) => {
    e.preventDefault();
    setSectionError('');
    setSectionLoading(true);
    try {
      let parsedContent: unknown;
      try { parsedContent = JSON.parse(sectionContent); } catch {
        setSectionError('Content must be valid JSON');
        setSectionLoading(false);
        return;
      }
      const res = await fetch(`/api/admin/projects/${projectId}/sections`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sectionType, title: sectionTitle, content: parsedContent, displayOrder: sectionOrder }),
      });
      if (!res.ok) { setSectionError('Failed to add section'); return; }
      setSectionTitle('');
      setSectionContent('{}');
      setSectionOrder(0);
      setSectionType('executive_summary');
      setShowSectionForm(false);
      fetchProject();
    } catch {
      setSectionError('Something went wrong');
    } finally {
      setSectionLoading(false);
    }
  };

  const handleDeleteSection = async (sectionId: string) => {
    if (!confirm('Delete this section?')) return;
    await fetch(`/api/admin/projects/${projectId}/sections/${sectionId}`, { method: 'DELETE' });
    setProject(p => p ? { ...p, sections: p.sections.filter(s => s.id !== sectionId) } : p);
  };

  // ─── Documents ────────────────────────────────────────────────────────────
  const handleAddDoc = async (e: React.FormEvent) => {
    e.preventDefault();
    setDocError('');
    setDocLoading(true);
    try {
      const res = await fetch(`/api/admin/projects/${projectId}/documents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ docType, title: docTitle, url: docUrl, notes: docNotes }),
      });
      if (!res.ok) { setDocError('Failed to add document'); return; }
      const data = await res.json();
      setProject(p => p ? { ...p, documents: [...p.documents, data] } : p);
      setDocTitle('');
      setDocUrl('');
      setDocNotes('');
      setShowDocForm(false);
    } catch {
      setDocError('Something went wrong');
    } finally {
      setDocLoading(false);
    }
  };

  const startEditDoc = (doc: Document) => {
    setEditingDocId(doc.id);
    setEditDocType(doc.docType);
    setEditDocTitle(doc.title);
    setEditDocUrl(doc.url);
    setEditDocNotes(doc.notes ?? '');
  };

  const cancelEditDoc = () => setEditingDocId(null);

  const handleSaveDocEdit = async (docId: string) => {
    setEditDocLoading(true);
    await fetch(`/api/admin/projects/${projectId}/documents`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ docId, docType: editDocType, title: editDocTitle, url: editDocUrl, notes: editDocNotes }),
    });
    setEditDocLoading(false);
    setEditingDocId(null);
    fetchProject();
  };

  const handleDeleteDoc = async (docId: string) => {
    if (!confirm('Delete this document?')) return;
    await fetch(`/api/admin/projects/${projectId}/documents?docId=${docId}`, { method: 'DELETE' });
    setProject(p => p ? { ...p, documents: p.documents.filter(d => d.id !== docId) } : p);
  };

  // ─── Contract save / send ─────────────────────────────────────────────────
  const saveContract = async () => {
    setContractSaving(true);
    try {
      const res = await fetch(`/api/admin/projects/${projectId}/contract`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: contractContent }),
      });
      if (res.ok) {
        const d = await res.json();
        setContract(d);
        setContractSaved(true);
        setTimeout(() => setContractSaved(false), 2000);
      }
    } finally {
      setContractSaving(false);
    }
  };

  const sendContract = async () => {
    if (!confirm('Send this contract to the client? They will see it in their portal.')) return;
    setContractSending(true);
    try {
      const res = await fetch(`/api/admin/projects/${projectId}/contract`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'sent' }),
      });
      if (res.ok) setContract(await res.json());
    } finally {
      setContractSending(false);
    }
  };

  // ─── Settings save ────────────────────────────────────────────────────────
  const saveSettings = async () => {
    setSettingsSaving(true);
    try {
      let parsedConfig: unknown;
      try { parsedConfig = JSON.parse(tabConfigText); } catch { parsedConfig = {}; }
      await fetch(`/api/admin/projects/${projectId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tabConfig: parsedConfig }),
      });
      await fetch(`/api/admin/projects/${projectId}/admin-profile`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: adminNotes }),
      });
      fetchProject();
    } catch {
      // silently fail
    } finally {
      setSettingsSaving(false);
    }
  };


  // ─── Guards ───────────────────────────────────────────────────────────────
  if (loading) return <div className="admin-content"><div className="admin-empty">Loading…</div></div>;
  if (error || !project) return <div className="admin-content"><div className="admin-alert admin-alert-error">{error || 'Not found'}</div></div>;

  const portalUrl = `rachnabuilds.com/portal/${project.client.slug}/${project.id}`;

  return (
    <div className="admin-content">
      {/* Breadcrumb */}
      <div className="admin-breadcrumb">
        <Link href="/admin/dashboard">Dashboard</Link>
        <span>/</span>
        <Link href="/admin/clients">Clients</Link>
        <span>/</span>
        <Link href={`/admin/clients/${project.client.id}`}>{project.client.name}</Link>
        <span>/</span>
        <span className="current">{project.name}</span>
      </div>

      {/* Header */}
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">{project.name}</h1>
          <p className="admin-page-subtitle">
            <Link href={`/admin/clients/${project.client.id}`} style={{ color: 'var(--accent)', textDecoration: 'none' }}>
              {project.client.name}
            </Link>
            {' '}· {CLIENT_TYPES[project.clientType] ?? project.clientType} · {project.status}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <a
            href={`/api/portal/preview?slug=${project.client.slug}&project=${project.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="admin-btn admin-btn-ghost"
            style={{ fontSize: 13, textDecoration: 'none' }}
          >
            👁 Preview Portal
          </a>
          <button
            className="admin-btn admin-btn-ghost"
            onClick={toggleProposalVisible}
            disabled={proposalToggling}
            style={{
              fontSize: 13,
              borderColor: proposalVisible ? '#06D6A0' : undefined,
              color: proposalVisible ? '#06D6A0' : undefined,
            }}
          >
            {proposalToggling ? '...' : proposalVisible ? '✅ Proposal: Visible' : '🔒 Proposal: Hidden'}
          </button>
          <button
            className="admin-btn admin-btn-ghost"
            onClick={() => openShareModal(project)}
            style={{ fontSize: 13 }}
          >
            📤 Share
          </button>
          <button className="admin-btn admin-btn-danger" onClick={handleDeleteProject} style={{ fontSize: 13 }}>
            <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <polyline points="3,6 5,6 21,6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/>
            </svg>
            Delete
          </button>
        </div>
      </div>

      {/* Stats strip */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        {[
          { label: '👁 Views', value: project.viewCount ?? 0 },
          { label: '📅 Last Viewed', value: project.lastViewedAt ? timeAgo(project.lastViewedAt) : 'Never' },
          { label: '👤 Sessions', value: sessions?.stats?.totalSessions ?? 0 },
          { label: '⏱ Avg Duration', value: sessions?.stats?.avgDuration ? formatDuration(sessions.stats.avgDuration) : '—' },
          { label: '🏆 Top Tab', value: sessions?.stats?.topTab ?? '—' },
        ].map(stat => (
          <div
            key={stat.label}
            style={{
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border)',
              borderRadius: 10,
              padding: '10px 16px',
              minWidth: 100,
            }}
          >
            <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', lineHeight: 1 }}>{stat.value}</div>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4 }}>{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="settings-tabs">
        {(['overview', 'sections', 'documents', 'sessions', 'contract', 'settings'] as Tab[]).map(tab => (
          <button
            key={tab}
            className={`settings-tab${activeTab === tab ? ' active' : ''}`}
            onClick={() => setActiveTab(tab)}
            style={{ textTransform: 'capitalize' }}
          >
            {tab}
            {tab === 'sections' && ` (${project.sections.length})`}
            {tab === 'documents' && ` (${project.documents.length})`}
          </button>
        ))}
      </div>

      {/* ─── OVERVIEW ─── */}
      {activeTab === 'overview' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Project Info */}
          <div className="admin-card">
            <div className="admin-card-title">
              Project Info
              <button
                className={`admin-btn admin-btn-icon ${project.isActive ? 'admin-btn-danger' : 'admin-btn-ghost'}`}
                onClick={toggleActive}
                style={{ fontSize: 12 }}
              >
                {project.isActive ? 'Deactivate' : 'Activate'}
              </button>
            </div>
            <div className="admin-info-grid">
              <div className="admin-info-item">
                <label>Project Name</label>
                <span>{project.name}</span>
              </div>
              <div className="admin-info-item">
                <label>Type</label>
                <span>{CLIENT_TYPES[project.clientType] ?? project.clientType}</span>
              </div>
              <div className="admin-info-item">
                <label>Status</label>
                <span style={{ textTransform: 'capitalize' }}>{project.status}</span>
              </div>
              <div className="admin-info-item">
                <label>Active</label>
                <span>
                  <span className={`badge ${project.isActive ? 'badge-green' : 'badge-red'}`}>
                    <span className="badge-dot" />
                    {project.isActive ? 'Active' : 'Inactive'}
                  </span>
                </span>
              </div>
              <div className="admin-info-item">
                <label>Created</label>
                <span>{formatDate(project.createdAt)}</span>
              </div>
              <div className="admin-info-item">
                <label>Portal URL</label>
                <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12 }}>{portalUrl}</span>
              </div>
            </div>
          </div>

          {/* Client Info */}
          <div className="admin-card">
            <div className="admin-card-title">
              Client Info
              <button
                className="admin-btn admin-btn-ghost admin-btn-icon"
                onClick={editingClientInfo ? () => setEditingClientInfo(false) : startEditClientInfo}
                style={{ fontSize: 12 }}
              >
                {editingClientInfo ? '✕ Cancel' : '✏️ Edit'}
              </button>
            </div>
            {editingClientInfo ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div className="admin-form-row">
                  <div className="admin-field">
                    <label className="admin-label">Name *</label>
                    <input className="admin-input" value={editClientName} onChange={e => setEditClientName(e.target.value)} required />
                  </div>
                  <div className="admin-field">
                    <label className="admin-label">Email</label>
                    <input className="admin-input" type="email" value={editClientEmail} onChange={e => setEditClientEmail(e.target.value)} placeholder="client@example.com" />
                  </div>
                  <div className="admin-field">
                    <label className="admin-label">Phone</label>
                    <input className="admin-input" type="tel" value={editClientPhone} onChange={e => setEditClientPhone(e.target.value)} placeholder="+91 98765 43210" />
                  </div>
                </div>
                <div>
                  <button className="admin-btn admin-btn-primary" onClick={saveClientInfo} disabled={clientInfoSaving || !editClientName.trim()} style={{ fontSize: 13 }}>
                    {clientInfoSaving ? 'Saving…' : 'Save Client Info'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="admin-info-grid">
                <div className="admin-info-item">
                  <label>Name</label>
                  <span>
                    <Link href={`/admin/clients/${project.client.id}`} style={{ color: 'var(--accent)', textDecoration: 'none' }}>
                      {project.client.name}
                    </Link>
                  </span>
                </div>
                <div className="admin-info-item">
                  <label>Email</label>
                  <span>{project.client.email || '—'}</span>
                </div>
                <div className="admin-info-item">
                  <label>Phone</label>
                  <span>{project.client.phone || '—'}</span>
                </div>
                <div className="admin-info-item">
                  <label>Portal Slug</label>
                  <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12 }}>{project.client.slug}</span>
                </div>
              </div>
            )}
          </div>

          {/* Admin Profile (contact info for portal) */}
          <div className="admin-card">
            <div className="admin-card-title">
              <div className="admin-section-label">
                Admin Contact Info
                <span style={{ fontSize: 11, fontWeight: 400, color: 'var(--text-secondary)', marginLeft: 8 }}>(shown read-only in portal)</span>
              </div>
              <button
                className="admin-btn admin-btn-ghost"
                onClick={editingAdminProfile ? () => setEditingAdminProfile(false) : startEditAdminProfile}
                style={{ fontSize: 12 }}
              >
                {editingAdminProfile ? '✕ Cancel' : '✏️ Edit'}
              </button>
            </div>
            {editingAdminProfile ? (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12, marginBottom: 14 }}>
                  {[
                    { key: 'email', label: 'Email', icon: '✉️' },
                    { key: 'phone', label: 'Phone', icon: '📞' },
                    { key: 'whatsapp', label: 'WhatsApp', icon: '💬' },
                    { key: 'website', label: 'Website', icon: '🌐' },
                    { key: 'instagram', label: 'Instagram', icon: '📸' },
                    { key: 'linkedin', label: 'LinkedIn', icon: '💼' },
                    { key: 'twitter', label: 'X / Twitter', icon: '𝕏' },
                    { key: 'notes', label: 'Notes', icon: '📝' },
                  ].map(f => (
                    <div key={f.key} className="admin-field">
                      <label className="admin-label">{f.icon} {f.label}</label>
                      <input
                        className="admin-input"
                        type={f.key === 'email' ? 'email' : 'text'}
                        value={(adminDraft[f.key as keyof AdminProfile] as string) ?? ''}
                        onChange={e => setAdminDraft(d => ({ ...d, [f.key]: e.target.value }))}
                      />
                    </div>
                  ))}
                </div>
                <button className="admin-btn admin-btn-primary" onClick={saveAdminProfile} disabled={adminProfileSaving} style={{ fontSize: 13 }}>
                  {adminProfileSaving ? 'Saving…' : 'Save Contact Info'}
                </button>
              </>
            ) : project.adminProfile && Object.entries(project.adminProfile).some(([k, v]) => k !== 'proposalVisible' && k !== 'notes' && v) ? (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                {[
                  { key: 'email', label: 'Email', icon: '✉️' },
                  { key: 'phone', label: 'Phone', icon: '📞' },
                  { key: 'whatsapp', label: 'WhatsApp', icon: '💬' },
                  { key: 'website', label: 'Website', icon: '🌐' },
                  { key: 'instagram', label: 'Instagram', icon: '📸' },
                  { key: 'linkedin', label: 'LinkedIn', icon: '💼' },
                  { key: 'twitter', label: 'X / Twitter', icon: '𝕏' },
                ].filter(f => project.adminProfile![f.key as keyof AdminProfile]).map(f => (
                  <div key={f.key} style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 10, padding: '8px 14px' }}>
                    <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 3 }}>{f.icon} {f.label}</div>
                    <div style={{ fontSize: 13, color: 'var(--text)', wordBreak: 'break-all' }}>{project.adminProfile![f.key as keyof AdminProfile] as string}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="admin-empty" style={{ padding: '16px 0' }}>No contact info yet. Click Edit to add phone, Instagram, etc.</div>
            )}
          </div>
        </div>
      )}

      {/* ─── SECTIONS ─── */}
      {activeTab === 'sections' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="admin-card">
            <div className="admin-card-title">
              Sections
              <button
                className="admin-btn admin-btn-primary admin-btn-icon"
                onClick={() => setShowSectionForm(!showSectionForm)}
                style={{ fontSize: 12 }}
              >
                {showSectionForm ? '✕ Cancel' : '+ Add Section'}
              </button>
            </div>

            {showSectionForm && (
              <div className="admin-add-form-wrapper" style={{ marginBottom: 20 }}>
                <div className="admin-add-form-title">New Section</div>
                {sectionError && <div className="admin-alert admin-alert-error" style={{ marginBottom: 12 }}>{sectionError}</div>}
                <form onSubmit={handleAddSection} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div className="admin-form-row">
                    <div className="admin-field">
                      <label className="admin-label">Section Type</label>
                      <select className="admin-select" value={sectionType} onChange={e => setSectionType(e.target.value)}>
                        {SECTION_TYPES.map(t => (
                          <option key={t.value} value={t.value}>{t.label}</option>
                        ))}
                      </select>
                    </div>
                    <div className="admin-field">
                      <label className="admin-label">Display Order</label>
                      <input
                        type="number"
                        className="admin-input"
                        value={sectionOrder}
                        onChange={e => setSectionOrder(Number(e.target.value))}
                        min={0}
                      />
                    </div>
                  </div>
                  <div className="admin-field">
                    <label className="admin-label">Title *</label>
                    <input
                      className="admin-input"
                      placeholder="Section title"
                      value={sectionTitle}
                      onChange={e => setSectionTitle(e.target.value)}
                      required
                    />
                  </div>
                  <div className="admin-field">
                    <label className="admin-label">Content (JSON)</label>
                    <textarea
                      className="admin-textarea"
                      value={sectionContent}
                      onChange={e => setSectionContent(e.target.value)}
                      rows={6}
                      style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12 }}
                    />
                  </div>
                  <div>
                    <button type="submit" className="admin-btn admin-btn-primary" disabled={sectionLoading} style={{ fontSize: 13 }}>
                      {sectionLoading ? 'Adding…' : 'Add Section'}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {project.sections.length === 0 ? (
              <div className="admin-empty">No sections yet. Add your first section above.</div>
            ) : (
              [...project.sections].sort((a, b) => a.displayOrder - b.displayOrder).map(section => (
                <div key={section.id} className="admin-section-item">
                  <div className="admin-section-item-info">
                    <div className="admin-section-item-title">{section.title}</div>
                    <div className="admin-section-item-meta">
                      {SECTION_TYPES.find(t => t.value === section.sectionType)?.label ?? section.sectionType} · Order: {section.displayOrder}
                    </div>
                  </div>
                  <div className="admin-section-item-actions">
                    <button
                      className="admin-btn admin-btn-danger admin-btn-icon"
                      onClick={() => handleDeleteSection(section.id)}
                      style={{ fontSize: 12 }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ─── DOCUMENTS ─── */}
      {activeTab === 'documents' && !docLogsLoaded && (() => {
        fetch(`/api/admin/projects/${projectId}/document-logs`)
          .then(r => r.json()).then(d => { setDocLogs(d.logs ?? []); setDocLogsLoaded(true); }).catch(() => {});
        return null;
      })()}
      {activeTab === 'documents' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="admin-card">
            <div className="admin-card-title">
              Documents
              <button
                className="admin-btn admin-btn-primary admin-btn-icon"
                onClick={() => setShowDocForm(!showDocForm)}
                style={{ fontSize: 12 }}
              >
                {showDocForm ? '✕ Cancel' : '+ Add Document'}
              </button>
            </div>

            {showDocForm && (
              <div className="admin-add-form-wrapper" style={{ marginBottom: 20 }}>
                <div className="admin-add-form-title">New Document</div>
                {docError && <div className="admin-alert admin-alert-error" style={{ marginBottom: 12 }}>{docError}</div>}
                <form onSubmit={handleAddDoc} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div className="admin-form-row">
                    <div className="admin-field">
                      <label className="admin-label">Doc Type</label>
                      <select className="admin-select" value={docType} onChange={e => setDocType(e.target.value)}>
                        {DOC_TYPES.map(t => (
                          <option key={t.value} value={t.value}>{t.label}</option>
                        ))}
                      </select>
                    </div>
                    <div className="admin-field">
                      <label className="admin-label">Title *</label>
                      <input
                        className="admin-input"
                        placeholder="Document title"
                        value={docTitle}
                        onChange={e => setDocTitle(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                  <div className="admin-field">
                    <label className="admin-label">URL *</label>
                    <input
                      className="admin-input"
                      type="url"
                      placeholder="https://drive.google.com/..."
                      value={docUrl}
                      onChange={e => setDocUrl(e.target.value)}
                      required
                    />
                  </div>
                  <div className="admin-field">
                    <label className="admin-label">Notes</label>
                    <textarea
                      className="admin-textarea"
                      rows={3}
                      placeholder="Optional notes…"
                      value={docNotes}
                      onChange={e => setDocNotes(e.target.value)}
                    />
                  </div>
                  <div>
                    <button type="submit" className="admin-btn admin-btn-primary" disabled={docLoading} style={{ fontSize: 13 }}>
                      {docLoading ? 'Adding…' : 'Add Document'}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {project.documents.length === 0 ? (
              <div className="admin-empty">No documents yet.</div>
            ) : (
              project.documents.map(doc => (
                <div key={doc.id}>
                  {editingDocId === doc.id ? (
                    <div className="admin-add-form-wrapper" style={{ marginBottom: 12 }}>
                      <div className="admin-add-form-title">Edit Document</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        <div className="admin-form-row">
                          <div className="admin-field">
                            <label className="admin-label">Doc Type</label>
                            <select className="admin-select" value={editDocType} onChange={e => setEditDocType(e.target.value)}>
                              {DOC_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                            </select>
                          </div>
                          <div className="admin-field">
                            <label className="admin-label">Title</label>
                            <input type="text" className="admin-input" value={editDocTitle} onChange={e => setEditDocTitle(e.target.value)} />
                          </div>
                        </div>
                        <div className="admin-field">
                          <label className="admin-label">URL</label>
                          <input type="url" className="admin-input" value={editDocUrl} onChange={e => setEditDocUrl(e.target.value)} />
                        </div>
                        <div className="admin-field">
                          <label className="admin-label">Notes</label>
                          <textarea className="admin-textarea" value={editDocNotes} onChange={e => setEditDocNotes(e.target.value)} rows={2} />
                        </div>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button className="admin-btn admin-btn-primary" style={{ fontSize: 12 }} onClick={() => handleSaveDocEdit(doc.id)} disabled={editDocLoading}>
                            {editDocLoading ? 'Saving…' : 'Save'}
                          </button>
                          <button className="admin-btn admin-btn-ghost" style={{ fontSize: 12 }} onClick={cancelEditDoc}>Cancel</button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div style={{ flexDirection: 'column', gap: 0 }} className="admin-section-item">
                      <div style={{ display: 'flex', width: '100%', alignItems: 'flex-start' }}>
                        <div className="admin-section-item-info" style={{ flex: 1 }}>
                          <div className="admin-section-item-title">{doc.title}</div>
                          <div className="admin-section-item-meta">
                            {DOC_TYPES.find(t => t.value === doc.docType)?.label ?? doc.docType}
                            {doc.notes ? ` · ${doc.notes}` : ''}
                          </div>
                          <a href={doc.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: 'var(--accent)', textDecoration: 'none', marginTop: 2 }}>
                            {doc.url.length > 60 ? `${doc.url.slice(0, 60)}…` : doc.url}
                          </a>
                        </div>
                        <div className="admin-section-item-actions">
                          <a href={doc.url} target="_blank" rel="noopener noreferrer" className="admin-btn admin-btn-ghost admin-btn-icon" style={{ fontSize: 12 }}>
                            Open ↗
                          </a>
                          <button className="admin-btn admin-btn-ghost admin-btn-icon" style={{ fontSize: 12 }} onClick={() => startEditDoc(doc)}>
                            Edit
                          </button>
                          <button
                            className="admin-btn admin-btn-danger admin-btn-icon"
                            onClick={() => handleDeleteDoc(doc.id)}
                            style={{ fontSize: 12 }}
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                      {(() => {
                        const dLogs = docLogs.filter(l => l.documentId === doc.id).slice(0, 5);
                        if (dLogs.length === 0) return null;
                        const open = !!showDocHistory[doc.id];
                        const DOC_ACTION_LABELS: Record<string, string> = { added: 'Added', url_changed: 'File/link updated', note_edited: 'Note edited', deleted: 'Removed' };
                        return (
                          <div style={{ width: '100%', paddingTop: 8, marginTop: 4, borderTop: '1px solid var(--border)' }}>
                            <button onClick={() => setShowDocHistory(prev => ({ ...prev, [doc.id]: !prev[doc.id] }))}
                              style={{ fontSize: 11, color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                              {open ? '▲ Hide history' : `▼ History (${dLogs.length})`}
                            </button>
                            {open && (
                              <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 5 }}>
                                {dLogs.map(log => (
                                  <div key={log.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
                                    <span style={{ color: 'var(--text-secondary)' }}>
                                      {log.actorType === 'admin' ? '👩‍💼 Rachna' : '👤 Client'} — {DOC_ACTION_LABELS[log.action] ?? log.action}
                                    </span>
                                    <span style={{ color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace', fontSize: 10 }}>
                                      {new Date(log.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ─── SESSIONS ─── */}
      {activeTab === 'sessions' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Session stats */}
          {sessions && (
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {[
                { label: '👤 Total Sessions', value: sessions.stats.totalSessions },
                { label: '🔁 Return Visits', value: sessions.stats.returnSessions },
                { label: '⏱ Avg Duration', value: sessions.stats.avgDuration ? formatDuration(sessions.stats.avgDuration) : '—' },
              ].map(s => (
                <div key={s.label} style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 16px' }}>
                  <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)' }}>{s.value}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 3 }}>{s.label}</div>
                </div>
              ))}
              {sessions.stats.topTab && (
                <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 16px' }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--accent)' }}>{sessions.stats.topTab}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 3 }}>🏆 Top Tab</div>
                </div>
              )}
            </div>
          )}

          <div className="admin-card">
            <div className="admin-card-title">Sessions</div>
            {activityLoading ? (
              <div className="admin-empty">Loading sessions…</div>
            ) : !sessions || sessions.sessions.length === 0 ? (
              <div className="admin-empty">No sessions recorded yet.</div>
            ) : (
              sessions.sessions.map((sess, i) => (
                <div key={sess.id} className="admin-section-item" style={{ flexDirection: 'column', alignItems: 'flex-start' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                    <div className="admin-section-item-info">
                      <div className="admin-section-item-title">
                        {countryFlag(sess.countryCode)} #{sessions.sessions.length - i} · {[sess.city, sess.country].filter(Boolean).join(', ') || 'Unknown location'}
                        {' '}· {sess.device ?? 'unknown device'} · {sess.browser ?? ''}
                      </div>
                      <div className="admin-section-item-meta">
                        {timeAgo(sess.startedAt)} · {sess.totalDuration ? formatDuration(sess.totalDuration) : '< 1s'}
                        {sess.ip ? ` · ${sess.ip}` : ''}
                      </div>
                    </div>
                    <button
                      className="admin-btn admin-btn-ghost admin-btn-icon"
                      onClick={() => setExpandedSession(expandedSession === sess.id ? null : sess.id)}
                      style={{ fontSize: 11 }}
                    >
                      {expandedSession === sess.id ? '▲ Hide' : '▼ Details'}
                    </button>
                  </div>
                  {expandedSession === sess.id && (() => {
                    const sessEvents = events.filter(ev => ev.sessionId === sess.id);
                    return (
                      <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--border)', width: '100%' }}>
                        <div className="admin-section-item-meta" style={{ marginBottom: 6 }}>Tabs viewed:</div>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: sessEvents.length > 0 ? 12 : 0 }}>
                          {(sess.tabsViewed ?? []).map((tab, ti) => (
                            <span key={ti} style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, padding: '2px 8px', borderRadius: 100, background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
                              {tab}
                            </span>
                          ))}
                          {sess.tabsViewed.length === 0 && <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>None recorded</span>}
                        </div>
                        {sessEvents.length > 0 && (
                          <>
                            <div className="admin-section-item-meta" style={{ marginBottom: 6 }}>Events ({sessEvents.length}):</div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                              {sessEvents.map(ev => {
                                const icon = EVENT_ICONS[ev.eventType] ?? '•';
                                const m = ev.meta && typeof ev.meta === 'object' ? ev.meta as Record<string, unknown> : {};
                                const tab = m.tab as string | undefined;
                                return (
                                  <div key={ev.id} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', fontSize: 12 }}>
                                    <span style={{ flexShrink: 0 }}>{icon}</span>
                                    <span style={{ color: 'var(--text)', fontWeight: 500 }}>
                                      {ev.eventType.replace(/_/g, ' ')}
                                      {tab && <span style={{ fontWeight: 400, color: 'var(--text-secondary)', marginLeft: 4 }}>→ {tab}</span>}
                                    </span>
                                    <span style={{ marginLeft: 'auto', fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: 'var(--text-muted)', flexShrink: 0 }}>
                                      {timeAgo(ev.createdAt)}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })()}
                </div>
              ))
            )}
          </div>
          {/* Comments */}
          {comments.length > 0 && (
            <div className="admin-card">
              <div className="admin-card-title">Comments ({comments.length})</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {comments.map(c => (
                  <div key={c.id} style={{ background: 'var(--bg-elevated)', borderRadius: 10, padding: '12px 16px', border: '1px solid var(--border)' }}>
                    <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text)', marginBottom: 4 }}>{c.author}</div>
                    <div style={{ fontSize: 14, color: 'var(--text)', marginBottom: 6 }}>{c.text}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                      in {c.context} · {timeAgo(c.createdAt)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── CONTRACT ─── */}
      {activeTab === 'contract' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {contractLoading ? (
            <div className="admin-empty">Loading contract…</div>
          ) : (
            <>
              {/* Status bar */}
              <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                <div style={{ padding: '4px 12px', borderRadius: 100, fontSize: 12, fontWeight: 700, background: contract?.status === 'signed' ? 'rgba(6,214,160,0.15)' : contract?.status === 'sent' ? 'rgba(251,191,36,0.15)' : 'var(--bg-elevated)', color: contract?.status === 'signed' ? '#06D6A0' : contract?.status === 'sent' ? '#F59E0B' : 'var(--text-secondary)', border: '1px solid', borderColor: contract?.status === 'signed' ? '#06D6A0' : contract?.status === 'sent' ? '#F59E0B' : 'var(--border)' }}>
                  {contract?.status === 'signed' ? '✓ Signed' : contract?.status === 'sent' ? '📤 Sent to Client' : '📝 Draft'}
                </div>
                {contract?.sentAt && (
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Sent {timeAgo(contract.sentAt)}</div>
                )}
                {contract?.status === 'signed' && contract.signedAt && (
                  <div style={{ fontSize: 11, color: '#06D6A0' }}>Signed by <strong>{contract.clientSignature}</strong> on {new Date(contract.signedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
                )}
              </div>

              {/* Editor */}
              <div className="admin-card">
                <div className="admin-card-title">
                  Contract Content
                  <div style={{ display: 'flex', gap: 8 }}>
                    {contractSaved && <span style={{ fontSize: 12, color: '#06D6A0' }}>✓ Saved</span>}
                    <button className="admin-btn admin-btn-ghost admin-btn-icon" style={{ fontSize: 12 }} onClick={saveContract} disabled={contractSaving || contract?.status === 'signed'}>
                      {contractSaving ? 'Saving…' : 'Save Draft'}
                    </button>
                    {contract?.status === 'draft' && (
                      <button className="admin-btn admin-btn-primary admin-btn-icon" style={{ fontSize: 12 }} onClick={sendContract} disabled={contractSending || !contractContent.trim()}>
                        {contractSending ? 'Sending…' : '📤 Send to Client'}
                      </button>
                    )}
                    {contract?.status === 'sent' && (
                      <button className="admin-btn admin-btn-ghost admin-btn-icon" style={{ fontSize: 12 }} onClick={sendContract} disabled={contractSending}>
                        {contractSending ? '…' : '↺ Resend'}
                      </button>
                    )}
                  </div>
                </div>
                {contract?.status === 'signed' ? (
                  <div style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit', fontSize: 14, color: 'var(--text)', lineHeight: 1.7, opacity: 0.8 }}>
                    {contractContent}
                  </div>
                ) : (
                  <textarea
                    className="admin-textarea"
                    value={contractContent}
                    onChange={e => setContractContent(e.target.value)}
                    rows={30}
                    placeholder="Write your contract here using Markdown formatting…"
                    style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 13, lineHeight: 1.6 }}
                  />
                )}
              </div>

              {/* Signature block (if signed) */}
              {contract?.status === 'signed' && (
                <div className="admin-card" style={{ borderColor: '#06D6A0' }}>
                  <div className="admin-card-title" style={{ color: '#06D6A0' }}>✓ Contract Signed</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <div style={{ fontSize: 14, color: 'var(--text)' }}><strong>Client Signature:</strong> {contract.clientSignature}</div>
                    <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Signed on {contract.signedAt ? new Date(contract.signedAt).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}</div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ─── SETTINGS ─── */}
      {activeTab === 'settings' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div className="admin-card">
            <div className="admin-card-title">Tab Config</div>
            <div className="admin-field">
              <label className="admin-label">tabConfig (JSON)</label>
              <textarea
                className="admin-textarea"
                value={tabConfigText}
                onChange={e => setTabConfigText(e.target.value)}
                rows={10}
                style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12 }}
              />
              <div className="admin-slug-hint">Controls which tabs are visible in the client portal.</div>
            </div>
          </div>

          <div className="admin-card">
            <div className="admin-card-title">Admin Settings</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label className="admin-toggle">
                  <input
                    type="checkbox"
                    checked={proposalVisible}
                    onChange={e => setProposalVisible(e.target.checked)}
                  />
                  <span className="admin-toggle-slider" />
                  Proposal visible to client
                </label>
              </div>
              <div className="admin-field">
                <label className="admin-label">Admin Notes</label>
                <textarea
                  className="admin-textarea"
                  rows={4}
                  placeholder="Private notes about this project…"
                  value={adminNotes}
                  onChange={e => setAdminNotes(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div>
            <button
              className="admin-btn admin-btn-primary"
              onClick={saveSettings}
              disabled={settingsSaving}
              style={{ padding: '12px 28px', fontSize: 14 }}
            >
              {settingsSaving ? 'Saving…' : 'Save Settings'}
            </button>
          </div>
        </div>
      )}

      {/* ─── SHARE MODAL ─── */}
      {showShareModal && (
        <div
          className="share-overlay"
          onClick={() => setShowShareModal(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
        >
          <div
            className="share-modal"
            onClick={e => e.stopPropagation()}
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, width: '100%', maxWidth: 500, overflow: 'hidden' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px', borderBottom: '1px solid var(--border)' }}>
              <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--text)' }}>📤 Share Portal</div>
              <button
                onClick={() => setShowShareModal(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: 18, cursor: 'pointer', padding: 4 }}
              >
                ✕
              </button>
            </div>

            <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label className="admin-label" style={{ marginBottom: 6, display: 'block' }}>Portal Link</label>
                <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: 'var(--text-secondary)', padding: '8px 12px', background: 'var(--bg-elevated)', borderRadius: 8, border: '1px solid var(--border)' }}>
                  rachnabuilds.com/portal/{project.client.slug}
                </div>
              </div>

              <div>
                <label className="admin-label" style={{ marginBottom: 6, display: 'block' }}>Password</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    className="admin-input"
                    type="text"
                    placeholder="e.g. client2026"
                    value={sharePassword}
                    onChange={e => updateSharePassword(e.target.value, project.client.slug)}
                    style={{ flex: 1 }}
                  />
                  <button
                    className="admin-btn admin-btn-ghost admin-btn-icon"
                    onClick={copyPassword}
                    disabled={!sharePassword}
                    style={{ fontSize: 14, flexShrink: 0 }}
                    title="Copy password"
                  >
                    {pwCopied ? '✓' : '📋'}
                  </button>
                </div>
              </div>

              <div>
                <label className="admin-label" style={{ marginBottom: 6, display: 'block' }}>Message Preview</label>
                <pre style={{ fontSize: 12, color: 'var(--text-secondary)', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 8, padding: '12px 14px', whiteSpace: 'pre-wrap', wordBreak: 'break-word', margin: 0, lineHeight: 1.6 }}>
                  {shareMessage(project)}
                </pre>
              </div>
            </div>

            <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border)', display: 'flex', gap: 10 }}>
              <button className="admin-btn admin-btn-primary" style={{ flex: 1, fontSize: 13 }} onClick={copyShareMessage}>
                {msgCopied ? '✓ Copied!' : '📋 Copy Message'}
              </button>
              <button className="admin-btn admin-btn-ghost" style={{ flex: 1, fontSize: 13 }} onClick={openWhatsApp}>
                💬 WhatsApp
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
