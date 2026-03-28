'use client';

import { useState, useEffect, useCallback } from 'react';

type Settings = Record<string, string>;

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

  const fetchSettings = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/settings');
      if (!res.ok) throw new Error('Failed to fetch');
      const data: Settings = await res.json();
      setSettings(data);
    } catch {
      setLoadError('Failed to load settings');
    } finally {
      setLoading(false);
    }
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
        hero_headline: get('hero_headline'),
        hero_subtext: get('hero_subtext'),
      },
      setHeroSaving,
      setHeroStatus
    );
  };

  const handleSaveServices = () => {
    saveBulk({ services: get('services') }, setServicesSaving, setServicesStatus);
  };

  const handleSaveProcess = () => {
    saveBulk({ process_steps: get('process_steps') }, setProcessSaving, setProcessStatus);
  };

  const handleSaveMarquee = () => {
    saveBulk({ marquee_tags: get('marquee_tags') }, setMarqueeSaving, setMarqueeStatus);
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

      {/* ── GENERAL ── */}
      <div className="admin-card" style={{ marginBottom: 20 }}>
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

      {/* ── STATS ── */}
      <div className="admin-card" style={{ marginBottom: 20 }}>
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

      {/* ── HERO ── */}
      <div className="admin-card" style={{ marginBottom: 20 }}>
        <div className="admin-card-title" style={{ marginBottom: 20 }}>Hero Section</div>

        <div className="admin-field">
          <label className="admin-label" htmlFor="heroHeadline">Hero Headline</label>
          <input
            id="heroHeadline"
            type="text"
            className="admin-input"
            placeholder="I Build Shopify Stores That..."
            value={get('hero_headline')}
            onChange={e => set('hero_headline', e.target.value)}
          />
        </div>

        <div className="admin-field">
          <label className="admin-label" htmlFor="heroSubtext">Hero Typewriter / Subtext</label>
          <textarea
            id="heroSubtext"
            className="admin-textarea"
            placeholder="The description text shown below the headline..."
            value={get('hero_subtext')}
            onChange={e => set('hero_subtext', e.target.value)}
            style={{ minHeight: 100 }}
          />
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

      {/* ── SERVICES ── */}
      <div className="admin-card" style={{ marginBottom: 20 }}>
        <div className="admin-card-title" style={{ marginBottom: 8 }}>Services</div>
        <div className="admin-slug-hint" style={{ marginBottom: 16 }}>
          JSON array. Each item: <code>{`{ "iconKey", "title", "description", "tags": [], "featured": true/false }`}</code><br />
          iconKeys: <code>shopify</code>, <code>wordpress</code>, <code>webflow</code>, <code>speed</code>, <code>email</code>, <code>ai</code>
        </div>

        <div className="admin-field">
          <label className="admin-label" htmlFor="servicesJson">Services (JSON array)</label>
          <textarea
            id="servicesJson"
            className="admin-textarea"
            value={get('services')}
            onChange={e => set('services', e.target.value)}
            style={{ minHeight: 260, fontFamily: 'monospace', fontSize: 12 }}
          />
        </div>

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

      {/* ── PROCESS STEPS ── */}
      <div className="admin-card" style={{ marginBottom: 20 }}>
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

      {/* ── MARQUEE TAGS ── */}
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
    </div>
  );
}
