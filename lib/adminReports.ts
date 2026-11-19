// Internal HTML reports (ads reviews, lead-funnel updates) kept in /admin-reports
// and shown inside the admin at /admin/money/ads-reviews. Files are read at
// request time so a new report is just a new file + deploy.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const DIR = join(process.cwd(), 'admin-reports');

export interface AdminReportMeta { slug: string; title: string; date: string; bytes: number }

export function listAdminReports(): AdminReportMeta[] {
  let files: string[] = [];
  try { files = readdirSync(DIR).filter((f) => f.endsWith('.html')); } catch { return []; }
  return files.map((f) => {
    const slug = f.replace(/\.html$/, '');
    const html = readFileSync(join(DIR, f), 'utf8');
    const title = /<title>([^<]+)<\/title>/i.exec(html)?.[1]?.trim() || slug;
    const date = /^(\d{4}-\d{2}-\d{2})/.exec(slug)?.[1] || new Date(statSync(join(DIR, f)).mtimeMs).toISOString().slice(0, 10);
    return { slug, title, date, bytes: html.length };
  }).sort((a, b) => (a.date < b.date ? 1 : -1));
}

export function readAdminReport(slug: string): string | null {
  if (!/^[a-z0-9-]+$/i.test(slug)) return null;
  try { return readFileSync(join(DIR, `${slug}.html`), 'utf8'); } catch { return null; }
}
