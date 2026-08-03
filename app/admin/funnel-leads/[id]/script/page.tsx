import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import type { CallScriptData } from '@/lib/scriptGenerator';
import CallScriptView from '@/app/components/audit/CallScriptView';

export const dynamic = 'force-dynamic';

export default async function CallScriptPrintPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const lead = await prisma.funnelLead.findUnique({ where: { id } });
  if (!lead || !lead.callScript) notFound();

  let script: CallScriptData;
  try {
    script = JSON.parse(lead.callScript);
  } catch {
    notFound();
  }

  return (
    <div style={{ maxWidth: 820, margin: '0 auto', padding: '40px 28px', fontFamily: "'Inter', -apple-system, sans-serif", background: '#fff', minHeight: '100vh' }}>
      <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 26, fontWeight: 700, marginBottom: 4, color: '#141821' }}>
        📞 Call Script — {lead.name}
      </h1>
      <p style={{ fontSize: 13, color: '#667', marginBottom: 28 }}>
        {lead.storeUrl} · {lead.revenue || '?'} · {lead.readiness || '?'} · {lead.email} · ⌘P to print
      </p>
      <CallScriptView script={script} />
    </div>
  );
}
