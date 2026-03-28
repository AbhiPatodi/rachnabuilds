'use client';

import { useState, FormEvent } from 'react';

const LogoSVG = () => (
  <svg viewBox="0 0 64 72" fill="none" width="40" height="45">
    <rect width="11" height="72" fill="currentColor" />
    <rect width="42" height="11" fill="currentColor" />
    <path d="M42 0Q64 0 64 16Q64 32 42 32" stroke="currentColor" strokeWidth="11" fill="none" />
    <rect y="27" width="38" height="11" fill="currentColor" />
    <path d="M36 38L64 72" stroke="currentColor" strokeWidth="11" strokeLinecap="square" />
  </svg>
);

interface PasswordGateProps {
  slug: string;
  clientName: string;
}

export default function PasswordGate({ slug, clientName }: PasswordGateProps) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch(`/api/reports/${slug}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      if (res.ok) {
        window.location.reload();
      } else {
        setError('Incorrect password. Please try again.');
      }
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#0B0F1A',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        fontFamily: 'Inter, -apple-system, sans-serif',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '440px',
          background: '#141922',
          border: '1px solid rgba(255,255,255,.06)',
          borderRadius: '20px',
          padding: '48px 40px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '0',
        }}
      >
        {/* Logo */}
        <div style={{ color: '#06D6A0', marginBottom: '24px' }}>
          <LogoSVG />
        </div>

        {/* Brand */}
        <div
          style={{
            fontFamily: 'Cormorant Garamond, serif',
            fontSize: '22px',
            letterSpacing: '0.5px',
            color: '#E8ECF4',
            marginBottom: '32px',
          }}
        >
          Rachna{' '}
          <span style={{ fontStyle: 'italic', fontWeight: 300, color: '#06D6A0' }}>Builds</span>
        </div>

        {/* Heading */}
        <h1
          style={{
            fontFamily: 'Space Grotesk, -apple-system, sans-serif',
            fontSize: '22px',
            fontWeight: 600,
            color: '#E8ECF4',
            textAlign: 'center',
            marginBottom: '10px',
            lineHeight: 1.3,
          }}
        >
          Welcome, {clientName}
        </h1>

        {/* Subtitle */}
        <p
          style={{
            fontSize: '14px',
            color: '#8B95A8',
            textAlign: 'center',
            marginBottom: '36px',
            lineHeight: 1.6,
          }}
        >
          Enter your access password to view your report.
        </p>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter password"
            required
            style={{
              width: '100%',
              padding: '14px 16px',
              background: '#1C2333',
              border: '1px solid rgba(255,255,255,.08)',
              borderRadius: '10px',
              color: '#E8ECF4',
              fontSize: '15px',
              transition: 'border-color .2s',
              outline: 'none',
            }}
            onFocus={(e) => (e.currentTarget.style.borderColor = '#06D6A0')}
            onBlur={(e) => (e.currentTarget.style.borderColor = 'rgba(255,255,255,.08)')}
          />

          {error && (
            <p
              style={{
                fontSize: '13px',
                color: '#FF6B6B',
                textAlign: 'center',
                margin: '0',
              }}
            >
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading || !password}
            style={{
              width: '100%',
              padding: '14px 24px',
              background: loading || !password ? 'rgba(6,214,160,.4)' : '#06D6A0',
              color: '#0B0F1A',
              border: 'none',
              borderRadius: '10px',
              fontSize: '15px',
              fontWeight: 600,
              cursor: loading || !password ? 'not-allowed' : 'pointer',
              transition: 'all .25s',
              fontFamily: 'Space Grotesk, -apple-system, sans-serif',
            }}
            onMouseEnter={(e) => {
              if (!loading && password) {
                e.currentTarget.style.transform = 'translateY(-1px)';
                e.currentTarget.style.boxShadow = '0 6px 24px rgba(6,214,160,.3)';
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            {loading ? 'Verifying...' : 'View My Report →'}
          </button>
        </form>

        {/* Footer note */}
        <p
          style={{
            marginTop: '28px',
            fontSize: '12px',
            color: '#5A6478',
            textAlign: 'center',
          }}
        >
          This report is private and prepared exclusively for you.
        </p>
      </div>
    </div>
  );
}
