// StoreProof → portal publish endpoint.
//
// The StoreProof engine (runs on the Mac) POSTs a finished Store Health Report
// here; the portal stores it, gates it behind client-portal auth, and tracks
// engagement. The publish script lives in storeproof/scripts/publish.ts.
//
// Auth: Bearer STOREPROOF_PUBLISH_SECRET (must live outside /api/admin —
// proxy.ts cookie-guards those paths).
//
// Idempotent on (host, runStamp): re-publishing the same run updates in place.
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

/** The report's built-in back-bar reveals itself on same-origin referrers —
 *  which every portal click is — and links to internal StoreProof paths.
 *  Strip the element AND its reveal script so the portal copy can never
 *  leak internal tooling, however it is opened. */
function sanitizeReportHtml(html: string): string {
  return html
    .replace(/<div class="appnav"[^>]*>[\s\S]*?<\/div>/, '')
    .replace(/<script>[\s\S]*?appnav[\s\S]*?<\/script>/, '');
}

export async function POST(req: NextRequest) {
  const auth = req.headers.get('authorization');
  if (!process.env.STOREPROOF_PUBLISH_SECRET || auth !== `Bearer ${process.env.STOREPROOF_PUBLISH_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: {
    host?: string;
    runStamp?: string;
    storeName?: string;
    clientEmail?: string;
    storeHealthHtml?: string;
    findings?: unknown;
    pdfBase64?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { host, runStamp, storeName, storeHealthHtml } = body;
  if (!host || !runStamp || !storeName || !storeHealthHtml) {
    return NextResponse.json(
      { error: 'host, runStamp, storeName and storeHealthHtml are required' },
      { status: 400 },
    );
  }
  if (storeHealthHtml.length > 500_000) {
    return NextResponse.json({ error: 'storeHealthHtml too large' }, { status: 413 });
  }

  const html = sanitizeReportHtml(storeHealthHtml);
  const findingsJson = JSON.stringify(body.findings ?? {});
  const pdfData = body.pdfBase64 ? Buffer.from(body.pdfBase64, 'base64') : undefined;

  // Link to the CRM lead when the merchant is already in the funnel
  const email = body.clientEmail?.trim().toLowerCase();
  const funnelLead = email
    ? await prisma.funnelLead.findUnique({ where: { email }, select: { id: true } })
    : null;

  const report = await prisma.storeProofReport.upsert({
    where: { host_runStamp: { host, runStamp } },
    create: {
      host,
      runStamp,
      storeName,
      html,
      findingsJson,
      ...(pdfData ? { pdfData } : {}),
      ...(funnelLead ? { funnelLeadId: funnelLead.id } : {}),
    },
    update: {
      storeName,
      html,
      findingsJson,
      ...(pdfData ? { pdfData } : {}),
      ...(funnelLead ? { funnelLeadId: funnelLead.id } : {}),
    },
  });

  return NextResponse.json({
    ok: true,
    id: report.id,
    host: report.host,
    runStamp: report.runStamp,
    assigned: !!report.clientId,
    linkedFunnelLead: !!report.funnelLeadId,
  });
}
