export default function ThankYouPage() {
  return (
    <>
      <div className="fn-hero">
        <div className="fn-hero-inner">
          <div className="fn-callout">Application Received</div>

          <h1 className="fn-h1">
            Congratulations! <br />
            Your Application Is <em>Being Reviewed.</em>
          </h1>

          <p className="fn-sub">Here&apos;s what happens next:</p>
        </div>
      </div>

      <div className="fn-body fn-body-raised">
      <div className="fn-card fn-card-wide" style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 28 }}>
        <img
          src="/training/rachna-headshot.jpg"
          alt="Rachna, Shopify Conversion Optimization Specialist"
          style={{ width: 76, height: 76, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, border: '2px solid rgba(16,185,129,.3)' }}
        />
        <p style={{ margin: 0, fontSize: 14.5, lineHeight: 1.6, color: 'rgba(10,31,19,.75)' }}>
          &ldquo;I personally review every application myself — no sales team, no gatekeepers.
          I&apos;ll come to our call already familiar with your store.&rdquo;
          <br />
          <strong style={{ color: '#0A1F13' }}>— Rachna</strong>, Shopify Conversion Optimization Specialist
        </p>
      </div>
      <div className="fn-steps" style={{ marginTop: 0 }}>
        <div className="fn-step">
          <h3>1. Confirmation Email</h3>
          <p>
            You&apos;ll receive a confirmation email with your strategy session details shortly.
            Please check your inbox and save the event.
          </p>
        </div>
        <div className="fn-step">
          <h3>2. Meeting Link</h3>
          <p>Your session will be held virtually. Ensure your setup is ready.</p>
        </div>
        <div className="fn-step">
          <h3>3. Before We Meet</h3>
          <ul>
            <li>Join from a quiet, distraction-free location.</li>
            <li>Be on time — this is a high-value strategy session.</li>
            <li>Have access to your Shopify store analytics if possible.</li>
            <li>Be ready to discuss your current marketing and conversion challenges openly.</li>
          </ul>
        </div>
      </div>
      </div>
    </>
  );
}
