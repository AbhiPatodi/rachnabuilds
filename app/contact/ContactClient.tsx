"use client";

import { useState } from "react";

interface Props {
  whatsappNumber: string;
  contactEmail: string;
}

export default function ContactClient({ whatsappNumber, contactEmail }: Props) {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    service: "",
    budget: "",
    message: "",
  });
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("loading");
    setErrorMsg("");

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setErrorMsg(data.error || "Something went wrong. Please try again.");
        setStatus("error");
      } else {
        setStatus("success");
        setFormData({ name: "", email: "", phone: "", service: "", budget: "", message: "" });
      }
    } catch {
      setErrorMsg("Network error. Please check your connection and try again.");
      setStatus("error");
    }
  };

  const displayPhone = whatsappNumber.startsWith("91")
    ? `+${whatsappNumber.slice(0, 2)} ${whatsappNumber.slice(2, 7)} ${whatsappNumber.slice(7)}`
    : `+${whatsappNumber}`;

  return (
    <>
      <style>{`
        .contact-page {
          min-height: 100vh;
          background: var(--bg);
          padding-top: 80px;
        }
        .contact-hero {
          padding: clamp(60px, 10vw, 120px) clamp(20px, 4vw, 48px) clamp(48px, 6vw, 80px);
          max-width: 1200px;
          margin: 0 auto;
          text-align: center;
        }
        .contact-hero-label {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          font-family: var(--mono);
          font-size: 11px;
          font-weight: 600;
          letter-spacing: .14em;
          text-transform: uppercase;
          color: var(--accent);
          margin-bottom: 20px;
        }
        .contact-hero-label::before {
          content: '';
          width: 20px;
          height: 2px;
          background: var(--accent);
          border-radius: 2px;
        }
        .contact-hero h1 {
          font-family: var(--heading);
          font-weight: 700;
          font-size: clamp(40px, 7vw, 80px);
          line-height: 1.05;
          letter-spacing: -.04em;
          margin-bottom: 20px;
          color: var(--text);
        }
        .contact-hero h1 .accent {
          color: var(--accent);
          position: relative;
        }
        .contact-hero h1 .accent::after {
          content: '';
          position: absolute;
          bottom: 4px;
          left: 0;
          right: 0;
          height: 3px;
          background: var(--accent);
          border-radius: 2px;
          opacity: .35;
        }
        .contact-hero p {
          font-size: clamp(16px, 1.8vw, 19px);
          color: var(--text-secondary);
          line-height: 1.65;
          max-width: 480px;
          margin: 0 auto;
        }
        .contact-body {
          max-width: 1200px;
          margin: 0 auto;
          padding: 0 clamp(20px, 4vw, 48px) clamp(60px, 8vw, 100px);
          display: grid;
          grid-template-columns: 1fr 360px;
          gap: 40px;
          align-items: start;
        }
        @media (max-width: 900px) {
          .contact-body {
            grid-template-columns: 1fr;
          }
          .contact-sidebar {
            order: -1;
          }
        }
        .contact-form-card {
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: var(--radius);
          padding: clamp(28px, 4vw, 48px);
        }
        .form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }
        @media (max-width: 560px) {
          .form-row {
            grid-template-columns: 1fr;
          }
        }
        .field {
          display: flex;
          flex-direction: column;
          gap: 8px;
          margin-bottom: 20px;
        }
        .field label {
          font-size: 13px;
          font-weight: 600;
          color: var(--text-secondary);
          letter-spacing: .01em;
        }
        .field label .req {
          color: var(--coral);
          margin-left: 2px;
        }
        .field input,
        .field select,
        .field textarea {
          background: var(--bg-elevated);
          border: 1px solid var(--border);
          border-radius: var(--radius-xs);
          padding: 12px 16px;
          font-size: 15px;
          color: var(--text);
          transition: border-color .2s, box-shadow .2s;
          width: 100%;
        }
        .field input::placeholder,
        .field textarea::placeholder {
          color: var(--text-muted);
        }
        .field select option {
          background: var(--bg-card);
          color: var(--text);
        }
        .field input:focus,
        .field select:focus,
        .field textarea:focus {
          border-color: var(--accent);
          box-shadow: 0 0 0 3px var(--accent-dim);
          outline: none;
        }
        .field textarea {
          resize: vertical;
          min-height: 120px;
        }
        .submit-btn {
          width: 100%;
          padding: 16px 24px;
          background: var(--accent);
          color: var(--bg);
          border: none;
          border-radius: var(--radius-sm);
          font-size: 16px;
          font-weight: 700;
          cursor: pointer;
          transition: all .3s;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          margin-top: 8px;
          font-family: var(--heading);
          letter-spacing: -.01em;
        }
        .submit-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 8px 32px var(--accent-glow);
        }
        .submit-btn:disabled {
          opacity: .7;
          cursor: not-allowed;
        }
        .success-state {
          text-align: center;
          padding: 48px 24px;
        }
        .success-check {
          width: 64px;
          height: 64px;
          border-radius: 50%;
          background: var(--accent-dim);
          border: 1px solid rgba(6,214,160,.3);
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 24px;
        }
        .success-check svg {
          width: 28px;
          height: 28px;
          color: var(--accent);
        }
        .success-state h3 {
          font-family: var(--heading);
          font-size: 24px;
          font-weight: 700;
          margin-bottom: 10px;
          color: var(--text);
        }
        .success-state p {
          color: var(--text-secondary);
          font-size: 15px;
          line-height: 1.6;
        }
        .error-banner {
          background: var(--coral-dim);
          border: 1px solid rgba(255,107,107,.25);
          border-radius: var(--radius-xs);
          padding: 12px 16px;
          font-size: 14px;
          color: var(--coral);
          margin-bottom: 16px;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .contact-sidebar {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .sidebar-card {
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: var(--radius);
          padding: 24px;
        }
        .sidebar-card h3 {
          font-family: var(--heading);
          font-size: 14px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: .08em;
          color: var(--text-muted);
          margin-bottom: 16px;
        }
        .ci-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 0;
          border-bottom: 1px solid var(--border);
          text-decoration: none;
          color: var(--text);
          transition: color .2s;
        }
        .ci-item:last-child { border-bottom: none; padding-bottom: 0; }
        .ci-item:first-child { padding-top: 0; }
        .ci-item:hover { color: var(--accent); }
        .ci-icon {
          width: 40px;
          height: 40px;
          border-radius: var(--radius-xs);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          font-size: 18px;
        }
        .ci-icon.wa { background: rgba(37,211,102,.12); color: #25D366; }
        .ci-icon.em { background: var(--accent-dim); color: var(--accent); }
        .ci-label { font-size: 12px; color: var(--text-muted); margin-bottom: 2px; }
        .ci-value { font-size: 14px; font-weight: 600; }
        .response-note {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px 16px;
          background: var(--accent-dim);
          border: 1px solid rgba(6,214,160,.2);
          border-radius: var(--radius-xs);
          font-size: 13px;
          color: var(--accent);
          font-weight: 500;
        }
        .response-note svg { width: 16px; height: 16px; flex-shrink: 0; }
        .expect-list {
          list-style: none;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .expect-list li {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          font-size: 13px;
          color: var(--text-secondary);
          line-height: 1.5;
        }
        .expect-list li::before {
          content: '';
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: var(--accent);
          flex-shrink: 0;
          margin-top: 5px;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>

      <div className="contact-page">
        <div className="contact-hero">
          <div className="contact-hero-label">Get in Touch</div>
          <h1>
            Let&apos;s build <span className="accent">something</span>
          </h1>
          <p>Tell me about your project and I&apos;ll get back to you within 24 hours.</p>
        </div>

        <div className="contact-body">
          <div className="contact-form-card">
            {status === "success" ? (
              <div className="success-state">
                <div className="success-check">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
                <h3>Message sent!</h3>
                <p>Thanks for reaching out. I&apos;ll review your project details and get back to you within 24 hours.</p>
                <button
                  onClick={() => setStatus("idle")}
                  style={{ marginTop: 20, background: 'transparent', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '10px 24px', color: 'var(--text-secondary)', fontSize: 13, cursor: 'pointer', fontFamily: 'var(--mono)', letterSpacing: '.04em' }}
                >
                  Send another message
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} noValidate>
                {status === "error" && errorMsg && (
                  <div className="error-banner">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                      <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                    {errorMsg}
                  </div>
                )}

                <div className="form-row">
                  <div className="field">
                    <label htmlFor="name">Name<span className="req">*</span></label>
                    <input id="name" name="name" type="text" placeholder="Your full name" value={formData.name} onChange={handleChange} required autoComplete="name" />
                  </div>
                  <div className="field">
                    <label htmlFor="email">Email<span className="req">*</span></label>
                    <input id="email" name="email" type="email" placeholder="you@example.com" value={formData.email} onChange={handleChange} required autoComplete="email" />
                  </div>
                </div>

                <div className="form-row">
                  <div className="field">
                    <label htmlFor="phone">Phone (optional)</label>
                    <input id="phone" name="phone" type="tel" placeholder="+1 234 567 8900" value={formData.phone} onChange={handleChange} autoComplete="tel" />
                  </div>
                  <div className="field">
                    <label htmlFor="service">Service interested in</label>
                    <select id="service" name="service" value={formData.service} onChange={handleChange}>
                      <option value="">Select a service…</option>
                      <option value="Shopify Development">Shopify Development</option>
                      <option value="WordPress/WooCommerce">WordPress / WooCommerce</option>
                      <option value="Webflow">Webflow</option>
                      <option value="Speed Optimization">Speed Optimization</option>
                      <option value="Email Marketing (Klaviyo)">Email Marketing (Klaviyo)</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>

                <div className="field">
                  <label htmlFor="budget">Budget range</label>
                  <select id="budget" name="budget" value={formData.budget} onChange={handleChange}>
                    <option value="">Select a budget range…</option>
                    <option value="Under $500">Under $500</option>
                    <option value="$500–$1,000">$500 – $1,000</option>
                    <option value="$1,000–$3,000">$1,000 – $3,000</option>
                    <option value="$3,000+">$3,000+</option>
                    <option value="Let's discuss">Let&apos;s discuss</option>
                  </select>
                </div>

                <div className="field">
                  <label htmlFor="message">Project description<span className="req">*</span></label>
                  <textarea id="message" name="message" rows={5} placeholder="Tell me about your project — what you need, your timeline, any specific requirements…" value={formData.message} onChange={handleChange} required />
                </div>

                <button type="submit" className="submit-btn" disabled={status === "loading"}>
                  {status === "loading" ? (
                    <>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: "spin 1s linear infinite" }}>
                        <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                      </svg>
                      Sending…
                    </>
                  ) : (
                    "Send Message →"
                  )}
                </button>
              </form>
            )}
          </div>

          <div className="contact-sidebar">
            <div className="sidebar-card">
              <h3>Quick Contact</h3>
              <a href={`https://wa.me/${whatsappNumber}`} target="_blank" rel="noopener noreferrer" className="ci-item">
                <div className="ci-icon wa">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                  </svg>
                </div>
                <div>
                  <div className="ci-label">WhatsApp</div>
                  <div className="ci-value">{displayPhone}</div>
                </div>
              </a>
              <a href={`mailto:${contactEmail}`} className="ci-item">
                <div className="ci-icon em">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="2" y="4" width="20" height="16" rx="2" />
                    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                  </svg>
                </div>
                <div>
                  <div className="ci-label">Email</div>
                  <div className="ci-value">{contactEmail}</div>
                </div>
              </a>
            </div>

            <div className="response-note">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
              Typically responds within 24 hours
            </div>

            <div className="sidebar-card">
              <h3>What to expect</h3>
              <ul className="expect-list">
                <li>I&apos;ll review your project details within 24 hours</li>
                <li>A short discovery call to align on scope and goals</li>
                <li>A clear proposal with timeline and pricing</li>
                <li>Regular updates throughout the project</li>
                <li>Post-launch support included</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
