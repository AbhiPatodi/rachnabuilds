'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import ContractBuilder from './ContractBuilder';

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
  { value: 'client_required', label: 'Required from Client' },
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

const PLATFORMS = [
  { value: 'shopify',     label: 'Shopify' },
  { value: 'wordpress',   label: 'WordPress' },
  { value: 'woocommerce', label: 'WooCommerce' },
  { value: 'webflow',     label: 'Webflow' },
  { value: 'custom',      label: 'Custom / Other' },
];

const EVENT_ICONS: Record<string, string> = {
  tab_view: '👁',
  doc_open: '📄',
  comment_add: '💬',
  file_submit: '📤',
  login: '🔑',
};

type Tab = 'overview' | 'milestones' | 'sections' | 'documents' | 'sessions' | 'contract' | 'settings' | 'messages';

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
  approvedAt?: string | null;
  approvedBy?: string | null;
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

interface ProjectMessage {
  id: string;
  projectId: string;
  senderType: string;
  text: string;
  readByAdmin: boolean;
  readByClient: boolean;
  createdAt: string;
  attachmentUrl?: string | null;
  attachmentName?: string | null;
}

interface Milestone {
  id: string;
  title: string;
  description: string | null;
  status: string;
  dueDate: string | null;
  order: number;
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
  platform?: string | null;
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
    clientProfile?: Record<string, unknown> | null;
  };
  sections: Section[];
  documents: Document[];
  analytics?: {
    commentCount: number;
    eventCounts: { eventType: string; _count: { eventType: number } }[];
  };
  milestones?: Milestone[];
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
  const [platform, setPlatform] = useState<string>('');
  const [platformSaving, setPlatformSaving] = useState(false);
  const [applyingTemplate, setApplyingTemplate] = useState(false);
  const [templateMsg, setTemplateMsg] = useState('');

  // Contract
  type ContractData = { id: string; phase: number; phaseLabel: string | null; content: string; status: string; clientSignature?: string | null; signedAt?: string | null; sentAt?: string | null; advancePaid?: boolean; balancePaid?: boolean };
  const [contracts, setContracts] = useState<ContractData[]>([]);
  const [contractsLoaded, setContractsLoaded] = useState(false);
  const [contractLoading, setContractLoading] = useState(false);
  const [paymentSaving, setPaymentSaving] = useState<string | null>(null);

  // Messages
  const [messages, setMessages] = useState<ProjectMessage[]>([]);
  const [messagesLoaded, setMessagesLoaded] = useState(false);
  const [newMsg, setNewMsg] = useState('');
  const [msgSending, setMsgSending] = useState(false);
  const [msgUnreadCount, setMsgUnreadCount] = useState(0);
  const [msgAttachFile, setMsgAttachFile] = useState<File | null>(null);
  const [msgAttachError, setMsgAttachError] = useState('');
  const msgFileInputRef = useRef<HTMLInputElement>(null);

  // Milestones
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [milestonesLoaded, setMilestonesLoaded] = useState(false);
  const [showMilestoneForm, setShowMilestoneForm] = useState(false);
  const [msTitle, setMsTitle] = useState('');
  const [msDesc, setMsDesc] = useState('');
  const [msStatus, setMsStatus] = useState('pending');
  const [msDueDate, setMsDueDate] = useState('');
  const [msLoading, setMsLoading] = useState(false);
  const [editingMilestoneId, setEditingMilestoneId] = useState<string | null>(null);
  const [editMsTitle, setEditMsTitle] = useState('');
  const [editMsDesc, setEditMsDesc] = useState('');
  const [editMsStatus, setEditMsStatus] = useState('pending');
  const [editMsDueDate, setEditMsDueDate] = useState('');
  const [editMsLoading, setEditMsLoading] = useState(false);

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
      setPlatform(data.platform ?? '');
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
    if (activeTab !== 'contract' || contractsLoaded) return;
    setContractLoading(true);
    fetch(`/api/admin/projects/${projectId}/contract`)
      .then(r => r.json())
      .then(d => {
        setContracts(d.contracts ?? []);
        setContractsLoaded(true);
      })
      .catch(() => {})
      .finally(() => setContractLoading(false));
  }, [activeTab, projectId, contractsLoaded]);

  // Load messages when tab is opened
  useEffect(() => {
    if (activeTab !== 'messages' || messagesLoaded) return;
    fetch(`/api/admin/projects/${projectId}/messages`)
      .then(r => r.ok ? r.json() : [])
      .then((data: ProjectMessage[]) => {
        setMessages(data);
        setMsgUnreadCount(0); // cleared by the GET (marked as read)
        setMessagesLoaded(true);
      })
      .catch(() => setMessagesLoaded(true));
  }, [activeTab, projectId, messagesLoaded]);

  // Track unread count when on other tabs (initial load only)
  useEffect(() => {
    if (activeTab === 'messages') return;
    fetch(`/api/admin/projects/${projectId}/messages`)
      .then(r => r.ok ? r.json() : [])
      .then((data: ProjectMessage[]) => {
        const unread = data.filter((m: ProjectMessage) => m.senderType === 'client' && !m.readByAdmin).length;
        setMsgUnreadCount(unread);
      })
      .catch(() => {});
  // Only run once on mount
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load milestones when tab is opened
  useEffect(() => {
    if (activeTab !== 'milestones' || milestonesLoaded) return;
    fetch(`/api/admin/projects/${projectId}/milestones`)
      .then(r => r.ok ? r.json() : { milestones: [] })
      .then(d => setMilestones(d.milestones ?? []))
      .catch(() => {})
      .finally(() => setMilestonesLoaded(true));
  }, [activeTab, projectId, milestonesLoaded]);

  // ─── Share modal helpers ───────────────────────────────────────────────────
  const openShareModal = (p: Project) => {
    const storedPw = (typeof localStorage !== 'undefined' ? localStorage.getItem(`share_pw_${p.client.slug}`) : '') || '';
    const profilePw = (p.client.clientProfile?.portalPassword as string) || '';
    setSharePassword(storedPw || profilePw);
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

  // ─── Milestones ────────────────────────────────────────────────────────────
  const handleAddMilestone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!msTitle.trim()) return;
    setMsLoading(true);
    try {
      const res = await fetch(`/api/admin/projects/${projectId}/milestones`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: msTitle.trim(), description: msDesc.trim() || null, status: msStatus, dueDate: msDueDate || null, order: milestones.length }),
      });
      if (res.ok) {
        const m = await res.json();
        setMilestones(prev => [...prev, m]);
        setMsTitle(''); setMsDesc(''); setMsStatus('pending'); setMsDueDate('');
        setShowMilestoneForm(false);
      }
    } finally { setMsLoading(false); }
  };

  const startEditMilestone = (m: Milestone) => {
    setEditingMilestoneId(m.id);
    setEditMsTitle(m.title);
    setEditMsDesc(m.description ?? '');
    setEditMsStatus(m.status);
    setEditMsDueDate(m.dueDate ?? '');
  };

  const cancelEditMilestone = () => setEditingMilestoneId(null);

  const handleSaveMilestone = async (id: string) => {
    setEditMsLoading(true);
    try {
      const res = await fetch(`/api/admin/projects/${projectId}/milestones/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: editMsTitle.trim(), description: editMsDesc.trim() || null, status: editMsStatus, dueDate: editMsDueDate || null }),
      });
      if (res.ok) {
        const updated = await res.json();
        setMilestones(prev => prev.map(m => m.id === id ? updated : m));
        setEditingMilestoneId(null);
      }
    } finally { setEditMsLoading(false); }
  };

  const handleDeleteMilestone = async (id: string) => {
    if (!confirm('Delete this milestone?')) return;
    await fetch(`/api/admin/projects/${projectId}/milestones/${id}`, { method: 'DELETE' });
    setMilestones(prev => prev.filter(m => m.id !== id));
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

  const savePlatform = async () => {
    setPlatformSaving(true);
    try {
      await fetch(`/api/admin/projects/${projectId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platform: platform || null }),
      });
      fetchProject();
    } catch { /* silent */ } finally {
      setPlatformSaving(false);
    }
  };

  const applyTemplate = async () => {
    setApplyingTemplate(true);
    setTemplateMsg('');
    try {
      const res = await fetch(`/api/admin/projects/${projectId}/apply-template`, { method: 'POST' });
      const d = await res.json();
      setTemplateMsg(d.message ?? 'Done');
      if (d.added > 0) fetchProject();
    } catch {
      setTemplateMsg('Failed to apply template');
    } finally {
      setApplyingTemplate(false);
    }
  };

  // ─── Guards ───────────────────────────────────────────────────────────────
  if (loading) return <div className="admin-content"><div className="admin-empty">Loading…</div></div>;
  if (error || !project) return <div className="admin-content"><div className="admin-alert admin-alert-error">{error || 'Not found'}</div></div>;

  const portalUrl = `rachnabuilds.com/portal/${project.client.slug}`;

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
        {(['overview', 'milestones', 'sections', 'documents', 'sessions', 'contract', 'settings', 'messages'] as Tab[]).map(tab => (
          <button
            key={tab}
            className={`settings-tab${activeTab === tab ? ' active' : ''}`}
            onClick={() => setActiveTab(tab)}
            style={{ textTransform: 'capitalize', position: 'relative' }}
          >
            {tab}
            {tab === 'milestones' && ` (${milestones.length})`}
            {tab === 'sections' && ` (${project.sections.length})`}
            {tab === 'documents' && ` (${project.documents.length})`}
            {tab === 'messages' && msgUnreadCount > 0 && (
              <span style={{ marginLeft: 6, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minWidth: 18, height: 18, borderRadius: 100, background: '#06D6A0', color: '#0B0F1A', fontSize: 10, fontWeight: 700, padding: '0 4px' }}>
                {msgUnreadCount}
              </span>
            )}
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
                    <label className="admin-label">URL {docType !== 'client_required' && '*'}</label>
                    <input
                      className="admin-input"
                      value={docUrl}
                      onChange={e => setDocUrl(e.target.value)}
                      placeholder={docType === 'client_required' ? 'Leave empty — client will fill this in' : 'https://…'}
                      required={docType !== 'client_required'}
                    />
                    {docType === 'client_required' && (
                      <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                        Client will see this in their portal and submit the file/link.
                      </p>
                    )}
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
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                            <div className="admin-section-item-title">{doc.title}</div>
                            {doc.approvedAt && doc.approvedBy && (
                              <span
                                title={`Reviewed by ${doc.approvedBy} on ${new Date(doc.approvedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`}
                                style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600, color: '#06D6A0', background: 'rgba(6,214,160,0.1)', border: '1px solid rgba(6,214,160,0.25)', borderRadius: 100, padding: '2px 8px', whiteSpace: 'nowrap' }}
                              >
                                <svg width="10" height="10" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
                                Reviewed · {doc.approvedBy}
                              </span>
                            )}
                          </div>
                          <div className="admin-section-item-meta">
                            {DOC_TYPES.find(t => t.value === doc.docType)?.label ?? doc.docType}
                            {doc.notes ? ` · ${doc.notes}` : ''}
                          </div>
                          {doc.url && !doc.url.startsWith('text://') ? (
                            <a href={doc.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: 'var(--accent)', textDecoration: 'none', marginTop: 2 }}>
                              {doc.url.length > 60 ? `${doc.url.slice(0, 60)}…` : doc.url}
                            </a>
                          ) : doc.url.startsWith('text://') ? (
                            <span style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2, fontStyle: 'italic' }}>Text response — see note above</span>
                          ) : null}
                        </div>
                        <div className="admin-section-item-actions">
                          {doc.url && !doc.url.startsWith('text://') && (
                            <a href={doc.url} target="_blank" rel="noopener noreferrer" className="admin-btn admin-btn-ghost admin-btn-icon" style={{ fontSize: 12 }}>
                              Open ↗
                            </a>
                          )}
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
                    const sessEvents = events.filter(ev => ev.sessionId === sess.sessionId);
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
                                const dur = m.prevTabDuration as number | undefined;
                                const scroll = m.scrollDepth as number | undefined;
                                return (
                                  <div key={ev.id} style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 12, flexWrap: 'wrap' }}>
                                    <span style={{ flexShrink: 0 }}>{icon}</span>
                                    <span style={{ color: 'var(--text)', fontWeight: 500 }}>
                                      {ev.eventType.replace(/_/g, ' ')}
                                      {tab && <span style={{ fontWeight: 400, color: 'var(--text-secondary)', marginLeft: 4 }}>→ {tab}</span>}
                                    </span>
                                    {dur != null && dur > 0 && (
                                      <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, padding: '1px 6px', borderRadius: 100, background: 'rgba(6,214,160,0.1)', color: '#06D6A0', border: '1px solid rgba(6,214,160,0.2)', flexShrink: 0 }}>
                                        {formatDuration(dur * 1000)}
                                      </span>
                                    )}
                                    {scroll != null && (
                                      <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, padding: '1px 6px', borderRadius: 100, background: 'rgba(167,139,250,0.1)', color: '#A78BFA', border: '1px solid rgba(167,139,250,0.2)', flexShrink: 0 }}>
                                        {scroll}% scroll
                                      </span>
                                    )}
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
        contractLoading ? (
          <div className="admin-empty">Loading contract…</div>
        ) : (
          <>
            <ContractBuilder
              projectId={projectId}
              clientName={project.client.name}
              projectName={project.name}
              initialContracts={contracts}
              onContractsChange={setContracts}
            />
            {contracts.length > 0 && (
              <div style={{ marginTop: 24, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: '20px 24px' }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 16 }}>Payment Tracking</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {contracts.map(c => (
                    <div key={c.phase} style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', minWidth: 80 }}>Phase {c.phase}{c.phaseLabel ? ` — ${c.phaseLabel}` : ''}</div>
                      {(['advance', 'balance'] as const).map(type => {
                        const field = type === 'advance' ? 'advancePaid' : 'balancePaid';
                        const isPaid = c[field as keyof typeof c] as boolean;
                        const savingKey = `${c.phase}-${field}`;
                        return (
                          <button
                            key={type}
                            disabled={paymentSaving === savingKey}
                            onClick={async () => {
                              setPaymentSaving(savingKey);
                              await fetch(`/api/admin/projects/${projectId}/contract?phase=${c.phase}`, {
                                method: 'PATCH',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ [field]: !isPaid }),
                              });
                              setContracts(prev => prev.map(pc => pc.phase === c.phase ? { ...pc, [field]: !isPaid } : pc));
                              setPaymentSaving(null);
                            }}
                            style={{ padding: '5px 12px', borderRadius: 8, border: `1px solid ${isPaid ? '#06D6A0' : 'var(--border)'}`, background: isPaid ? 'rgba(6,214,160,0.08)' : 'var(--bg-elevated)', color: isPaid ? '#06D6A0' : 'var(--text-muted)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                          >
                            {isPaid ? '✓' : '○'} {type === 'advance' ? 'Advance' : 'Balance'} {isPaid ? 'Paid' : 'Unpaid'}
                          </button>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )
      )}

      {/* ── Milestones Tab ─────────────────────────────────── */}
      {activeTab === 'milestones' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 className="admin-section-title" style={{ margin: 0 }}>Project Milestones</h2>
            <button className="admin-btn admin-btn-primary" style={{ fontSize: 13 }} onClick={() => setShowMilestoneForm(v => !v)}>
              {showMilestoneForm ? 'Cancel' : '+ Add Milestone'}
            </button>
          </div>

          {showMilestoneForm && (
            <form onSubmit={handleAddMilestone} style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 12, padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label className="admin-label">Title *</label>
                  <input className="admin-input" value={msTitle} onChange={e => setMsTitle(e.target.value)} placeholder="e.g. Design Phase Complete" required />
                </div>
                <div>
                  <label className="admin-label">Status</label>
                  <select className="admin-select" value={msStatus} onChange={e => setMsStatus(e.target.value)}>
                    <option value="pending">⏳ Pending</option>
                    <option value="in_progress">🔄 In Progress</option>
                    <option value="completed">✅ Completed</option>
                    <option value="blocked">🚫 Blocked</option>
                  </select>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12 }}>
                <div>
                  <label className="admin-label">Description</label>
                  <input className="admin-input" value={msDesc} onChange={e => setMsDesc(e.target.value)} placeholder="Optional details…" />
                </div>
                <div>
                  <label className="admin-label">Due Date</label>
                  <input type="date" className="admin-input" value={msDueDate} onChange={e => setMsDueDate(e.target.value)} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="submit" className="admin-btn admin-btn-primary" disabled={msLoading || !msTitle.trim()} style={{ fontSize: 13 }}>
                  {msLoading ? 'Adding…' : 'Add Milestone'}
                </button>
                <button type="button" className="admin-btn admin-btn-ghost" style={{ fontSize: 13 }} onClick={() => setShowMilestoneForm(false)}>Cancel</button>
              </div>
            </form>
          )}

          {milestones.length === 0 ? (
            <div className="admin-empty">No milestones yet. Add one to track project progress.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0, position: 'relative' }}>
              {milestones.map((m, idx) => {
                const statusColor = { pending: '#94A3B8', in_progress: '#F59E0B', completed: '#06D6A0', blocked: '#FF6B6B' }[m.status] ?? '#94A3B8';
                const statusLabel = { pending: '⏳ Pending', in_progress: '🔄 In Progress', completed: '✅ Completed', blocked: '🚫 Blocked' }[m.status] ?? m.status;
                const isEditing = editingMilestoneId === m.id;
                return (
                  <div key={m.id} style={{ display: 'flex', gap: 16, paddingBottom: 20, position: 'relative' }}>
                    {/* Timeline line */}
                    {idx < milestones.length - 1 && (
                      <div style={{ position: 'absolute', left: 11, top: 28, bottom: 0, width: 2, background: 'var(--border)' }} />
                    )}
                    {/* Status dot */}
                    <div style={{ width: 24, height: 24, borderRadius: '50%', background: statusColor, border: '3px solid var(--bg)', flexShrink: 0, marginTop: 4, zIndex: 1, boxShadow: `0 0 0 2px var(--bg)` }} />
                    {/* Content */}
                    <div style={{ flex: 1, background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 16px' }}>
                      {isEditing ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                            <div>
                              <label className="admin-label">Title</label>
                              <input className="admin-input" value={editMsTitle} onChange={e => setEditMsTitle(e.target.value)} />
                            </div>
                            <div>
                              <label className="admin-label">Status</label>
                              <select className="admin-select" value={editMsStatus} onChange={e => setEditMsStatus(e.target.value)}>
                                <option value="pending">⏳ Pending</option>
                                <option value="in_progress">🔄 In Progress</option>
                                <option value="completed">✅ Completed</option>
                                <option value="blocked">🚫 Blocked</option>
                              </select>
                            </div>
                          </div>
                          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 10 }}>
                            <div>
                              <label className="admin-label">Description</label>
                              <input className="admin-input" value={editMsDesc} onChange={e => setEditMsDesc(e.target.value)} />
                            </div>
                            <div>
                              <label className="admin-label">Due Date</label>
                              <input type="date" className="admin-input" value={editMsDueDate} onChange={e => setEditMsDueDate(e.target.value)} />
                            </div>
                          </div>
                          <div style={{ display: 'flex', gap: 8 }}>
                            <button className="admin-btn admin-btn-primary" style={{ fontSize: 12 }} onClick={() => handleSaveMilestone(m.id)} disabled={editMsLoading}>
                              {editMsLoading ? 'Saving…' : 'Save'}
                            </button>
                            <button className="admin-btn admin-btn-ghost" style={{ fontSize: 12 }} onClick={cancelEditMilestone}>Cancel</button>
                          </div>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text)', marginBottom: m.description ? 4 : 0 }}>{m.title}</div>
                            {m.description && <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 6 }}>{m.description}</div>}
                            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                              <span style={{ fontSize: 11, fontWeight: 600, color: statusColor }}>{statusLabel}</span>
                              {m.dueDate && <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>📅 Due {new Date(m.dueDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>}
                            </div>
                          </div>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button className="admin-btn admin-btn-ghost admin-btn-icon" style={{ fontSize: 12 }} onClick={() => startEditMilestone(m)}>Edit</button>
                            <button className="admin-btn admin-btn-danger admin-btn-icon" style={{ fontSize: 12 }} onClick={() => handleDeleteMilestone(m.id)}>Del</button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ─── SETTINGS ─── */}
      {activeTab === 'settings' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Platform card */}
          <div className="admin-card">
            <div className="admin-card-title">Platform</div>
            <div className="admin-slug-hint" style={{ marginBottom: 12 }}>
              Sets which tabs are shown to the client and enables document templates.
              Leave blank to show all tabs (legacy behaviour).
            </div>
            <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
              <div className="admin-field" style={{ flex: 1, marginBottom: 0 }}>
                <label className="admin-label">Platform</label>
                <select className="admin-select" value={platform} onChange={e => setPlatform(e.target.value)}>
                  <option value="">— No platform set (show all tabs) —</option>
                  {PLATFORMS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                </select>
              </div>
              <button className="admin-btn admin-btn-primary" onClick={savePlatform} disabled={platformSaving} style={{ flexShrink: 0 }}>
                {platformSaving ? 'Saving…' : 'Save Platform'}
              </button>
            </div>
            {platform && (
              <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
                <div className="admin-slug-hint" style={{ marginBottom: 8 }}>
                  Document template for <strong>{CLIENT_TYPES[project.clientType] ?? project.clientType}</strong> + <strong>{PLATFORMS.find(p => p.value === platform)?.label}</strong>
                </div>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                  <button
                    className="admin-btn admin-btn-primary"
                    onClick={applyTemplate}
                    disabled={applyingTemplate}
                  >
                    {applyingTemplate ? 'Applying…' : '✦ Apply Document Template'}
                  </button>
                  <span className="admin-slug-hint">Adds missing required docs — won&apos;t duplicate existing ones.</span>
                </div>
                {templateMsg && (
                  <div className="admin-alert admin-alert-success" style={{ marginTop: 10 }}>{templateMsg}</div>
                )}
              </div>
            )}
          </div>

          <div className="admin-card">
            <div className="admin-card-title">Tab Config Override (Advanced)</div>
            <div className="admin-field">
              <label className="admin-label">tabConfig (JSON)</label>
              <textarea
                className="admin-textarea"
                value={tabConfigText}
                onChange={e => setTabConfigText(e.target.value)}
                rows={10}
                style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12 }}
              />
              <div className="admin-slug-hint">Per-project override. Set <code>{`{"tabs":["submissions","proposal","contract"]}`}</code> to force specific tabs regardless of platform setting.</div>
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

      {/* ─── MESSAGES ─── */}
      {activeTab === 'messages' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0, height: 600 }}>
          <div className="admin-card" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div className="admin-card-title" style={{ flexShrink: 0 }}>
              Messages with {project.client.name}
            </div>

            {/* Thread */}
            <div
              style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10, padding: '4px 0 12px' }}
            >
              {!messagesLoaded && (
                <div style={{ color: 'var(--text-muted)', fontSize: 13, textAlign: 'center', padding: 24 }}>Loading…</div>
              )}
              {messagesLoaded && messages.length === 0 && (
                <div style={{ color: 'var(--text-muted)', fontSize: 13, textAlign: 'center', padding: 24 }}>No messages yet. Send the first one!</div>
              )}
              {messages.map(m => {
                const isAdmin = m.senderType === 'admin';
                return (
                  <div
                    key={m.id}
                    style={{ display: 'flex', justifyContent: isAdmin ? 'flex-end' : 'flex-start' }}
                  >
                    <div style={{ maxWidth: '72%' }}>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 3, textAlign: isAdmin ? 'right' : 'left' }}>
                        {isAdmin ? 'Admin' : project.client.name} · {new Date(m.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} {new Date(m.createdAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                      <div style={{
                        background: isAdmin ? '#06D6A0' : 'var(--bg-elevated)',
                        color: isAdmin ? '#0B0F1A' : 'var(--text)',
                        borderRadius: isAdmin ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                        padding: '10px 14px',
                        fontSize: 14,
                        lineHeight: 1.5,
                        border: isAdmin ? 'none' : '1px solid var(--border)',
                        wordBreak: 'break-word',
                      }}>
                        {m.text}
                        {m.attachmentUrl && (
                          <a
                            href={m.attachmentUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 5,
                              marginTop: m.text ? 8 : 0,
                              padding: '4px 10px',
                              borderRadius: 20,
                              background: isAdmin ? 'rgba(0,0,0,0.15)' : 'rgba(6,214,160,0.12)',
                              color: isAdmin ? '#0B0F1A' : '#06D6A0',
                              fontSize: 12,
                              fontWeight: 600,
                              textDecoration: 'none',
                              border: isAdmin ? '1px solid rgba(0,0,0,0.2)' : '1px solid rgba(6,214,160,0.3)',
                            }}
                          >
                            📎 {m.attachmentName || 'Attachment'}
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Input */}
            <div style={{ flexShrink: 0, borderTop: '1px solid var(--border)', paddingTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {/* Attachment preview */}
              {msgAttachFile && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px', background: 'rgba(6,214,160,0.1)', border: '1px solid rgba(6,214,160,0.3)', borderRadius: 20, alignSelf: 'flex-start', fontSize: 12 }}>
                  <span style={{ color: '#06D6A0', fontWeight: 600 }}>📎 {msgAttachFile.name}</span>
                  <button
                    onClick={() => { setMsgAttachFile(null); setMsgAttachError(''); if (msgFileInputRef.current) msgFileInputRef.current.value = ''; }}
                    style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 13, padding: '0 2px', lineHeight: 1 }}
                    title="Remove attachment"
                  >✕</button>
                </div>
              )}
              {msgAttachError && (
                <div style={{ fontSize: 12, color: '#FF6B6B' }}>{msgAttachError}</div>
              )}
              <div style={{ display: 'flex', gap: 8 }}>
                <textarea
                  className="admin-textarea"
                  rows={2}
                  placeholder="Type a message…"
                  value={newMsg}
                  onChange={e => setNewMsg(e.target.value)}
                  onKeyDown={async e => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      if ((!newMsg.trim() && !msgAttachFile) || msgSending) return;
                      setMsgSending(true);
                      setMsgAttachError('');
                      let attachmentUrl: string | undefined;
                      let attachmentName: string | undefined;
                      if (msgAttachFile) {
                        const fd = new FormData();
                        fd.append('file', msgAttachFile);
                        const upRes = await fetch(`/api/portal/upload?slug=${project?.client.slug}`, { method: 'POST', body: fd });
                        if (!upRes.ok) {
                          setMsgAttachError('Upload failed. Please try again.');
                          setMsgSending(false);
                          return;
                        }
                        const upData = await upRes.json() as { url: string };
                        attachmentUrl = upData.url;
                        attachmentName = msgAttachFile.name;
                      }
                      const res = await fetch(`/api/admin/projects/${projectId}/messages`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ text: newMsg.trim(), ...(attachmentUrl ? { attachmentUrl, attachmentName } : {}) }),
                      });
                      if (res.ok) {
                        const msg = await res.json() as ProjectMessage;
                        setMessages(prev => [...prev, msg]);
                        setNewMsg('');
                        setMsgAttachFile(null);
                        if (msgFileInputRef.current) msgFileInputRef.current.value = '';
                      }
                      setMsgSending(false);
                    }
                  }}
                  style={{ flex: 1, resize: 'none', fontSize: 13 }}
                />
                {/* Hidden file input */}
                <input
                  ref={msgFileInputRef}
                  type="file"
                  accept="*/*"
                  style={{ display: 'none' }}
                  onChange={e => {
                    const file = e.target.files?.[0] ?? null;
                    setMsgAttachFile(file);
                    setMsgAttachError('');
                  }}
                />
                {/* Paperclip button */}
                <button
                  className="admin-btn admin-btn-ghost admin-btn-icon"
                  title="Attach file"
                  onClick={() => msgFileInputRef.current?.click()}
                  style={{ alignSelf: 'flex-end', padding: '8px 10px', fontSize: 16 }}
                >
                  📎
                </button>
                <button
                  className="admin-btn admin-btn-primary"
                  disabled={msgSending || (!newMsg.trim() && !msgAttachFile)}
                  style={{ alignSelf: 'flex-end', padding: '8px 18px', fontSize: 13 }}
                  onClick={async () => {
                    if ((!newMsg.trim() && !msgAttachFile) || msgSending) return;
                    setMsgSending(true);
                    setMsgAttachError('');
                    let attachmentUrl: string | undefined;
                    let attachmentName: string | undefined;
                    if (msgAttachFile) {
                      const fd = new FormData();
                      fd.append('file', msgAttachFile);
                      const upRes = await fetch(`/api/portal/upload?slug=${project?.client.slug}`, { method: 'POST', body: fd });
                      if (!upRes.ok) {
                        setMsgAttachError('Upload failed. Please try again.');
                        setMsgSending(false);
                        return;
                      }
                      const upData = await upRes.json() as { url: string };
                      attachmentUrl = upData.url;
                      attachmentName = msgAttachFile.name;
                    }
                    const res = await fetch(`/api/admin/projects/${projectId}/messages`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ text: newMsg.trim(), ...(attachmentUrl ? { attachmentUrl, attachmentName } : {}) }),
                    });
                    if (res.ok) {
                      const msg = await res.json() as ProjectMessage;
                      setMessages(prev => [...prev, msg]);
                      setNewMsg('');
                      setMsgAttachFile(null);
                      if (msgFileInputRef.current) msgFileInputRef.current.value = '';
                    }
                    setMsgSending(false);
                  }}
                >
                  {msgSending ? '…' : 'Send'}
                </button>
              </div>
            </div>
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
