// Shared shell for the legal pages (/privacy, /terms).
export default function LegalPage({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: React.ReactNode;
}) {
  return (
    <div className="legal-page">
      <style>{`
        .legal-page{min-height:100vh;background:var(--bg);padding:120px 0 100px}
        .legal-wrap{max-width:760px;margin:0 auto;padding:0 clamp(20px,4vw,48px)}
        .legal-wrap h1{font-family:var(--heading);font-size:clamp(32px,5vw,48px);font-weight:800;
          letter-spacing:-.02em;line-height:1.1;color:var(--text);margin:0 0 12px}
        .legal-updated{font-size:14px;color:var(--text-muted);margin:0 0 48px}
        .legal-wrap h2{font-family:var(--heading);font-size:clamp(19px,2.4vw,23px);font-weight:700;
          color:var(--text);margin:44px 0 14px;letter-spacing:-.01em}
        .legal-wrap p{font-size:16px;line-height:1.7;color:var(--text-secondary);margin:0 0 16px}
        .legal-wrap ul{margin:0 0 16px;padding-left:22px}
        .legal-wrap li{font-size:16px;line-height:1.7;color:var(--text-secondary);margin-bottom:8px}
        .legal-wrap a{color:var(--accent);text-decoration:none}
        .legal-wrap a:hover{text-decoration:underline}
        .legal-wrap strong{color:var(--text)}
      `}</style>
      <div className="legal-wrap">
        <h1>{title}</h1>
        <p className="legal-updated">Last updated: {updated}</p>
        {children}
      </div>
    </div>
  );
}
