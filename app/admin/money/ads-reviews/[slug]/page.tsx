import Link from 'next/link';
import { notFound } from 'next/navigation';
import { readAdminReport } from '@/lib/adminReports';

export const dynamic = 'force-dynamic';

export default async function AdsReviewPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const html = readAdminReport(slug);
  if (!html) notFound();
  const title = /<title>([^<]+)<\/title>/i.exec(html)?.[1]?.trim() || slug;
  // The report carries its own styles, so it renders in an isolated frame
  // rather than inheriting the admin theme.
  const doc = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><style>body{margin:0}</style></head><body>${html}</body></html>`;
  return (
    <div className="admin-content" style={{ display: 'flex', flexDirection: 'column', gap: 12, height: 'calc(100vh - 32px)' }}>
      <div className="admin-page-header" style={{ marginBottom: 0 }}>
        <div>
          <h1>{title}</h1>
          <p><Link href="/admin/money/ads-reviews">← All ads reviews</Link></p>
        </div>
      </div>
      <iframe title={title} srcDoc={doc} style={{ flex: 1, width: '100%', minHeight: 600, border: '1px solid var(--border, #1E2736)', borderRadius: 12, background: '#F6F7F5' }} />
    </div>
  );
}
