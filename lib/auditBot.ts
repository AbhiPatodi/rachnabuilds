import { prisma } from './prisma';
import { collectStoreData } from './storeAnalyzer';
import { askClaudeJson } from './claude';

export interface AuditIssue {
  title: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  category: 'performance' | 'trust' | 'ux' | 'seo' | 'revenue';
  finding: string;
  impact: string;
  fix: string;
}

export interface AuditReportData {
  storeName: string;
  summary: string;
  scores: { performance: number; trust: number; ux: number; seo: number; overall: number };
  issues: AuditIssue[];
  quickWins: string[];
  actionPlan: { phase: string; title: string; items: string[] }[];
  estimatedImpact: string;
}

const SYSTEM_PROMPT = `You are the audit engine for Rachna Builds, a Shopify Conversion Optimization specialist. You analyze e-commerce stores using the Conversion Bottleneck Framework: most founders think they have a traffic problem, but they usually have a conversion problem. Your job is to find every bottleneck stopping visitors from becoming customers.

Analysis dimensions:
1. PERFORMANCE — speed kills conversion. LCP > 2.5s loses sales. Mobile-first.
2. TRUST — reviews, guarantees, contact info, professional design signals.
3. UX — navigation clarity, product page completeness, mobile experience, checkout friction.
4. SEO — titles, meta descriptions, heading structure.
5. REVENUE SYSTEMS — cart recovery, email capture (Klaviyo etc.), upsell/cross-sell presence, analytics/pixel tracking.

Rules:
- Be specific to THIS store using the real data provided. Never generic filler.
- Every issue needs: what you found (evidence), why it costs revenue, and the concrete fix.
- Severity honestly: critical = actively losing significant sales today.
- Scores 0-100 per dimension, calibrated (a solid store scores 70-85; most underperforming stores 40-65).
- Tone: direct, expert, helpful — a specialist showing a founder what they can't see. No fluff, no scare tactics.
- If data is missing for a dimension, note it as "needs deeper audit on the call" rather than inventing findings.
- 6-12 issues total, ordered by severity. 3-5 quick wins. 3 action-plan phases matching: Conversion Diagnosis → Store Transformation → Revenue Optimization.

Return ONLY valid JSON matching this exact shape:
{
  "storeName": string,
  "summary": string (3-4 sentences, addressed to the founder by store name, leading with the single biggest bottleneck),
  "scores": {"performance": n, "trust": n, "ux": n, "seo": n, "overall": n},
  "issues": [{"title": str, "severity": "critical"|"high"|"medium"|"low", "category": "performance"|"trust"|"ux"|"seo"|"revenue", "finding": str, "impact": str, "fix": str}],
  "quickWins": [str],
  "actionPlan": [{"phase": "Phase 1"|"Phase 2"|"Phase 3", "title": str, "items": [str]}],
  "estimatedImpact": string (one honest sentence about realistic conversion improvement potential)
}`;

export async function generateAuditReport(auditId: string): Promise<void> {
  const audit = await prisma.auditReport.findUnique({
    where: { id: auditId },
    include: { funnelLead: true },
  });
  if (!audit) throw new Error('Audit not found');

  try {
    const storeData = await collectStoreData(audit.storeUrl);

    if (storeData.fetchFailed && !storeData.pageSpeed.mobile.performanceScore) {
      throw new Error('Could not reach the store URL — check it is publicly accessible');
    }

    const lead = audit.funnelLead;
    const userPrompt = `Analyze this store and produce the audit report JSON.

STORE DATA (collected automatically just now):
${JSON.stringify(storeData, null, 2)}

WHAT THE FOUNDER TOLD US IN THEIR APPLICATION:
- Name: ${lead.name}
- Their stated biggest challenge: ${lead.challenge || 'not stated'}
- Monthly revenue bracket: ${lead.revenue || 'not stated'}
- In their own words, what they think is blocking conversions: "${lead.blocker || 'not stated'}"

Weave their own concern into the analysis where the data supports or corrects it.`;

    const report = await askClaudeJson<AuditReportData>({
      system: SYSTEM_PROMPT,
      user: userPrompt,
      maxTokens: 8000,
    });

    await prisma.auditReport.update({
      where: { id: auditId },
      data: {
        status: 'draft',
        reportJson: JSON.stringify(report),
        rawData: JSON.stringify(storeData),
        error: null,
      },
    });
  } catch (err) {
    await prisma.auditReport.update({
      where: { id: auditId },
      data: { status: 'failed', error: err instanceof Error ? err.message : 'Unknown error' },
    });
    throw err;
  }
}
