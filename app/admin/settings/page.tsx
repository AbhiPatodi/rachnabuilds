'use client';

import { useState, useEffect, useCallback } from 'react';

type Settings = Record<string, string>;

interface PricingTier {
  tier: string;
  amount: string;
  description: string;
  features: string[];
  featured: boolean;
  popular: string;
  ctaText: string;
}

interface ServiceItem {
  iconKey: string;
  title: string;
  description: string;
  tags: string[];
  featured: boolean;
}

const SERVICE_ICON_KEYS = [
  { value: 'shopify',   label: '🛍 Shopify' },
  { value: 'wordpress', label: 'Ⓦ WordPress' },
  { value: 'webflow',   label: '◐ Webflow' },
  { value: 'speed',     label: '⚡ Speed' },
  { value: 'email',     label: '✉ Email' },
  { value: 'ai',        label: '✦ AI' },
];

type TabId = 'general' | 'stats' | 'hero' | 'services' | 'pricing' | 'process' | 'marquee';

const TABS: { id: TabId; label: string }[] = [
  { id: 'general', label: 'General' },
  { id: 'stats', label: 'Stats' },
  { id: 'hero', label: 'Hero' },
  { id: 'services', label: 'Services' },
  { id: 'pricing', label: 'Pricing' },
  { id: 'process', label: 'Process' },
  { id: 'marquee', label: 'Marquee' },
];

function Toggle({
  value,
  onChange,
}: {
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      style={{
        width: 44,
        height: 24,
        borderRadius: 12,
        border: 'none',
        background: value ? 'var(--accent)' : 'var(--border)',
        cursor: 'pointer',
        position: 'relative',
        transition: 'background 0.2s',
        flexShrink: 0,
      }}
      aria-label="Toggle"
    >
      <span
        style={{
          position: 'absolute',
          top: 2,
          left: value ? 22 : 2,
          width: 20,
          height: 20,
          borderRadius: '50%',
          background: '#fff',
          transition: 'left 0.2s',
          boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
        }}
      />
    </button>
  );
}

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<TabId>('general');
  const [settings, setSettings] = useState<Settings>({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  // Section feedback
  const [generalStatus, setGeneralStatus] = useState<{ ok?: boolean; msg: string } | null>(null);
  const [statsStatus, setStatsStatus] = useState<{ ok?: boolean; msg: string } | null>(null);
  const [heroStatus, setHeroStatus] = useState<{ ok?: boolean; msg: string } | null>(null);
  const [servicesStatus, setServicesStatus] = useState<{ ok?: boolean; msg: string } | null>(null);
  const [processStatus, setProcessStatus] = useState<{ ok?: boolean; msg: string } | null>(null);
  const [marqueeStatus, setMarqueeStatus] = useState<{ ok?: boolean; msg: string } | null>(null);
  const [generalSaving, setGeneralSaving] = useState(false);
  const [statsSaving, setStatsSaving] = useState(false);
  const [heroSaving, setHeroSaving] = useState(false);
  const [servicesSaving, setServicesSaving] = useState(false);
  const [processSaving, setProcessSaving] = useState(false);
  const [marqueeSaving, setMarqueeSaving] = useState(false);
  const [pricingStatus, setPricingStatus] = useState<{ ok?: boolean; msg: string } | null>(null);
  const [pricingSaving, setPricingSaving] = useState(false);
  const [pricingTiers, setPricingTiers] = useState<PricingTier[]>([]);
  const [services, setServicesState] = useState<ServiceItem[]>([]);

  const DEFAULT_PRICING: PricingTier[] = [
    { tier: 'Starter', amount: '$500', description: 'Clean, fast Shopify store for new brands and product launches.', features: ['Custom theme setup & configuration','Up to 3 page templates','Mobile-optimised design','Payment gateway setup','3 revision rounds','7-day post-launch support'], featured: false, popular: '', ctaText: 'Get started →' },
    { tier: 'Professional', amount: '$1,500', description: 'Full custom build for brands serious about conversion and growth.', features: ['Everything in Starter','Custom Liquid theme development','Speed optimisation (90+ PageSpeed)','Klaviyo abandoned cart setup','Analytics & Meta Pixel','14-day post-launch support'], featured: true, popular: 'Most Popular', ctaText: 'Get started →' },
    { tier: 'Enterprise', amount: '$3,000', description: 'Complex builds, migrations, and Shopify Plus solutions.', features: ['Everything in Professional','Platform migrations (WordPress / WooCommerce / Webflow)','Custom app integrations','Multi-currency & international','Shopify Plus features','Priority support & retainer options'], featured: false, popular: '', ctaText: "Let's discuss →" },
  ];

  const DEFAULT_SERVICES_LIST: ServiceItem[] = [
    { iconKey: 'shopify',   title: 'Shopify Development', description: 'Custom Liquid themes, store migrations, app integrations, and product pages engineered to convert.', tags: ['Liquid','Shopify Plus','Migrations','Apps'], featured: true },
    { iconKey: 'wordpress', title: 'WordPress & WooCommerce', description: 'Full custom WordPress builds with clean PHP, bespoke themes, and seamless WooCommerce payments.', tags: ['PHP','WooCommerce','Custom Themes'], featured: false },
    { iconKey: 'webflow',   title: 'Webflow Development', description: 'Pixel-perfect Webflow builds with CMS, animations, and lead-capture forms.', tags: ['Webflow','CMS'], featured: false },
    { iconKey: 'speed',     title: 'Speed Optimization', description: 'Core Web Vitals, LCP, CLS — measurable PageSpeed results, guaranteed.', tags: ['Core Web Vitals','Performance'], featured: false },
    { iconKey: 'email',     title: 'Email Marketing', description: 'Klaviyo and Mailchimp — welcome flows, abandoned cart, revenue-driving sequences.', tags: ['Klaviyo','Flows'], featured: false },
    { iconKey: 'ai',        title: 'AI-Enhanced Delivery', description: 'Modern AI tools mean faster builds, more iterations, higher quality.', tags: ['Claude AI','Automation'], featured: false },
  ];

  const fetchSettings = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/settings');
      if (!res.ok) throw new Error('Failed to fetch');
      const data: Settings = await res.json();
      setSettings(data);
      try {
        if (data['pricing_tiers']) setPricingTiers(JSON.parse(data['pricing_tiers']));
        else setPricingTiers(DEFAULT_PRICING);
      } catch { setPricingTiers(DEFAULT_PRICING); }
      try {
        if (data['services']) setServicesState(JSON.parse(data['services']));
        else setServicesState(DEFAULT_SERVICES_LIST);
      } catch { setServicesState(DEFAULT_SERVICES_LIST); }
    } catch {
      setLoadError('Failed to load settings');
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const get = (key: string, fallback = '') => settings[key] ?? fallback;
  const set = (key: string, value: string) => setSettings(prev => ({ ...prev, [key]: value }));

  const saveBulk = async (
    data: Record<string, string>,
    setSaving: (v: boolean) => void,
    setStatus: (s: { ok?: boolean; msg: string } | null) => void
  ) => {
    setSaving(true);
    setStatus(null);
    try {
      const res = await fetch('/api/admin/settings/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings: data }),
      });
      if (!res.ok) throw new Error('Failed to save');
      setStatus({ ok: true, msg: 'Settings saved' });
      setTimeout(() => setStatus(null), 3000);
    } catch {
      setStatus({ ok: false, msg: 'Failed to save settings' });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveGeneral = () => {
    saveBulk(
      {
        availability_status: get('availability_status', 'available'),
        whatsapp_number: get('whatsapp_number', '919404643510'),
        contact_email: get('contact_email'),
      },
      setGeneralSaving,
      setGeneralStatus
    );
  };

  const handleSaveStats = () => {
    saveBulk(
      {
        stat_stores: get('stat_stores', '50'),
        stat_delivery: get('stat_delivery', '7'),
        stat_countries: get('stat_countries', '12'),
        stat_pagespeed: get('stat_pagespeed', '90'),
      },
      setStatsSaving,
      setStatsStatus
    );
  };

  const handleSaveHero = () => {
    saveBulk(
      {
        hero_typewriter: get('hero_typewriter'),
      },
      setHeroSaving,
      setHeroStatus
    );
  };

  const handleSaveServices = () => {
    saveBulk({ services: JSON.stringify(services) }, setServicesSaving, setServicesStatus);
  };

  const updateService = (idx: number, field: keyof ServiceItem, value: string | boolean | string[]) => {
    setServicesState(prev => prev.map((s, i) => i === idx ? { ...s, [field]: value } : s));
  };
  const updateServiceTag = (svcIdx: number, tagIdx: number, value: string) => {
    setServicesState(prev => prev.map((s, i) => {
      if (i !== svcIdx) return s;
      const tags = [...s.tags];
      tags[tagIdx] = value;
      return { ...s, tags };
    }));
  };
  const addServiceTag = (svcIdx: number) => {
    setServicesState(prev => prev.map((s, i) => i === svcIdx ? { ...s, tags: [...s.tags, ''] } : s));
  };
  const removeServiceTag = (svcIdx: number, tagIdx: number) => {
    setServicesState(prev => prev.map((s, i) => i === svcIdx ? { ...s, tags: s.tags.filter((_, ti) => ti !== tagIdx) } : s));
  };
  const addService = () => {
    setServicesState(prev => [...prev, { iconKey: 'shopify', title: 'New Service', description: '', tags: [], featured: false }]);
  };
  const removeService = (idx: number) => {
    setServicesState(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSaveProcess = () => {
    saveBulk({ process_steps: get('process_steps') }, setProcessSaving, setProcessStatus);
  };

  const handleSaveMarquee = () => {
    saveBulk({ marquee_tags: get('marquee_tags') }, setMarqueeSaving, setMarqueeStatus);
  };

  const handleSavePricing = () => {
    saveBulk({ pricing_tiers: JSON.stringify(pricingTiers) }, setPricingSaving, setPricingStatus);
  };

  const updateTier = (idx: number, field: keyof PricingTier, value: string | boolean | string[]) => {
    setPricingTiers(prev => prev.map((t, i) => i === idx ? { ...t, [field]: value } : t));
  };

  const updateFeature = (tierIdx: number, featIdx: number, value: string) => {
    setPricingTiers(prev => prev.map((t, i) => {
      if (i !== tierIdx) return t;
      const features = [...t.features];
      features[featIdx] = value;
      return { ...t, features };
    }));
  };

  const addFeature = (tierIdx: number) => {
    setPricingTiers(prev => prev.map((t, i) => i === tierIdx ? { ...t, features: [...t.features, ''] } : t));
  };

  const removeFeature = (tierIdx: number, featIdx: number) => {
    setPricingTiers(prev => prev.map((t, i) => i === tierIdx ? { ...t, features: t.features.filter((_, fi) => fi !== featIdx) } : t));
  };

  const addTier = () => {
    setPricingTiers(prev => [...prev, { tier: 'New Tier', amount: '$0', description: '', features: [], featured: false, popular: '', ctaText: 'Get started →' }]);
  };

  const removeTier = (idx: number) => {
    setPricingTiers(prev => prev.filter((_, i) => i !== idx));
  };

  if (loading) {
    return (
      <div className="admin-content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 200 }}>
        <span style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Loading settings...</span>
      </div>
    );
  }

  const availability = get('availability_status', 'available');

  return (
    <div className="admin-content" style={{ maxWidth: 720 }}>
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Settings</h1>
          <p className="admin-page-subtitle">Configure your site content and availability</p>
        </div>
      </div>

      {loadError && <div className="admin-alert admin-alert-error" style={{ marginBottom: 20 }}>{loadError}</div>}

      {/* ── TAB BAR ── */}
      <div className="settings-tabs">
        {TABS.map(tab => (
          <button
            key={tab.id}
            type="button"
            className={`settings-tab${activeTab === tab.id ? ' active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── GENERAL ── */}
      {activeTab === 'general' && (
        <div className="admin-card">
          <div className="admin-card-title" style={{ marginBottom: 20 }}>General</div>

          <div className="admin-field">
            <label className="admin-label">Availability Status</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {(['available', 'busy', 'unavailable'] as const).map(status => (
                <button
                  key={status}
                  type="button"
                  onClick={() => set('availability_status', status)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: 8,
                    border: '1px solid',
                    borderColor: availability === status ? 'var(--accent)' : 'var(--border)',
                    background: availability === status ? 'var(--accent-dim)' : 'var(--bg-elevated)',
                    color: availability === status ? 'var(--accent)' : 'var(--text-secondary)',
                    cursor: 'pointer',
                    fontSize: 13,
                    fontWeight: 500,
                    transition: 'all 0.15s',
                    textTransform: 'capitalize',
                  }}
                >
                  {status === 'available' && '🟢 '}
                  {status === 'busy' && '🟡 '}
                  {status === 'unavailable' && '🔴 '}
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </button>
              ))}
            </div>
            <div className="admin-slug-hint">Shown on your website as a badge</div>
          </div>

          <div className="admin-field">
            <label className="admin-label" htmlFor="whatsapp">WhatsApp Number</label>
            <input
              id="whatsapp"
              type="text"
              className="admin-input"
              placeholder="919404643510"
              value={get('whatsapp_number', '919404643510')}
              onChange={e => set('whatsapp_number', e.target.value)}
            />
            <div className="admin-slug-hint">Include country code, no + or spaces (e.g. 919404643510)</div>
          </div>

          <div className="admin-field">
            <label className="admin-label" htmlFor="contactEmail">Contact Email</label>
            <input
              id="contactEmail"
              type="email"
              className="admin-input"
              placeholder="hello@rachnabuilds.com"
              value={get('contact_email')}
              onChange={e => set('contact_email', e.target.value)}
            />
          </div>

          {generalStatus && (
            <div className={`admin-alert ${generalStatus.ok ? 'admin-alert-success' : 'admin-alert-error'}`} style={{ marginBottom: 12 }}>
              {generalStatus.msg}
            </div>
          )}
          <button
            type="button"
            className="admin-btn admin-btn-primary"
            onClick={handleSaveGeneral}
            disabled={generalSaving}
          >
            {generalSaving ? 'Saving...' : 'Save General Settings'}
          </button>
        </div>
      )}

      {/* ── STATS ── */}
      {activeTab === 'stats' && (
        <div className="admin-card">
          <div className="admin-card-title" style={{ marginBottom: 20 }}>Stats (Homepage Counters)</div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div className="admin-field">
              <label className="admin-label" htmlFor="statStores">Stores Launched</label>
              <input
                id="statStores"
                type="number"
                className="admin-input"
                placeholder="50"
                value={get('stat_stores', '50')}
                onChange={e => set('stat_stores', e.target.value)}
              />
            </div>
            <div className="admin-field">
              <label className="admin-label" htmlFor="statDelivery">Avg. Delivery Days</label>
              <input
                id="statDelivery"
                type="number"
                className="admin-input"
                placeholder="7"
                value={get('stat_delivery', '7')}
                onChange={e => set('stat_delivery', e.target.value)}
              />
            </div>
            <div className="admin-field">
              <label className="admin-label" htmlFor="statCountries">Countries Served</label>
              <input
                id="statCountries"
                type="number"
                className="admin-input"
                placeholder="12"
                value={get('stat_countries', '12')}
                onChange={e => set('stat_countries', e.target.value)}
              />
            </div>
            <div className="admin-field">
              <label className="admin-label" htmlFor="statPagespeed">Avg. PageSpeed Score</label>
              <input
                id="statPagespeed"
                type="number"
                className="admin-input"
                placeholder="90"
                value={get('stat_pagespeed', '90')}
                onChange={e => set('stat_pagespeed', e.target.value)}
              />
            </div>
          </div>

          {statsStatus && (
            <div className={`admin-alert ${statsStatus.ok ? 'admin-alert-success' : 'admin-alert-error'}`} style={{ marginBottom: 12 }}>
              {statsStatus.msg}
            </div>
          )}
          <button
            type="button"
            className="admin-btn admin-btn-primary"
            onClick={handleSaveStats}
            disabled={statsSaving}
            style={{ marginTop: 4 }}
          >
            {statsSaving ? 'Saving...' : 'Save Stats'}
          </button>
        </div>
      )}

      {/* ── HERO ── */}
      {activeTab === 'hero' && (
        <div className="admin-card">
          <div className="admin-card-title" style={{ marginBottom: 20 }}>Hero Section</div>

          <div className="admin-field">
            <label className="admin-label">Hero Headline</label>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', padding: '10px 14px', background: 'var(--bg-elevated)', borderRadius: 8, border: '1px solid var(--border)', fontStyle: 'italic' }}>
              🔒 &quot;I build stores that actually sell.&quot; — hardcoded with animation, edit in <code>app/HomepageClient.tsx</code> line 530 if needed.
            </div>
          </div>

          <div className="admin-field">
            <label className="admin-label" htmlFor="heroSubtext">Hero Subtext</label>
            <textarea
              id="heroSubtext"
              className="admin-textarea"
              placeholder="Shopify, WordPress, WooCommerce & Webflow — 4+ years..."
              value={get('hero_typewriter')}
              onChange={e => set('hero_typewriter', e.target.value)}
              style={{ minHeight: 100 }}
            />
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
              Shown below the headline on the homepage. Saves live to the site.
            </div>
          </div>

          {heroStatus && (
            <div className={`admin-alert ${heroStatus.ok ? 'admin-alert-success' : 'admin-alert-error'}`} style={{ marginBottom: 12 }}>
              {heroStatus.msg}
            </div>
          )}
          <button
            type="button"
            className="admin-btn admin-btn-primary"
            onClick={handleSaveHero}
            disabled={heroSaving}
          >
            {heroSaving ? 'Saving...' : 'Save Hero Settings'}
          </button>
        </div>
      )}

      {/* ── SERVICES ── */}
      {activeTab === 'services' && (
        <div className="admin-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <div className="admin-card-title">Services</div>
            <button type="button" className="admin-btn admin-btn-secondary" onClick={addService} style={{ fontSize: 12 }}>
              + Add Service
            </button>
          </div>

          {services.map((svc, si) => (
            <div key={si} style={{ border: '1px solid var(--border)', borderRadius: 10, padding: 16, marginBottom: 16, background: svc.featured ? 'var(--accent-dim)' : 'var(--bg-elevated)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: 14 }}>Service {si + 1}</span>
                  {svc.featured && <span style={{ fontSize: 11, background: 'var(--accent)', color: '#0B0F1A', padding: '2px 8px', borderRadius: 20, fontWeight: 600 }}>Featured</span>}
                </div>
                <button type="button" onClick={() => removeService(si)} style={{ background: 'rgba(255,107,107,0.1)', border: '1px solid rgba(255,107,107,0.3)', color: '#FF6B6B', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontSize: 12 }}>
                  Remove
                </button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 12, marginBottom: 12 }}>
                <div className="admin-field" style={{ margin: 0 }}>
                  <label className="admin-label">Icon</label>
                  <select className="admin-select" value={svc.iconKey} onChange={e => updateService(si, 'iconKey', e.target.value)}>
                    {SERVICE_ICON_KEYS.map(k => (
                      <option key={k.value} value={k.value}>{k.label}</option>
                    ))}
                  </select>
                </div>
                <div className="admin-field" style={{ margin: 0 }}>
                  <label className="admin-label">Title</label>
                  <input type="text" className="admin-input" value={svc.title} onChange={e => updateService(si, 'title', e.target.value)} placeholder="Shopify Development" />
                </div>
              </div>

              <div className="admin-field" style={{ marginBottom: 12 }}>
                <label className="admin-label">Description</label>
                <textarea className="admin-textarea" value={svc.description} onChange={e => updateService(si, 'description', e.target.value)} placeholder="Short description of this service…" rows={3} style={{ resize: 'vertical' }} />
              </div>

              <div style={{ display: 'flex', gap: 16, marginBottom: 12 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, color: 'var(--text-secondary)' }}>
                  <Toggle value={svc.featured} onChange={v => updateService(si, 'featured', v)} />
                  Featured (highlighted card)
                </label>
              </div>

              <div>
                <label className="admin-label" style={{ marginBottom: 8, display: 'block' }}>Tags / Tech</label>
                {svc.tags.map((tag, ti) => (
                  <div key={ti} style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
                    <input
                      type="text"
                      className="admin-input"
                      value={tag}
                      onChange={e => updateServiceTag(si, ti, e.target.value)}
                      placeholder={`Tag ${ti + 1}`}
                      style={{ flex: 1 }}
                    />
                    <button type="button" onClick={() => removeServiceTag(si, ti)} style={{ background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-secondary)', borderRadius: 6, padding: '0 10px', cursor: 'pointer', fontSize: 16 }}>×</button>
                  </div>
                ))}
                <button type="button" onClick={() => addServiceTag(si)} style={{ background: 'transparent', border: '1px dashed var(--border)', color: 'var(--text-secondary)', borderRadius: 6, padding: '6px 12px', cursor: 'pointer', fontSize: 12, marginTop: 4 }}>
                  + Add tag
                </button>
              </div>
            </div>
          ))}

          {servicesStatus && (
            <div className={`admin-alert ${servicesStatus.ok ? 'admin-alert-success' : 'admin-alert-error'}`} style={{ marginBottom: 12 }}>
              {servicesStatus.msg}
            </div>
          )}
          <button
            type="button"
            className="admin-btn admin-btn-primary"
            onClick={handleSaveServices}
            disabled={servicesSaving}
          >
            {servicesSaving ? 'Saving...' : 'Save Services'}
          </button>
        </div>
      )}

      {/* ── PRICING ── */}
      {activeTab === 'pricing' && (
        <div className="admin-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <div className="admin-card-title">Pricing Tiers</div>
            <button type="button" className="admin-btn admin-btn-secondary" onClick={addTier} style={{ fontSize: 12 }}>
              + Add Tier
            </button>
          </div>

          {pricingTiers.map((tier, ti) => (
            <div key={ti} style={{ border: '1px solid var(--border)', borderRadius: 10, padding: 16, marginBottom: 16, background: tier.featured ? 'var(--accent-dim)' : 'var(--bg-elevated)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: 14 }}>Tier {ti + 1}</span>
                  {tier.featured && <span style={{ fontSize: 11, background: 'var(--accent)', color: '#0B0F1A', padding: '2px 8px', borderRadius: 20, fontWeight: 600 }}>Featured</span>}
                </div>
                <button type="button" onClick={() => removeTier(ti)} style={{ background: 'rgba(255,107,107,0.1)', border: '1px solid rgba(255,107,107,0.3)', color: '#FF6B6B', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontSize: 12 }}>
                  Remove
                </button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                <div className="admin-field" style={{ margin: 0 }}>
                  <label className="admin-label">Tier Name</label>
                  <input type="text" className="admin-input" value={tier.tier} onChange={e => updateTier(ti, 'tier', e.target.value)} placeholder="Starter" />
                </div>
                <div className="admin-field" style={{ margin: 0 }}>
                  <label className="admin-label">Amount</label>
                  <input type="text" className="admin-input" value={tier.amount} onChange={e => updateTier(ti, 'amount', e.target.value)} placeholder="$500" />
                </div>
              </div>

              <div className="admin-field" style={{ marginBottom: 12 }}>
                <label className="admin-label">Description</label>
                <input type="text" className="admin-input" value={tier.description} onChange={e => updateTier(ti, 'description', e.target.value)} placeholder="Short description of this tier..." />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                <div className="admin-field" style={{ margin: 0 }}>
                  <label className="admin-label">CTA Button Text</label>
                  <input type="text" className="admin-input" value={tier.ctaText} onChange={e => updateTier(ti, 'ctaText', e.target.value)} placeholder="Get started →" />
                </div>
                <div className="admin-field" style={{ margin: 0 }}>
                  <label className="admin-label">Popular Badge (optional)</label>
                  <input type="text" className="admin-input" value={tier.popular} onChange={e => updateTier(ti, 'popular', e.target.value)} placeholder="Most Popular" />
                </div>
              </div>

              <div style={{ display: 'flex', gap: 16, marginBottom: 12 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, color: 'var(--text-secondary)' }}>
                  <Toggle value={tier.featured} onChange={v => updateTier(ti, 'featured', v)} />
                  Featured (highlighted card)
                </label>
              </div>

              <div>
                <label className="admin-label" style={{ marginBottom: 8, display: 'block' }}>Features List</label>
                {tier.features.map((feat, fi) => (
                  <div key={fi} style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
                    <input
                      type="text"
                      className="admin-input"
                      value={feat}
                      onChange={e => updateFeature(ti, fi, e.target.value)}
                      placeholder={`Feature ${fi + 1}`}
                      style={{ flex: 1 }}
                    />
                    <button type="button" onClick={() => removeFeature(ti, fi)} style={{ background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-secondary)', borderRadius: 6, padding: '0 10px', cursor: 'pointer', fontSize: 16 }}>×</button>
                  </div>
                ))}
                <button type="button" onClick={() => addFeature(ti)} style={{ background: 'transparent', border: '1px dashed var(--border)', color: 'var(--text-secondary)', borderRadius: 6, padding: '6px 12px', cursor: 'pointer', fontSize: 12, marginTop: 4 }}>
                  + Add feature
                </button>
              </div>
            </div>
          ))}

          {pricingStatus && (
            <div className={`admin-alert ${pricingStatus.ok ? 'admin-alert-success' : 'admin-alert-error'}`} style={{ marginBottom: 12 }}>
              {pricingStatus.msg}
            </div>
          )}
          <button type="button" className="admin-btn admin-btn-primary" onClick={handleSavePricing} disabled={pricingSaving}>
            {pricingSaving ? 'Saving...' : 'Save Pricing Tiers'}
          </button>
        </div>
      )}

      {/* ── PROCESS ── */}
      {activeTab === 'process' && (
        <div className="admin-card">
          <div className="admin-card-title" style={{ marginBottom: 8 }}>Process Steps</div>
          <div className="admin-slug-hint" style={{ marginBottom: 16 }}>
            JSON array. Each item: <code>{`{ "num", "day", "title", "desc" }`}</code>
          </div>

          <div className="admin-field">
            <label className="admin-label" htmlFor="processJson">Process Steps (JSON array)</label>
            <textarea
              id="processJson"
              className="admin-textarea"
              value={get('process_steps')}
              onChange={e => set('process_steps', e.target.value)}
              style={{ minHeight: 200, fontFamily: 'monospace', fontSize: 12 }}
            />
          </div>

          {processStatus && (
            <div className={`admin-alert ${processStatus.ok ? 'admin-alert-success' : 'admin-alert-error'}`} style={{ marginBottom: 12 }}>
              {processStatus.msg}
            </div>
          )}
          <button
            type="button"
            className="admin-btn admin-btn-primary"
            onClick={handleSaveProcess}
            disabled={processSaving}
          >
            {processSaving ? 'Saving...' : 'Save Process Steps'}
          </button>
        </div>
      )}

      {/* ── MARQUEE ── */}
      {activeTab === 'marquee' && (
        <div className="admin-card">
          <div className="admin-card-title" style={{ marginBottom: 8 }}>Marquee Tags</div>
          <div className="admin-slug-hint" style={{ marginBottom: 16 }}>
            JSON array of strings — e.g. <code>{`["Shopify Expert","Custom Themes","WooCommerce"]`}</code>
          </div>

          <div className="admin-field">
            <label className="admin-label" htmlFor="marqueeJson">Marquee Tags (JSON array of strings)</label>
            <textarea
              id="marqueeJson"
              className="admin-textarea"
              value={get('marquee_tags')}
              onChange={e => set('marquee_tags', e.target.value)}
              style={{ minHeight: 80, fontFamily: 'monospace', fontSize: 12 }}
            />
          </div>

          {marqueeStatus && (
            <div className={`admin-alert ${marqueeStatus.ok ? 'admin-alert-success' : 'admin-alert-error'}`} style={{ marginBottom: 12 }}>
              {marqueeStatus.msg}
            </div>
          )}
          <button
            type="button"
            className="admin-btn admin-btn-primary"
            onClick={handleSaveMarquee}
            disabled={marqueeSaving}
          >
            {marqueeSaving ? 'Saving...' : 'Save Marquee Tags'}
          </button>
        </div>
      )}
    </div>
  );
}
