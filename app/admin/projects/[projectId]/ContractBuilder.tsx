'use client';
import { useState } from 'react';

// ── Types ────────────────────────────────────────────────────────────────────

interface ContractMeta {
  clientName: string;
  projectName: string;
  date: string;
  preparedBy: string;
  projectType?: string;
}

type SectionType = 'bullets' | 'timeline' | 'payment' | 'text';

interface BulletsSection {
  id: string; type: 'bullets'; title: string; items: string[];
}
interface TimelineSection {
  id: string; type: 'timeline'; title: string;
  rows: { milestone: string; duration: string }[];
  note?: string;
}
interface PaymentSection {
  id: string; type: 'payment'; title: string;
  totalFee: string;
  schedule: { label: string; amount: string; timing: string; paymentLink?: string }[];
  latePenalty?: string;
  paymentMethods?: {
    upiId?: string;
    paypalLink?: string;
    bankDetails?: string;
    qrCodeUrl?: string;
  };
}
interface TextSection {
  id: string; type: 'text'; title: string; body: string;
}

type ContractSection = BulletsSection | TimelineSection | PaymentSection | TextSection;

interface ContractStructured {
  version: '2';
  meta: ContractMeta;
  sections: ContractSection[];
}

export interface ContractData {
  id: string;
  phase: number;
  phaseLabel: string | null;
  content: string;
  status: string;
  clientSignature?: string | null;
  signedAt?: string | null;
  sentAt?: string | null;
}

// ── Default template ─────────────────────────────────────────────────────────

function defaultContract(clientName: string, projectName: string): ContractStructured {
  return {
    version: '2',
    meta: {
      clientName,
      projectName,
      date: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }),
      preparedBy: 'Rachna Jain — Rachna Builds',
    },
    sections: [
      { id: 's1', type: 'bullets', title: 'Scope of Work', items: [''] },
      { id: 's2', type: 'bullets', title: 'Deliverables', items: [''] },
      { id: 's3', type: 'timeline', title: 'Timeline', rows: [{ milestone: 'Discovery + Design', duration: 'Week 1–2' }, { milestone: 'Development', duration: 'Week 3–4' }, { milestone: 'Review + Revisions', duration: 'Week 5' }, { milestone: 'Launch', duration: 'Week 6' }], note: '' },
      { id: 's4', type: 'payment', title: 'Investment', totalFee: '', schedule: [{ label: '50% advance', amount: '', timing: 'due on signing' }, { label: '50% balance', amount: '', timing: 'due before launch' }], latePenalty: '2% per month after 7-day grace period' },
      { id: 's5', type: 'bullets', title: 'Revisions Policy', items: ['Includes 2 rounds of design revisions and 1 round of development revisions', 'Additional revisions billed at ₹2,500/hour'] },
      { id: 's6', type: 'bullets', title: 'Client Responsibilities', items: ['Provide brand guidelines, product images, and copy within 5 days of kickoff', 'Give feedback within 5 business days of each review', 'Provide Shopify admin access and domain credentials'] },
      { id: 's7', type: 'text', title: 'Intellectual Property', body: 'Upon receipt of final payment, all rights to the completed work transfer to the client. Third-party themes, plugins, and apps remain under their respective licenses.' },
      { id: 's8', type: 'text', title: 'Confidentiality', body: 'Both parties agree to keep all project details, pricing, and communications confidential and shall not disclose them to any third party without prior written consent.' },
      { id: 's9', type: 'text', title: 'Governing Law', body: 'This agreement is governed by the laws of India. Any disputes shall be resolved in courts of Mumbai, Maharashtra.' },
    ],
  };
}

function parseContractContent(content: string, clientName: string, projectName: string): ContractStructured {
  if (content?.startsWith('{')) {
    try {
      const parsed = JSON.parse(content);
      if (parsed.version === '2') return parsed as ContractStructured;
    } catch {}
  }
  return defaultContract(clientName, projectName);
}

// ── Print helper ─────────────────────────────────────────────────────────────

function esc(s: string) {
  return (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function openPrintWindow(
  data: ContractStructured,
  phase: number,
  phaseLabel: string | null,
  clientSignature?: string | null,
  signedAt?: string | null,
) {
  const w = window.open('', '_blank');
  if (!w) return;

  const sectionsHtml = data.sections.map((s, i) => {
    const num = i + 1;
    if (s.type === 'bullets') {
      return `<div class="section"><h2>${num}. ${esc(s.title)}</h2><ul>${s.items.filter(Boolean).map(item => `<li>${esc(item)}</li>`).join('')}</ul></div>`;
    }
    if (s.type === 'timeline') {
      const rows = s.rows.map(r => `<tr><td>${esc(r.milestone)}</td><td>${esc(r.duration)}</td></tr>`).join('');
      return `<div class="section"><h2>${num}. ${esc(s.title)}</h2><table><thead><tr><th>Milestone</th><th>Duration</th></tr></thead><tbody>${rows}</tbody></table>${s.note ? `<p>${esc(s.note)}</p>` : ''}</div>`;
    }
    if (s.type === 'payment') {
      const scheduleRows = s.schedule.map(r => `<tr><td>${esc(r.label)}</td><td><strong>${esc(r.amount)}</strong></td><td>${esc(r.timing)}</td></tr>`).join('');
      const pm = s.paymentMethods;
      const pmRows = [
        pm?.upiId ? `<tr><td><strong>UPI ID</strong></td><td>${esc(pm.upiId)}</td></tr>` : '',
        pm?.paypalLink ? `<tr><td><strong>PayPal</strong></td><td><a href="${esc(pm.paypalLink)}">${esc(pm.paypalLink)}</a></td></tr>` : '',
        pm?.bankDetails ? `<tr><td><strong>Bank Details</strong></td><td style="white-space:pre-line">${esc(pm.bankDetails)}</td></tr>` : '',
      ].filter(Boolean).join('');
      const pmBlock = pmRows ? `<h3 style="margin:20px 0 10px;font-size:13px;text-transform:uppercase;letter-spacing:.06em;color:#64748b;">How to Pay</h3><table>${pmRows}</table>` : '';
      const qrBlock = pm?.qrCodeUrl ? `<div style="margin-top:12px"><p style="font-size:12px;color:#64748b;margin-bottom:6px">Scan QR to pay:</p><img src="${esc(pm.qrCodeUrl)}" style="width:140px;height:140px;border-radius:8px;border:1px solid #e2e8f0" /></div>` : '';
      return `<div class="section"><h2>${num}. ${esc(s.title)}</h2><div class="fee-box"><div class="fee-label">Total Fee</div><div class="fee-amount">${esc(s.totalFee)}</div></div><table><thead><tr><th>Payment</th><th>Amount</th><th>Due</th></tr></thead><tbody>${scheduleRows}</tbody></table>${s.latePenalty ? `<p class="note">Late payment: ${esc(s.latePenalty)}</p>` : ''}${pmBlock}${qrBlock}</div>`;
    }
    if (s.type === 'text') {
      return `<div class="section"><h2>${num}. ${esc(s.title)}</h2><p>${esc(s.body)}</p></div>`;
    }
    return '';
  }).join('');

  const sigBlock = clientSignature
    ? `<div class="sig-block"><div class="sig-parties"><div><div class="sig-label">CLIENT SIGNATURE</div><div class="sig-name">${esc(clientSignature)}</div><div class="sig-meta">Signed digitally on ${signedAt ? new Date(signedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : ''}</div></div><div><div class="sig-label">SERVICE PROVIDER</div><div class="sig-line"></div><div class="sig-meta">${esc(data.meta.preparedBy)}</div></div></div></div>`
    : `<div class="sig-block"><div class="sig-parties"><div><div class="sig-label">CLIENT SIGNATURE</div><div class="sig-line"></div><div class="sig-meta">${esc(data.meta.clientName)}</div></div><div><div class="sig-label">SERVICE PROVIDER</div><div class="sig-line"></div><div class="sig-meta">${esc(data.meta.preparedBy)}</div></div></div></div>`;

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Service Agreement — ${esc(data.meta.projectName)}</title><style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: Arial, Helvetica, sans-serif; font-size: 13px; color: #1A1A2E; line-height: 1.7; padding: 48px; max-width: 920px; margin: 0 auto; background: #fff; }

.header { border-bottom: 3px solid #06D6A0; padding-bottom: 24px; margin-bottom: 36px; display: flex; justify-content: space-between; align-items: flex-start; }
.header-left h1 { font-size: 20px; font-weight: 800; color: #0B0F1A; letter-spacing: -0.01em; margin-bottom: 4px; }
.header-left .subtitle { font-size: 11px; text-transform: uppercase; letter-spacing: 0.1em; color: #06D6A0; font-weight: 600; margin-bottom: 16px; }
.header-meta { display: grid; grid-template-columns: 1fr 1fr; gap: 6px 32px; font-size: 12px; }
.header-meta .meta-label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.07em; color: #8B95A8; }
.header-meta .meta-value { font-weight: 600; color: #1A1A2E; }
.header-right .rb-logo { font-size: 28px; font-weight: 800; color: #06D6A0; letter-spacing: -0.03em; }
.header-right .rb-tagline { font-size: 10px; color: #8B95A8; text-align: right; margin-top: 4px; }

.phase-badge { display: inline-block; background: #0B0F1A; color: #06D6A0; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; padding: 4px 12px; border-radius: 100px; margin-bottom: 24px; }

.section { margin-bottom: 28px; page-break-inside: avoid; }
h2 { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #1A1A2E; border-bottom: 1.5px solid #06D6A0; padding-bottom: 5px; margin-bottom: 12px; }
ul { padding-left: 20px; }
ul li { margin-bottom: 4px; color: #4A5568; }

table { width: 100%; border-collapse: collapse; font-size: 12px; margin-top: 8px; }
th { background: #0B0F1A; color: #fff; padding: 8px 12px; text-align: left; font-size: 10px; text-transform: uppercase; letter-spacing: 0.05em; }
td { padding: 8px 12px; border-bottom: 1px solid #E8ECF0; color: #4A5568; }
tr:last-child td { border-bottom: none; }

.fee-box { background: #F0FBF7; border: 2px solid #06D6A0; border-radius: 8px; padding: 16px 20px; margin-bottom: 16px; }
.fee-label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.08em; color: #4A5568; }
.fee-amount { font-size: 26px; font-weight: 800; color: #0B0F1A; margin-top: 4px; }

.sig-block { margin-top: 48px; border-top: 2px solid #E8ECF0; padding-top: 32px; }
.sig-parties { display: grid; grid-template-columns: 1fr 1fr; gap: 48px; }
.sig-label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.08em; color: #8B95A8; margin-bottom: 28px; }
.sig-line { border-bottom: 1.5px solid #1A1A2E; width: 220px; margin-bottom: 8px; }
.sig-name { font-family: Georgia, serif; font-style: italic; font-size: 22px; color: #0B0F1A; margin-bottom: 6px; border-bottom: 1.5px solid #1A1A2E; padding-bottom: 4px; display: inline-block; min-width: 220px; }
.sig-meta { font-size: 11px; color: #8B95A8; }

.print-footer { margin-top: 48px; padding-top: 16px; border-top: 1px solid #E8ECF0; display: flex; justify-content: space-between; font-size: 10px; color: #8B95A8; }

p { color: #4A5568; margin-top: 6px; }
.note { font-size: 11px; color: #8B95A8; margin-top: 8px; font-style: italic; }

@media print { body { padding: 24px; } .phase-badge { -webkit-print-color-adjust: exact; print-color-adjust: exact; } .fee-box { -webkit-print-color-adjust: exact; print-color-adjust: exact; } th { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
  </style></head><body>
    <div class="header">
      <div class="header-left">
        <div class="subtitle">Service Agreement</div>
        <h1>${esc(data.meta.projectName)}</h1>
        <div class="header-meta">
          <div><div class="meta-label">Client</div><div class="meta-value">${esc(data.meta.clientName)}</div></div>
          <div><div class="meta-label">Date</div><div class="meta-value">${esc(data.meta.date)}</div></div>
          <div><div class="meta-label">Prepared by</div><div class="meta-value">${esc(data.meta.preparedBy)}</div></div>
          <div><div class="meta-label">Reference</div><div class="meta-value">RB-${new Date().getFullYear()}-${String(phase).padStart(3, '0')}</div></div>
        </div>
      </div>
      <div class="header-right">
        <div class="rb-logo">RB</div>
        <div class="rb-tagline">rachnabuilds.com</div>
      </div>
    </div>
    <div class="phase-badge">Phase ${phase}${phaseLabel ? ' — ' + esc(phaseLabel) : ''}</div>
    ${sectionsHtml}
    <p style="margin-top:32px;font-size:12px;font-style:italic;color:#8B95A8;border-top:1px solid #E8ECF0;padding-top:16px;">By signing below, both parties confirm they have read, understood, and agree to all terms of this service agreement.</p>
    ${sigBlock}
    <div class="print-footer">
      <span>Rachna Builds — rachnabuilds.com</span>
      <span>rachnajain2103@gmail.com</span>
      <span>Confidential — ${esc(data.meta.clientName)}</span>
    </div>
  </body></html>`;

  w.document.write(html);
  w.document.close();
  setTimeout(() => w.print(), 500);
}

// ── Sub-components ───────────────────────────────────────────────────────────

function AddSectionBar({ onAdd }: { onAdd: (type: SectionType) => void }) {
  const options: { type: SectionType; label: string; desc: string }[] = [
    { type: 'bullets', label: '• Bullet List', desc: 'Add points one by one' },
    { type: 'timeline', label: '📅 Timeline Table', desc: 'Milestone + duration rows' },
    { type: 'payment', label: '💰 Payment Terms', desc: 'Fee + payment schedule' },
    { type: 'text', label: '📝 Text Paragraph', desc: 'Free-form text block' },
  ];
  return (
    <div style={{ border: '1.5px dashed var(--border)', borderRadius: 12, padding: '16px 20px' }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>Add Section</div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {options.map(opt => (
          <button key={opt.type} onClick={() => onAdd(opt.type)}
            style={{ padding: '8px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-elevated)', color: 'var(--text-secondary)', fontSize: 12, cursor: 'pointer', fontWeight: 600, textAlign: 'left' }}>
            <div>{opt.label}</div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 400, marginTop: 2 }}>{opt.desc}</div>
          </button>
        ))}
      </div>
    </div>
  );
}

function ContractPreview({ data, clientSignature, signedAt }: { data: ContractStructured; clientSignature?: string | null; signedAt?: string | null }) {
  const card = { background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, padding: '40px 48px', fontFamily: 'Georgia, serif' };
  const h2Style: React.CSSProperties = { fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-secondary)', borderBottom: '1px solid var(--border)', paddingBottom: 6, marginBottom: 12, marginTop: 28 };

  return (
    <div style={card}>
      <div style={{ textAlign: 'center', borderBottom: '2px solid var(--border)', paddingBottom: 24, marginBottom: 8 }}>
        <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)', marginBottom: 8 }}>Service Agreement</div>
        <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--text)', marginBottom: 16 }}>{data.meta.projectName || '—'}</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 32px', fontSize: 13, color: 'var(--text-secondary)', textAlign: 'left', maxWidth: 500, margin: '0 auto' }}>
          <div><span style={{ color: 'var(--text-muted)', fontSize: 11 }}>CLIENT</span><br /><strong style={{ color: 'var(--text)' }}>{data.meta.clientName || '—'}</strong></div>
          <div><span style={{ color: 'var(--text-muted)', fontSize: 11 }}>DATE</span><br /><strong style={{ color: 'var(--text)' }}>{data.meta.date}</strong></div>
          <div><span style={{ color: 'var(--text-muted)', fontSize: 11 }}>PREPARED BY</span><br /><strong style={{ color: 'var(--text)' }}>{data.meta.preparedBy}</strong></div>
        </div>
      </div>

      {data.sections.map((s, i) => (
        <div key={s.id}>
          <div style={h2Style}>{i + 1}. {s.title}</div>
          {s.type === 'bullets' && (
            <ul style={{ paddingLeft: 18, color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.8 }}>
              {s.items.filter(Boolean).map((item, j) => <li key={j}>{item}</li>)}
            </ul>
          )}
          {s.type === 'timeline' && (
            <>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: 'var(--bg-elevated)' }}>
                    <th style={{ padding: '8px 12px', textAlign: 'left', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>Milestone</th>
                    <th style={{ padding: '8px 12px', textAlign: 'left', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>Duration</th>
                  </tr>
                </thead>
                <tbody>
                  {s.rows.map((row, j) => (
                    <tr key={j}>
                      <td style={{ padding: '8px 12px', color: 'var(--text)', border: '1px solid var(--border)', fontSize: 13 }}>{row.milestone}</td>
                      <td style={{ padding: '8px 12px', color: 'var(--text-secondary)', border: '1px solid var(--border)', fontSize: 13 }}>{row.duration}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {s.note && <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8, fontStyle: 'italic' }}>{s.note}</p>}
            </>
          )}
          {s.type === 'payment' && (
            <>
              {s.totalFee && (
                <div style={{ background: 'var(--bg-elevated)', border: '1.5px solid var(--border)', borderRadius: 10, padding: '16px 20px', marginBottom: 16 }}>
                  <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)' }}>Total Fee</div>
                  <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--text)', marginTop: 4 }}>{s.totalFee}</div>
                </div>
              )}
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: 'var(--bg-elevated)' }}>
                    {['Payment', 'Amount', 'Due'].map(h => <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontSize: 11, textTransform: 'uppercase', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {s.schedule.map((row, j) => (
                    <tr key={j}>
                      <td style={{ padding: '8px 12px', color: 'var(--text)', border: '1px solid var(--border)' }}>{row.label}</td>
                      <td style={{ padding: '8px 12px', color: 'var(--text)', border: '1px solid var(--border)', fontWeight: 700 }}>{row.amount}</td>
                      <td style={{ padding: '8px 12px', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>{row.timing}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {s.latePenalty && <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8, fontStyle: 'italic' }}>Late payment: {s.latePenalty}</p>}
              {s.paymentMethods && (s.paymentMethods.upiId || s.paymentMethods.paypalLink || s.paymentMethods.bankDetails || s.paymentMethods.qrCodeUrl) && (
                <div style={{ marginTop: 20, padding: '16px 20px', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 10 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-muted)', marginBottom: 12 }}>How to Pay</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {s.paymentMethods.upiId && (
                      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', minWidth: 80 }}>UPI ID</span>
                        <span style={{ fontSize: 13, fontFamily: 'var(--mono)', color: 'var(--text)', background: 'var(--bg)', padding: '3px 10px', borderRadius: 6, border: '1px solid var(--border)' }}>{s.paymentMethods.upiId}</span>
                      </div>
                    )}
                    {s.paymentMethods.paypalLink && (
                      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', minWidth: 80 }}>PayPal</span>
                        <a href={s.paymentMethods.paypalLink} target="_blank" rel="noopener" style={{ fontSize: 13, color: 'var(--accent)', wordBreak: 'break-all' }}>{s.paymentMethods.paypalLink}</a>
                      </div>
                    )}
                    {s.paymentMethods.bankDetails && (
                      <div style={{ display: 'flex', gap: 12 }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', minWidth: 80 }}>Bank</span>
                        <span style={{ fontSize: 13, color: 'var(--text)', whiteSpace: 'pre-line', lineHeight: 1.6 }}>{s.paymentMethods.bankDetails}</span>
                      </div>
                    )}
                    {s.paymentMethods.qrCodeUrl && (
                      <div style={{ marginTop: 8 }}>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>Scan to pay:</div>
                        <img src={s.paymentMethods.qrCodeUrl} alt="Payment QR" style={{ width: 120, height: 120, borderRadius: 8, border: '1px solid var(--border)' }} />
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
          {s.type === 'text' && (
            <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.7 }}>{s.body}</p>
          )}
        </div>
      ))}

      <div style={{ marginTop: 40, paddingTop: 24, borderTop: '1px solid var(--border)' }}>
        <p style={{ fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic', marginBottom: 28 }}>
          By signing below, both parties confirm they have read, understood, and agree to all terms of this service agreement.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 40 }}>
          <div>
            <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-muted)', marginBottom: 24 }}>Client Signature</div>
            {clientSignature ? (
              <>
                <div style={{ fontFamily: 'Georgia, serif', fontStyle: 'italic', fontSize: 22, color: 'var(--text)', borderBottom: '1px solid var(--border)', paddingBottom: 4, marginBottom: 8 }}>{clientSignature}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Signed on {signedAt ? new Date(signedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : ''}</div>
              </>
            ) : (
              <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: 4, marginBottom: 8, height: 30 }} />
            )}
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 8 }}>{data.meta.clientName}</div>
          </div>
          <div>
            <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-muted)', marginBottom: 24 }}>Service Provider</div>
            <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: 4, marginBottom: 8, height: 30 }} />
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 8 }}>{data.meta.preparedBy}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main export ──────────────────────────────────────────────────────────────

interface ContractBuilderProps {
  projectId: string;
  clientName: string;
  projectName: string;
  initialContracts: ContractData[];
  onContractsChange?: (contracts: ContractData[]) => void;
}

export default function ContractBuilder({
  projectId,
  clientName,
  projectName,
  initialContracts,
  onContractsChange,
}: ContractBuilderProps) {
  // ── Phase state ─────────────────────────────────────────────────────────────
  const [contracts, setContracts] = useState<ContractData[]>(
    initialContracts.length > 0 ? initialContracts : []
  );
  const [activePhase, setActivePhase] = useState<number>(
    initialContracts.length > 0 ? initialContracts[0].phase : 1
  );
  const [showAddPhase, setShowAddPhase] = useState(false);
  const [newPhaseLabel, setNewPhaseLabel] = useState('');
  const [addingPhase, setAddingPhase] = useState(false);

  // ── Per-phase editor state ──────────────────────────────────────────────────
  const [mode, setMode] = useState<'build' | 'preview'>('build');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [sending, setSending] = useState(false);

  // ── Derived active contract ─────────────────────────────────────────────────
  const activeContract = contracts.find(c => c.phase === activePhase) ?? null;
  const activeData: ContractStructured = activeContract
    ? parseContractContent(activeContract.content, clientName, projectName)
    : defaultContract(clientName, projectName);

  // ── Helpers to sync structured data back into contracts list ────────────────
  const updateActiveData = (updater: (prev: ContractStructured) => ContractStructured) => {
    setContracts(prev => prev.map(c => {
      if (c.phase !== activePhase) return c;
      const current = parseContractContent(c.content, clientName, projectName);
      const next = updater(current);
      return { ...c, content: JSON.stringify(next) };
    }));
  };

  const updateActiveContract = (updates: Partial<ContractData>) => {
    setContracts(prev => {
      const next = prev.map(c => c.phase === activePhase ? { ...c, ...updates } : c);
      onContractsChange?.(next);
      return next;
    });
  };

  // ── Add phase ───────────────────────────────────────────────────────────────
  const handleAddPhase = async () => {
    const nextPhase = contracts.length > 0 ? Math.max(...contracts.map(c => c.phase)) + 1 : 1;
    setAddingPhase(true);
    try {
      const res = await fetch(`/api/admin/projects/${projectId}/contract`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phase: nextPhase, phaseLabel: newPhaseLabel || null }),
      });
      if (res.ok) {
        const created: ContractData = await res.json();
        const newContracts = [...contracts, created];
        setContracts(newContracts);
        onContractsChange?.(newContracts);
        setActivePhase(nextPhase);
        setShowAddPhase(false);
        setNewPhaseLabel('');
      }
    } finally {
      setAddingPhase(false);
    }
  };

  // ── Save ────────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!activeContract) return;
    setSaving(true);
    try {
      await fetch(`/api/admin/projects/${projectId}/contract?phase=${activePhase}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: activeContract.content }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally { setSaving(false); }
  };

  // ── Phase label save on blur ────────────────────────────────────────────────
  const handlePhaseLabelBlur = async (label: string) => {
    if (!activeContract) return;
    updateActiveContract({ phaseLabel: label });
    await fetch(`/api/admin/projects/${projectId}/contract?phase=${activePhase}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phaseLabel: label }),
    });
  };

  // ── Send / status change ────────────────────────────────────────────────────
  const handleSend = async () => {
    if (!activeContract) return;
    if (!confirm('Send this phase contract to the client?')) return;
    setSending(true);
    try {
      await fetch(`/api/admin/projects/${projectId}/contract?phase=${activePhase}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'sent' }),
      });
      updateActiveContract({ status: 'sent' });
    } finally { setSending(false); }
  };

  // ── Section updaters ────────────────────────────────────────────────────────
  const updateSection = (id: string, updates: Partial<ContractSection>) => {
    updateActiveData(d => ({ ...d, sections: d.sections.map(s => s.id === id ? { ...s, ...updates } as ContractSection : s) }));
  };

  const deleteSection = (id: string) => {
    updateActiveData(d => ({ ...d, sections: d.sections.filter(s => s.id !== id) }));
  };

  const addSection = (type: SectionType) => {
    const id = `s${Date.now()}`;
    const newSection: ContractSection =
      type === 'bullets' ? { id, type: 'bullets', title: 'New Section', items: [''] } :
      type === 'timeline' ? { id, type: 'timeline', title: 'Timeline', rows: [{ milestone: '', duration: '' }] } :
      type === 'payment' ? { id, type: 'payment', title: 'Investment', totalFee: '', schedule: [{ label: '', amount: '', timing: '' }] } :
      { id, type: 'text', title: 'New Section', body: '' };
    updateActiveData(d => ({ ...d, sections: [...d.sections, newSection] }));
  };

  const updateMeta = (key: keyof ContractMeta, value: string) => {
    updateActiveData(d => ({ ...d, meta: { ...d.meta, [key]: value } }));
  };

  // ── Bullets helpers ─────────────────────────────────────────────────────────
  const updateBulletItem = (sectionId: string, idx: number, value: string) => {
    updateActiveData(d => ({ ...d, sections: d.sections.map(s => {
      if (s.id !== sectionId || s.type !== 'bullets') return s;
      const items = [...s.items];
      items[idx] = value;
      return { ...s, items };
    })}));
  };
  const addBulletItem = (sectionId: string) => {
    updateActiveData(d => ({ ...d, sections: d.sections.map(s => s.id === sectionId && s.type === 'bullets' ? { ...s, items: [...s.items, ''] } : s) }));
  };
  const removeBulletItem = (sectionId: string, idx: number) => {
    updateActiveData(d => ({ ...d, sections: d.sections.map(s => {
      if (s.id !== sectionId || s.type !== 'bullets') return s;
      const items = s.items.filter((_, i) => i !== idx);
      return { ...s, items: items.length ? items : [''] };
    })}));
  };

  // ── Timeline helpers ────────────────────────────────────────────────────────
  const updateTimelineRow = (sectionId: string, idx: number, field: 'milestone' | 'duration', value: string) => {
    updateActiveData(d => ({ ...d, sections: d.sections.map(s => {
      if (s.id !== sectionId || s.type !== 'timeline') return s;
      const rows = [...s.rows];
      rows[idx] = { ...rows[idx], [field]: value };
      return { ...s, rows };
    })}));
  };
  const addTimelineRow = (sectionId: string) => {
    updateActiveData(d => ({ ...d, sections: d.sections.map(s => s.id === sectionId && s.type === 'timeline' ? { ...s, rows: [...s.rows, { milestone: '', duration: '' }] } : s) }));
  };
  const removeTimelineRow = (sectionId: string, idx: number) => {
    updateActiveData(d => ({ ...d, sections: d.sections.map(s => {
      if (s.id !== sectionId || s.type !== 'timeline') return s;
      const rows = s.rows.filter((_, i) => i !== idx);
      return { ...s, rows: rows.length ? rows : [{ milestone: '', duration: '' }] };
    })}));
  };

  // ── Payment helpers ─────────────────────────────────────────────────────────
  const updatePaymentScheduleRow = (sectionId: string, idx: number, field: 'label' | 'amount' | 'timing' | 'paymentLink', value: string) => {
    updateActiveData(d => ({ ...d, sections: d.sections.map(s => {
      if (s.id !== sectionId || s.type !== 'payment') return s;
      const schedule = [...s.schedule];
      schedule[idx] = { ...schedule[idx], [field]: value };
      return { ...s, schedule };
    })}));
  };
  const addPaymentRow = (sectionId: string) => {
    updateActiveData(d => ({ ...d, sections: d.sections.map(s => s.id === sectionId && s.type === 'payment' ? { ...s, schedule: [...s.schedule, { label: '', amount: '', timing: '', paymentLink: '' }] } : s) }));
  };
  const removePaymentRow = (sectionId: string, idx: number) => {
    updateActiveData(d => ({ ...d, sections: d.sections.map(s => {
      if (s.id !== sectionId || s.type !== 'payment') return s;
      const schedule = s.schedule.filter((_, i) => i !== idx);
      return { ...s, schedule: schedule.length ? schedule : [{ label: '', amount: '', timing: '' }] };
    })}));
  };

  const TYPE_BADGE: Record<string, string> = { bullets: 'List', timeline: 'Timeline', payment: 'Payment', text: 'Text' };
  const TYPE_COLOR: Record<string, string> = { bullets: '#06D6A0', timeline: '#A78BFA', payment: '#F59E0B', text: '#64748B' };

  // ── Empty state (no phases yet) ─────────────────────────────────────────────
  if (contracts.length === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 24px', gap: 16 }}>
        <div style={{ fontSize: 40 }}>📄</div>
        <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>No contract phases yet</div>
        <div style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center', maxWidth: 360 }}>
          Create your first phase to start building a contract for this project.
        </div>
        <button
          onClick={() => setShowAddPhase(true)}
          style={{ padding: '10px 24px', borderRadius: 10, border: 'none', background: '#06D6A0', color: '#0B0F1A', fontSize: 14, fontWeight: 700, cursor: 'pointer', marginTop: 8 }}
        >
          + Create Phase 1
        </button>
        {showAddPhase && (
          <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 12, padding: '20px 24px', width: '100%', maxWidth: 400 }}>
            <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text)', marginBottom: 12 }}>New Phase</div>
            <label className="admin-label">Phase Label (optional)</label>
            <input
              className="admin-input"
              value={newPhaseLabel}
              onChange={e => setNewPhaseLabel(e.target.value)}
              placeholder="e.g. Shopify Store Build"
              style={{ marginBottom: 12 }}
            />
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={handleAddPhase} disabled={addingPhase}
                style={{ padding: '8px 20px', borderRadius: 8, border: 'none', background: '#06D6A0', color: '#0B0F1A', fontWeight: 700, fontSize: 13, cursor: 'pointer', opacity: addingPhase ? 0.7 : 1 }}>
                {addingPhase ? 'Creating…' : 'Create Phase 1'}
              </button>
              <button onClick={() => { setShowAddPhase(false); setNewPhaseLabel(''); }}
                style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-secondary)', fontSize: 13, cursor: 'pointer' }}>
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* ── Phase tabs ──────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        {contracts.map(p => (
          <button
            key={p.phase}
            onClick={() => setActivePhase(p.phase)}
            style={{
              padding: '6px 16px',
              borderRadius: 8,
              border: activePhase === p.phase ? '1.5px solid #06D6A0' : '1px solid var(--border)',
              background: activePhase === p.phase ? 'rgba(6,214,160,0.08)' : 'var(--bg-elevated)',
              color: activePhase === p.phase ? '#06D6A0' : 'var(--text-secondary)',
              fontWeight: 600,
              fontSize: 13,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            Phase {p.phase}{p.phaseLabel ? ` — ${p.phaseLabel}` : ''}
            <span style={{
              fontSize: 10,
              fontWeight: 700,
              padding: '2px 7px',
              borderRadius: 100,
              background: p.status === 'signed' ? 'rgba(6,214,160,0.15)' : p.status === 'sent' ? 'rgba(245,158,11,0.15)' : 'rgba(139,149,168,0.15)',
              color: p.status === 'signed' ? '#06D6A0' : p.status === 'sent' ? '#F59E0B' : '#8B95A8',
            }}>
              {p.status === 'signed' ? '✓ Signed' : p.status === 'sent' ? 'Sent' : 'Draft'}
            </span>
          </button>
        ))}
        <button
          onClick={() => setShowAddPhase(true)}
          style={{ padding: '6px 14px', borderRadius: 8, border: '1.5px dashed var(--border)', background: 'transparent', color: 'var(--text-muted)', fontSize: 12, cursor: 'pointer' }}
        >
          + Add Phase
        </button>
      </div>

      {/* ── Add phase inline form ────────────────────────────────────────────── */}
      {showAddPhase && (
        <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 12, padding: '16px 20px', display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div>
            <label className="admin-label">Phase Number</label>
            <div style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text-muted)', fontSize: 13, minWidth: 60 }}>
              {contracts.length > 0 ? Math.max(...contracts.map(c => c.phase)) + 1 : 1}
            </div>
          </div>
          <div style={{ flex: 1, minWidth: 200 }}>
            <label className="admin-label">Phase Label (optional)</label>
            <input
              className="admin-input"
              value={newPhaseLabel}
              onChange={e => setNewPhaseLabel(e.target.value)}
              placeholder="e.g. PDP Template Build"
              onKeyDown={e => { if (e.key === 'Enter') handleAddPhase(); }}
            />
          </div>
          <button onClick={handleAddPhase} disabled={addingPhase}
            style={{ padding: '8px 20px', borderRadius: 8, border: 'none', background: '#06D6A0', color: '#0B0F1A', fontWeight: 700, fontSize: 13, cursor: 'pointer', opacity: addingPhase ? 0.7 : 1, marginBottom: 1 }}>
            {addingPhase ? 'Creating…' : 'Confirm'}
          </button>
          <button onClick={() => { setShowAddPhase(false); setNewPhaseLabel(''); }}
            style={{ padding: '8px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-secondary)', fontSize: 13, cursor: 'pointer', marginBottom: 1 }}>
            Cancel
          </button>
        </div>
      )}

      {/* ── Active phase editor header ───────────────────────────────────────── */}
      {activeContract && (
        <>
          {/* Phase label editable */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', flexShrink: 0 }}>Phase Label</span>
            <input
              className="admin-input"
              defaultValue={activeContract.phaseLabel ?? ''}
              placeholder="e.g. Shopify Store Build"
              onBlur={e => handlePhaseLabelBlur(e.target.value)}
              key={activePhase}
              style={{ maxWidth: 320 }}
            />
          </div>

          {/* Toolbar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
            <div style={{ display: 'flex', gap: 0, background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
              {(['build', 'preview'] as const).map(m => (
                <button key={m} onClick={() => setMode(m)}
                  style={{ padding: '7px 18px', border: 'none', background: mode === m ? '#06D6A0' : 'transparent', color: mode === m ? '#0B0F1A' : 'var(--text-secondary)', fontWeight: 700, fontSize: 13, cursor: 'pointer', textTransform: 'capitalize' }}>
                  {m === 'build' ? '✏️ Build' : '👁 Preview'}
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              {/* Status badge */}
              <span style={{
                padding: '4px 12px', borderRadius: 100, fontSize: 11, fontWeight: 700,
                background: activeContract.status === 'signed' ? 'rgba(6,214,160,0.12)' : activeContract.status === 'sent' ? 'rgba(167,139,250,0.12)' : 'rgba(100,116,139,0.12)',
                color: activeContract.status === 'signed' ? '#06D6A0' : activeContract.status === 'sent' ? '#A78BFA' : '#64748B',
                border: `1px solid ${activeContract.status === 'signed' ? '#06D6A040' : activeContract.status === 'sent' ? '#A78BFA40' : '#64748B40'}`,
              }}>
                {activeContract.status === 'signed' ? '✓ Signed' : activeContract.status === 'sent' ? '📨 Sent to Client' : '📝 Draft'}
              </span>
              {activeContract.status === 'signed' && activeContract.signedAt && (
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                  by {activeContract.clientSignature} · {new Date(activeContract.signedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                </span>
              )}
              <button
                onClick={() => openPrintWindow(activeData, activePhase, activeContract.phaseLabel, activeContract.clientSignature, activeContract.signedAt)}
                style={{ padding: '7px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-elevated)', color: 'var(--text-secondary)', fontSize: 13, cursor: 'pointer', fontWeight: 600 }}>
                🖨 Print / PDF
              </button>
              <button onClick={handleSave} disabled={saving}
                style={{ padding: '7px 16px', borderRadius: 8, border: 'none', background: '#06D6A0', color: '#0B0F1A', fontSize: 13, cursor: 'pointer', fontWeight: 700, opacity: saving ? 0.7 : 1 }}>
                {saving ? 'Saving…' : saved ? '✓ Saved' : 'Save Draft'}
              </button>
              <button onClick={handleSend} disabled={sending}
                style={{ padding: '7px 16px', borderRadius: 8, border: 'none', background: activeContract.status === 'signed' ? '#64748B' : '#A78BFA', color: '#fff', fontSize: 13, cursor: 'pointer', fontWeight: 700, opacity: sending ? 0.7 : 1 }}>
                {sending ? 'Sending…' : activeContract.status === 'draft' ? '📨 Send to Client' : '🔁 Resend to Client'}
              </button>
            </div>
          </div>

          {/* ── Editor / Preview ────────────────────────────────────────────── */}
          {mode === 'preview' ? (
            <ContractPreview data={activeData} clientSignature={activeContract.clientSignature} signedAt={activeContract.signedAt} />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Meta */}
              <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 12, padding: '16px 20px' }}>
                <div style={{ fontWeight: 700, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: 12 }}>Contract Details</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div><label className="admin-label">Client Name</label><input className="admin-input" value={activeData.meta.clientName} onChange={e => updateMeta('clientName', e.target.value)} /></div>
                  <div><label className="admin-label">Project Name</label><input className="admin-input" value={activeData.meta.projectName} onChange={e => updateMeta('projectName', e.target.value)} /></div>
                  <div><label className="admin-label">Contract Date</label><input className="admin-input" value={activeData.meta.date} onChange={e => updateMeta('date', e.target.value)} /></div>
                  <div><label className="admin-label">Prepared By</label><input className="admin-input" value={activeData.meta.preparedBy} onChange={e => updateMeta('preparedBy', e.target.value)} /></div>
                </div>
              </div>

              {/* Sections */}
              {activeData.sections.map((section) => (
                <div key={section.id} style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 12, padding: '16px 20px' }}>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 14 }}>
                    <span style={{ color: 'var(--text-muted)', fontSize: 16, cursor: 'grab' }}>⠿</span>
                    <input value={section.title} onChange={e => updateSection(section.id, { title: e.target.value })}
                      style={{ flex: 1, background: 'transparent', border: 'none', borderBottom: '1px solid var(--border)', padding: '4px 0', fontSize: 15, fontWeight: 700, color: 'var(--text)', outline: 'none' }} />
                    <span style={{ padding: '2px 8px', borderRadius: 6, fontSize: 10, fontWeight: 700, color: TYPE_COLOR[section.type], background: `${TYPE_COLOR[section.type]}18`, border: `1px solid ${TYPE_COLOR[section.type]}44` }}>
                      {TYPE_BADGE[section.type]}
                    </span>
                    <button onClick={() => deleteSection(section.id)}
                      style={{ background: 'none', border: 'none', color: '#FF6B6B', cursor: 'pointer', fontSize: 16, padding: '2px 4px', opacity: 0.7 }} title="Remove section">
                      🗑
                    </button>
                  </div>

                  {/* Bullets */}
                  {section.type === 'bullets' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {section.items.map((item, idx) => (
                        <div key={idx} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                          <span style={{ color: 'var(--text-muted)', fontSize: 16, flexShrink: 0 }}>•</span>
                          <input className="admin-input" value={item} onChange={e => updateBulletItem(section.id, idx, e.target.value)} placeholder="Item…" style={{ flex: 1 }} />
                          <button onClick={() => removeBulletItem(section.id, idx)}
                            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 14, flexShrink: 0 }}>✕</button>
                        </div>
                      ))}
                      <button onClick={() => addBulletItem(section.id)}
                        style={{ alignSelf: 'flex-start', background: 'none', border: '1px dashed var(--border)', borderRadius: 6, color: 'var(--text-muted)', cursor: 'pointer', padding: '4px 12px', fontSize: 12, marginTop: 4 }}>
                        + Add item
                      </button>
                    </div>
                  )}

                  {/* Timeline */}
                  {section.type === 'timeline' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 8, marginBottom: 4 }}>
                        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Milestone</div>
                        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Duration</div>
                        <div />
                      </div>
                      {section.rows.map((row, idx) => (
                        <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 8, alignItems: 'center' }}>
                          <input className="admin-input" value={row.milestone} onChange={e => updateTimelineRow(section.id, idx, 'milestone', e.target.value)} placeholder="e.g. Discovery + Design" />
                          <input className="admin-input" value={row.duration} onChange={e => updateTimelineRow(section.id, idx, 'duration', e.target.value)} placeholder="e.g. Week 1–2" />
                          <button onClick={() => removeTimelineRow(section.id, idx)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 14 }}>✕</button>
                        </div>
                      ))}
                      <button onClick={() => addTimelineRow(section.id)}
                        style={{ alignSelf: 'flex-start', background: 'none', border: '1px dashed var(--border)', borderRadius: 6, color: 'var(--text-muted)', cursor: 'pointer', padding: '4px 12px', fontSize: 12, marginTop: 4 }}>
                        + Add row
                      </button>
                      <div style={{ marginTop: 8 }}>
                        <label className="admin-label">Note (optional)</label>
                        <input className="admin-input" value={section.note ?? ''} onChange={e => updateSection(section.id, { note: e.target.value })} placeholder="e.g. Total: 6 weeks from contract signing" />
                      </div>
                    </div>
                  )}

                  {/* Payment */}
                  {section.type === 'payment' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      <div><label className="admin-label">Total Fee</label><input className="admin-input" value={section.totalFee} onChange={e => updateSection(section.id, { totalFee: e.target.value })} placeholder="e.g. ₹1,20,000 + GST (18%)" /></div>
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 }}>Payment Schedule</div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1.5fr auto', gap: 8, marginBottom: 4 }}>
                          {['Label', 'Amount', 'Due', 'Payment Link', ''].map(h => <div key={h} style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>{h}</div>)}
                        </div>
                        {section.schedule.map((row, idx) => (
                          <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1.5fr auto', gap: 8, alignItems: 'center', marginBottom: 8 }}>
                            <input className="admin-input" value={row.label} onChange={e => updatePaymentScheduleRow(section.id, idx, 'label', e.target.value)} placeholder="50% advance" />
                            <input className="admin-input" value={row.amount} onChange={e => updatePaymentScheduleRow(section.id, idx, 'amount', e.target.value)} placeholder="₹60,000" />
                            <input className="admin-input" value={row.timing} onChange={e => updatePaymentScheduleRow(section.id, idx, 'timing', e.target.value)} placeholder="due on signing" />
                            <input className="admin-input" value={row.paymentLink ?? ''} onChange={e => updatePaymentScheduleRow(section.id, idx, 'paymentLink', e.target.value)} placeholder="https://paypal.me/..." />
                            <button onClick={() => removePaymentRow(section.id, idx)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 14 }}>✕</button>
                          </div>
                        ))}
                        <button onClick={() => addPaymentRow(section.id)}
                          style={{ background: 'none', border: '1px dashed var(--border)', borderRadius: 6, color: 'var(--text-muted)', cursor: 'pointer', padding: '4px 12px', fontSize: 12 }}>
                          + Add row
                        </button>
                      </div>
                      <div><label className="admin-label">Late Payment Note</label><input className="admin-input" value={section.latePenalty ?? ''} onChange={e => updateSection(section.id, { latePenalty: e.target.value })} placeholder="e.g. 2% per month after 7-day grace period" /></div>
                      <div style={{ paddingTop: 12, borderTop: '1px solid var(--border)' }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Payment Methods (shown to client)</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                          <div>
                            <label className="admin-label">UPI ID</label>
                            <input className="admin-input" value={section.paymentMethods?.upiId ?? ''} onChange={e => updateSection(section.id, { paymentMethods: { ...section.paymentMethods, upiId: e.target.value } })} placeholder="e.g. rachna@upi or 9876543210@paytm" />
                          </div>
                          <div>
                            <label className="admin-label">PayPal Link</label>
                            <input className="admin-input" value={section.paymentMethods?.paypalLink ?? ''} onChange={e => updateSection(section.id, { paymentMethods: { ...section.paymentMethods, paypalLink: e.target.value } })} placeholder="e.g. https://paypal.me/rachnabuilds" />
                          </div>
                          <div>
                            <label className="admin-label">Bank Details</label>
                            <textarea className="admin-input" value={section.paymentMethods?.bankDetails ?? ''} onChange={e => updateSection(section.id, { paymentMethods: { ...section.paymentMethods, bankDetails: e.target.value } })} placeholder={"Account Name: Rachna Jain\nBank: HDFC Bank\nAccount No: 1234567890\nIFSC: HDFC0001234"} rows={4} style={{ resize: 'vertical', width: '100%', fontFamily: 'var(--mono)', fontSize: 12 }} />
                          </div>
                          <div>
                            <label className="admin-label">QR Code Image URL (optional)</label>
                            <input className="admin-input" value={section.paymentMethods?.qrCodeUrl ?? ''} onChange={e => updateSection(section.id, { paymentMethods: { ...section.paymentMethods, qrCodeUrl: e.target.value } })} placeholder="Paste image URL of your UPI QR code" />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Text */}
                  {section.type === 'text' && (
                    <textarea className="admin-input" value={section.body} onChange={e => updateSection(section.id, { body: e.target.value })} rows={4} style={{ resize: 'vertical', width: '100%' }} placeholder="Section content…" />
                  )}
                </div>
              ))}

              {/* Add section */}
              <AddSectionBar onAdd={addSection} />
            </div>
          )}
        </>
      )}
    </div>
  );
}
