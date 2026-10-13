// Shown instead of a Store Health Report that has been hidden in
// Admin → StoreProof. Same brand furniture as the report itself, so it reads
// as a deliberate state rather than a broken link.
import RequestAccess from './RequestAccess';

export default function RevokedReport({ token, storeName }: { token: string; storeName: string }) {
  return (
    <div className="rv-wrap">
      <style>{`
        html, body { background:#F6F8F7 !important; }
        .rv-wrap { min-height:100vh; background:#F6F8F7; color:#1D2939;
          font-family:'Helvetica Neue', Arial, sans-serif; font-size:15px; line-height:1.65;
          display:flex; align-items:center; justify-content:center; padding:40px 20px; }
        .rv-card { background:#fff; border:1px solid #E4E7EC; border-radius:20px;
          padding:36px 32px; max-width:520px; width:100%;
          box-shadow:0 12px 40px rgba(11,61,46,0.07); }
        .rv-brand { font-size:17px; font-weight:800; color:#0B3D2E; margin-bottom:28px; }
        .rv-brand span { color:#06D6A0; }
        .rv-h1 { font-size:23px; line-height:1.3; font-weight:800; color:#0B3D2E; margin:0 0 12px; }
        .rv-p { color:#475467; margin:0 0 14px; }
        .rv-store { background:#F6F8F7; border:1px solid #E4E7EC; border-radius:12px;
          padding:11px 14px; font-size:13.5px; color:#344054; margin:0 0 22px; }
        .rv-store b { color:#0B3D2E; }
        .ra-btn { display:block; width:100%; background:#0B3D2E; color:#fff; border:none;
          border-radius:12px; padding:14px 18px; font-size:15px; font-weight:800;
          cursor:pointer; font-family:inherit; }
        .ra-btn:disabled { opacity:.55; cursor:default; }
        .ra-form { display:flex; flex-direction:column; gap:6px; margin-top:4px; }
        .ra-form label { font-size:12.5px; font-weight:700; color:#0B3D2E; margin-top:8px; }
        .ra-form input, .ra-form textarea { width:100%; box-sizing:border-box;
          border:1px solid #D0D5DD; border-radius:10px; padding:11px 12px;
          font-size:16px; font-family:inherit; resize:vertical; }
        .ra-form .ra-btn { margin-top:16px; }
        .ra-done { background:#ECFDF3; border:1px solid #ABEFC6; color:#067647;
          border-radius:12px; padding:16px 18px; }
        .ra-done b { display:block; margin-bottom:4px; }
        .ra-done p { margin:0; font-size:14px; }
        .ra-err { color:#B42318; font-size:13.5px; margin:10px 0 0; }
        .ra-err a { color:#B42318; font-weight:700; }
        .rv-foot { margin-top:24px; padding-top:16px; border-top:1px solid #E4E7EC;
          font-size:12.5px; color:#667085; }
        .rv-foot a { color:#0B3D2E; font-weight:700; text-decoration:none; }
      `}</style>

      <div className="rv-card">
        <div className="rv-brand">Rachna Builds<span>.</span></div>

        <h1 className="rv-h1">This report isn&apos;t available at the moment</h1>
        <p className="rv-p">
          The store health report that was here has been taken down. That&apos;s nothing to worry
          about — reports are only kept open for a while, and this one has been closed.
        </p>
        <div className="rv-store">
          Report for <b>{storeName}</b>
        </div>
        <p className="rv-p">
          If you&apos;d still like to see it, just ask and Rachna will send it over.
        </p>

        <RequestAccess token={token} storeName={storeName} />

        <div className="rv-foot">
          Or email <a href="mailto:hello@rachnabuilds.com">hello@rachnabuilds.com</a> directly.
        </div>
      </div>
    </div>
  );
}
