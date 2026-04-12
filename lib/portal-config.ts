// lib/portal-config.ts
// Single source of truth for tab visibility and document templates
// driven by clientType + platform

export type ClientType =
  | 'new_build'
  | 'existing_optimisation'
  | 'audit_only'
  | 'landing_page'
  | 'retainer'
  | 'migration';

export type Platform =
  | 'shopify'
  | 'wordpress'
  | 'woocommerce'
  | 'webflow'
  | 'custom';

export type TabId = 'submissions' | 'audit' | 'competitors' | 'proposal' | 'status' | 'review' | 'contract' | 'payments';

export interface PortalTab {
  id: TabId;
  label: string;
}

export const ALL_TABS: PortalTab[] = [
  { id: 'submissions', label: 'Your Submissions' },
  { id: 'audit',       label: 'Insights' },
  { id: 'competitors', label: 'References' },
  { id: 'proposal',   label: 'Proposal' },
  { id: 'status',     label: 'Project Status' },
  { id: 'review',     label: 'Deliverables' },
  { id: 'contract',   label: 'Contract' },
  { id: 'payments',   label: 'Payments' },
];

// Tab visibility matrix — keyed by clientType
// platform=null means legacy project → show ALL tabs (backward compat)
const TAB_MATRIX: Record<ClientType, TabId[]> = {
  new_build:              ['submissions', 'proposal', 'status', 'review', 'contract', 'payments'],
  existing_optimisation:  ['submissions', 'audit', 'competitors', 'proposal', 'status', 'review', 'contract', 'payments'],
  audit_only:             ['submissions', 'audit', 'competitors'],
  landing_page:           ['submissions', 'proposal', 'status', 'review', 'contract', 'payments'],
  retainer:               ['submissions', 'status', 'review', 'contract', 'payments'],
  migration:              ['submissions', 'proposal', 'status', 'review', 'contract', 'payments'],
};

/**
 * Returns the ordered list of visible tabs for a project.
 * - platform === null  →  ALL tabs (backward compat for existing clients)
 * - tabConfig override →  use that instead of matrix
 */
export function getVisibleTabs(
  clientType: string,
  platform: string | null,
  tabConfig?: unknown,
): PortalTab[] {
  // Per-project admin override
  if (tabConfig && typeof tabConfig === 'object') {
    const cfg = tabConfig as Record<string, unknown>;
    if (Array.isArray(cfg.tabs)) {
      const ids = cfg.tabs as TabId[];
      return ALL_TABS.filter(t => ids.includes(t.id));
    }
  }

  // Null platform = legacy project → show everything
  if (!platform) return ALL_TABS;

  const type = clientType as ClientType;
  const ids = TAB_MATRIX[type] ?? ALL_TABS.map(t => t.id);
  return ALL_TABS.filter(t => ids.includes(t.id));
}

// ─── Document Templates ────────────────────────────────────────────────────

export interface DocTemplate {
  title: string;
  notes: string;
}

const BRAND_CORE: DocTemplate[] = [
  { title: 'Logo Files',              notes: 'SVG or high-resolution PNG with transparent background' },
  { title: 'Brand Colours',           notes: 'Exact hex colour codes for your brand palette' },
  { title: 'Brand Fonts',             notes: 'Font names or files if you have a specific typeface in mind' },
];

const SHOPIFY_NEW_BUILD: DocTemplate[] = [
  ...BRAND_CORE,
  { title: 'Product Photography',     notes: 'All product images — minimum 3 per product (white or lifestyle background)' },
  { title: 'Brand Story / About Text',notes: 'A short paragraph about your brand, who you are, and what you make' },
  { title: 'Collection Names',        notes: 'List of all collections you want on the site (e.g., Summer 2026, Bridal Edit)' },
  { title: 'Shipping & Returns Policy',notes: 'Your policy text — we will format and upload it' },
  { title: 'Instagram Handle',        notes: 'So we can embed your feed on the homepage' },
];

const WORDPRESS_NEW_BUILD: DocTemplate[] = [
  ...BRAND_CORE,
  { title: 'Product / Service Images',notes: 'High-resolution photos for each product or service' },
  { title: 'Page Content & Copy',     notes: 'All text for Home, About, Services, and Contact pages' },
  { title: 'Brand Story / About Text',notes: 'A short paragraph about your brand or business' },
  { title: 'Hosting Credentials',     notes: 'cPanel / hosting login, or let us know if you need new hosting arranged' },
  { title: 'Domain Registrar Access', notes: 'Access to GoDaddy / Namecheap / Google Domains to point DNS' },
];

const WOOCOMMERCE_NEW_BUILD: DocTemplate[] = [
  ...BRAND_CORE,
  { title: 'Product Photography',     notes: 'All product images — minimum 3 per product' },
  { title: 'Product Data',            notes: 'Product names, descriptions, prices, SKUs — CSV or spreadsheet preferred' },
  { title: 'Shipping & Returns Policy',notes: 'Your policy text — we will format and upload it' },
  { title: 'Page Content & Copy',     notes: 'All text for Home, About, and other key pages' },
  { title: 'Hosting Credentials',     notes: 'cPanel / hosting login or hosting preference' },
  { title: 'Domain Registrar Access', notes: 'Access to point DNS to the new hosting' },
];

const WEBFLOW_NEW_BUILD: DocTemplate[] = [
  ...BRAND_CORE,
  { title: 'Page Content & Copy',     notes: 'All text content per page — headlines, body, CTAs' },
  { title: 'Section / Hero Images',   notes: 'High-resolution images for hero and section backgrounds' },
  { title: 'CMS Structure Brief',     notes: 'If you need a blog or dynamic content — describe the fields and categories' },
  { title: 'Animation Preferences',   notes: 'Any references for scroll effects or interactions you like' },
];

const OPTIMISATION_ANY: DocTemplate[] = [
  { title: 'Site Admin Access',       notes: 'Shopify collaborator invite / WordPress admin / Webflow editor access' },
  { title: 'Google Analytics Access', notes: 'Share view access to your GA4 property with rachnajain2103@gmail.com' },
  { title: 'Pain Points & Goals Brief',notes: 'What is not working? What do you want to improve? Any targets?' },
];

const AUDIT_ANY: DocTemplate[] = [
  { title: 'Site Access',             notes: 'Read-only collaborator / WordPress admin / staging URL — we will not make changes' },
  { title: 'Google Analytics Access', notes: 'Share view access to your GA4 property with rachnajain2103@gmail.com' },
  { title: 'Pain Points Brief',       notes: 'What is not working? What are your main concerns?' },
];

const LANDING_PAGE_BASE: DocTemplate[] = [
  ...BRAND_CORE,
  { title: 'Page Copy / Content',     notes: 'All text for the landing page — headlines, body copy, CTAs' },
  { title: 'Hero & Section Images',   notes: 'High-resolution photos for the page — minimum 3 images' },
];

const MIGRATION_BASE: DocTemplate[] = [
  ...BRAND_CORE,
  { title: 'Old Platform Admin Access',notes: 'Admin login to your current site — we will export data and assets' },
  { title: 'Product Data Export',     notes: 'CSV export of products if available from your current platform' },
];

const RETAINER_ANY: DocTemplate[] = [
  { title: 'Site Admin Access',       notes: 'Shopify collaborator / WordPress admin for ongoing access' },
  { title: 'Monthly Brief / Goals',   notes: 'What do you want to achieve this month? Share priorities and any new assets' },
];

/**
 * Returns the document template for a given clientType + platform.
 * Returns [] if no template defined (admin can still add manually).
 */
export function getDocumentTemplate(
  clientType: string,
  platform: string | null | undefined,
): DocTemplate[] {
  const p = platform ?? '';

  switch (clientType as ClientType) {
    case 'new_build':
      if (p === 'shopify')                    return SHOPIFY_NEW_BUILD;
      if (p === 'wordpress')                  return WORDPRESS_NEW_BUILD;
      if (p === 'woocommerce')                return WOOCOMMERCE_NEW_BUILD;
      if (p === 'webflow')                    return WEBFLOW_NEW_BUILD;
      return SHOPIFY_NEW_BUILD; // default fallback

    case 'existing_optimisation':             return OPTIMISATION_ANY;
    case 'audit_only':                        return AUDIT_ANY;

    case 'landing_page':
      if (p === 'wordpress' || p === 'woocommerce') {
        return [
          ...LANDING_PAGE_BASE,
          { title: 'Hosting Credentials', notes: 'cPanel or hosting login for deployment' },
        ];
      }
      return LANDING_PAGE_BASE;

    case 'migration':
      return MIGRATION_BASE;

    case 'retainer':
      return RETAINER_ANY;

    default:
      return [];
  }
}

// ─── Section Templates ─────────────────────────────────────────────────────

export interface SectionTemplate {
  sectionType: string;
  title: string;
  displayOrder: number;
}

const NEW_BUILD_SECTIONS: SectionTemplate[] = [
  { sectionType: 'proposal',       title: 'Project Proposal',      displayOrder: 0 },
  { sectionType: 'project_status', title: 'Project Status',        displayOrder: 1 },
];

const OPTIMISATION_SECTIONS: SectionTemplate[] = [
  { sectionType: 'executive_summary',  title: 'Executive Summary',      displayOrder: 0 },
  { sectionType: 'performance_audit',  title: 'Performance Audit',      displayOrder: 1 },
  { sectionType: 'seo_audit',          title: 'SEO Audit',              displayOrder: 2 },
  { sectionType: 'cro_audit',          title: 'CRO Audit',              displayOrder: 3 },
  { sectionType: 'competitor_analysis',title: 'Competitor Analysis',    displayOrder: 4 },
  { sectionType: 'action_plan',        title: 'Action Plan',            displayOrder: 5 },
  { sectionType: 'proposal',           title: 'Project Proposal',       displayOrder: 6 },
  { sectionType: 'project_status',     title: 'Project Status',         displayOrder: 7 },
];

const AUDIT_SECTIONS: SectionTemplate[] = [
  { sectionType: 'executive_summary',  title: 'Executive Summary',      displayOrder: 0 },
  { sectionType: 'performance_audit',  title: 'Performance Audit',      displayOrder: 1 },
  { sectionType: 'seo_audit',          title: 'SEO Audit',              displayOrder: 2 },
  { sectionType: 'cro_audit',          title: 'CRO Audit',              displayOrder: 3 },
  { sectionType: 'competitor_analysis',title: 'Competitor Analysis',    displayOrder: 4 },
];

const LANDING_PAGE_SECTIONS: SectionTemplate[] = [
  { sectionType: 'proposal',       title: 'Project Proposal',      displayOrder: 0 },
  { sectionType: 'project_status', title: 'Project Status',        displayOrder: 1 },
];

const RETAINER_SECTIONS: SectionTemplate[] = [
  { sectionType: 'project_status', title: 'Project Status',        displayOrder: 0 },
];

const MIGRATION_SECTIONS: SectionTemplate[] = [
  { sectionType: 'proposal',       title: 'Project Proposal',      displayOrder: 0 },
  { sectionType: 'project_status', title: 'Project Status',        displayOrder: 1 },
];

/**
 * Returns default section templates for a given clientType.
 * These are auto-created when a project is created.
 */
export function getSectionTemplate(clientType: string): SectionTemplate[] {
  switch (clientType as ClientType) {
    case 'new_build':             return NEW_BUILD_SECTIONS;
    case 'existing_optimisation': return OPTIMISATION_SECTIONS;
    case 'audit_only':            return AUDIT_SECTIONS;
    case 'landing_page':          return LANDING_PAGE_SECTIONS;
    case 'retainer':              return RETAINER_SECTIONS;
    case 'migration':             return MIGRATION_SECTIONS;
    default:                      return NEW_BUILD_SECTIONS;
  }
}

export const CLIENT_TYPES = [
  { value: 'new_build',              label: 'New Build' },
  { value: 'existing_optimisation',  label: 'Existing Optimisation' },
  { value: 'audit_only',             label: 'Audit Only' },
  { value: 'landing_page',           label: 'Landing Page' },
  { value: 'retainer',               label: 'Retainer' },
  { value: 'migration',              label: 'Migration' },
];

export const PLATFORMS = [
  { value: 'shopify',     label: 'Shopify' },
  { value: 'wordpress',   label: 'WordPress' },
  { value: 'woocommerce', label: 'WooCommerce' },
  { value: 'webflow',     label: 'Webflow' },
  { value: 'custom',      label: 'Custom / Other' },
];
