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
