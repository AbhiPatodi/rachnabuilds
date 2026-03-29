'use client';

import { useState } from 'react';
import Link from 'next/link';
import '../tools.css';

interface CWV { lcp: string; tbt: string; cls: string; fcp: string; si: string; lcpScore: number | null; tbtScore: number | null; clsScore: number | null; }
interface Opportunity { id: string; title: string; tip: string; score: number; }
interface PSIResult { score: number; cwv: CWV; opportunities: Opportunity[]; url: string; }

function ScoreRing({ score }: { score: number }) {
  const r = 54;
  const circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;
  const color = score >= 90 ? '#06D6A0' : score >= 50 ? '#FF9500' : '#FF6B6B';
  const label = score >= 90 ? 'Fast' : score >= 50 ? 'Needs Work' : 'Slow';

  return (
    <div className="score-ring-wrap">
      <svg width="140" height="140" viewBox="0 0 140 140">
        <circle cx="70" cy="70" r={r} fill="none" stroke="var(--border)" strokeWidth="12" />
        <circle
          cx="70" cy="70" r={r} fill="none"
          stroke={color} strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          transform="rotate(-90 70 70)"
          style={{ transition: 'stroke-dashoffset 1s ease' }}
        />
      </svg>
      <div className="score-ring-inner">
        <div className="score-ring-num" style={{ color }}>{score}</div>
        <div className="score-ring-label" style={{ color }}>{label}</div>
      </div>
    </div>
  );
}

function cwvColor(score: number | null) {
  if (score === null) return 'var(--text-muted)';
  if (score >= 0.9) return '#06D6A0';
  if (score >= 0.5) return '#FF9500';
  return '#FF6B6B';
}

function cwvPass(score: number | null) {
  if (score === null) return '—';
  if (score >= 0.9) return '✓';
  if (score >= 0.5) return '△';
  return '✗';
}

export default function PageSpeedClient() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PSIResult | null>(null);
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);

  const check = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setResult(null); setExpanded(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/tools/pagespeed?url=${encodeURIComponent(url)}`);
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Failed to analyse. Please try again.'); return; }
      setResult(data);
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="tool-page">
      <div style={{ height: 72 }} />

      <div className="tool-hero">
        <div className="tool-tag">Free Tool</div>
        <h1 className="tool-h1">Shopify Speed Checker</h1>
        <p className="tool-sub">
          See your store's Google PageSpeed score and exactly what's slowing it down.<br />
          Takes about 15 seconds.
        </p>
      </div>

      {/* URL form */}
      <div className="speed-form-wrap">
        <form className="speed-form" onSubmit={check}>
          <input
            type="text"
            className="speed-url-input"
            placeholder="https://yourstore.com"
            value={url}
            onChange={e => setUrl(e.target.value)}
            required
          />
          <button type="submit" className="speed-check-btn" disabled={loading}>
            {loading ? (
              <><span className="speed-spinner" />Analysing…</>
            ) : 'Check Speed →'}
          </button>
        </form>
        {error && <p className="tool-error" style={{ textAlign: 'center', marginTop: 12 }}>{error}</p>}
      </div>

      {/* Loading state */}
      {loading && (
        <div className="speed-loading">
          <div className="speed-loading-bar"><div className="speed-loading-fill" /></div>
          <p>Running your store through Google PageSpeed…<br /><small>This takes about 15 seconds</small></p>
        </div>
      )}

      {/* Results */}
      {result && !loading && (
        <div className="speed-results">
          <p className="speed-results-url">Results for <strong>{result.url}</strong> · Mobile</p>

          <div className="speed-results-top">
            <div className="speed-score-col">
              <ScoreRing score={result.score} />
              <div className="speed-score-label">Performance Score</div>
            </div>

            <div className="speed-cwv-grid">
              {[
                { label: 'Largest Contentful Paint', val: result.cwv.lcp, score: result.cwv.lcpScore },
                { label: 'Total Blocking Time',      val: result.cwv.tbt, score: result.cwv.tbtScore },
                { label: 'Cumulative Layout Shift',  val: result.cwv.cls, score: result.cwv.clsScore },
                { label: 'First Contentful Paint',   val: result.cwv.fcp, score: null },
                { label: 'Speed Index',              val: result.cwv.si,  score: null },
              ].map(m => (
                <div key={m.label} className="cwv-card">
                  <div className="cwv-val" style={{ color: cwvColor(m.score) }}>{m.val}</div>
                  <div className="cwv-label">{m.label}</div>
                  {m.score !== null && (
                    <div className="cwv-pass" style={{ color: cwvColor(m.score) }}>{cwvPass(m.score)}</div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {result.opportunities.length > 0 && (
            <div className="speed-opps">
              <h2 className="speed-opps-title">🔧 Top {result.opportunities.length} Quick Wins</h2>
              {result.opportunities.map(op => (
                <div key={op.id} className="speed-opp" onClick={() => setExpanded(expanded === op.id ? null : op.id)}>
                  <div className="speed-opp-header">
                    <div className="speed-opp-dot" style={{ background: op.score < 0.5 ? '#FF6B6B' : '#FF9500' }} />
                    <span className="speed-opp-title">{op.title}</span>
                    <span className="speed-opp-toggle">{expanded === op.id ? '▲' : '▼'}</span>
                  </div>
                  {expanded === op.id && (
                    <div className="speed-opp-tip">{op.tip}</div>
                  )}
                </div>
              ))}
            </div>
          )}

          {result.opportunities.length === 0 && (
            <div className="speed-perfect">
              🎉 Your store is already well-optimised! Score above 90 with no major issues detected.
            </div>
          )}

          {/* CTA */}
          <div className="speed-cta">
            <h3>Want us to fix these issues?</h3>
            <p>I offer a free personal audit where I'll record a Loom video walking through your store and telling you exactly what to do.</p>
            <Link href="/free-audit" className="tool-cta-btn">Get My Free Store Audit →</Link>
          </div>
        </div>
      )}

      {!result && !loading && (
        <div className="speed-examples">
          <p>Try it with any Shopify store URL, including your own.</p>
        </div>
      )}

      <div style={{ textAlign: 'center', padding: '24px 0 64px' }}>
        <Link href="/tools" style={{ color: 'var(--text-muted)', fontSize: 14 }}>← Back to Free Tools</Link>
      </div>
    </div>
  );
}
