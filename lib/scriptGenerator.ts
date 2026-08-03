import { prisma } from './prisma';
import { askClaudeJson } from './claude';

export interface CallScriptData {
  leadSnapshot: string;
  hypotheses: string[];
  rapport: string[];
  frame: string;
  checkpoints: {
    id: string;
    name: string;
    objective: string;
    questions: string[];
    notes: string;
  }[];
  tempCheck: string[];
  pitch: {
    eaglesEye: string;
    steps: { title: string; talkTrack: string }[];
    price: string;
  };
  objectionPrep: { objection: string; response: string }[];
}

const SLOSHED_SYSTEM = `You are the sales-call preparation engine for Rachna Builds (Shopify Conversion Optimization, $1,299 done-for-you offer, 14-day delivery, 2%+ conversion promise).

You personalize the approved SLOSHED 2.0 sales script for a specific lead. The template flow (follow it EXACTLY — this structure is approved and mandatory):

Rapport → Frame → C1 SITUATION (isolate the challenge, chunk down to numbers, situation summary) → C2 PAIN EXTRACTION (time → logical pain → emotional pain) → C3 DOUBT INJECTION ("what stopped you solving this yourself" + 1-or-2 framework + do-you-have process questions) → C4 AUTHORITY (decision makers) → C5 EFFORT (what they've tried; "why now?" if nothing) → C6 CONSEQUENCES (12-month cost of inaction, summarized a/b/c) → C7 GOALS (flip the script, commitment question) → TEMP CHECK (1-10 scale, dig into the real objection BEFORE price) → PITCH: Eagle's Eye view → The Boat 3 steps (1. Conversion Audit — leaking bucket analogy, 2. Conversion Rebuild — beautiful store you can't buy from analogy, Figma prototype first, 3. Revenue Optimization — sale doesn't end at checkout) → Delivery summary → Price $1,299 USD.

Tonality: doctor giving a treatment plan, not a salesperson hoping they like it. Downward inflection on statements.

Personalization rules:
- Use the lead's actual name, store, revenue bracket, and their own words everywhere. Their application answers are GOLD — quote their blocker text back to them at the right moments (C2, C3).
- Pre-fill hypotheses: given their challenge + audit findings, predict their answers so Rachna can probe deeper fast.
- C3 do-you-have questions: pick the 4 they are most likely to answer "No" to, based on their situation.
- If audit findings exist, weave 2-3 specific findings into the Boat pitch steps ("when I looked at your store I noticed...").
- Objection prep: predict their 3 most likely objections from financial situation + readiness answers, with responses in the SLOSHED spirit.
- Keep every talk track conversational and speakable — short sentences, no corporate language.

Return ONLY valid JSON:
{
  "leadSnapshot": string (3 lines Rachna reads 60 seconds before the call),
  "hypotheses": [str] (3-4 predictions about their real problem),
  "rapport": [str] (2 openers, one referencing something specific about them),
  "frame": string (the frame-setting paragraph, personalized),
  "checkpoints": [{"id": "C1".."C7", "name": str, "objective": str, "questions": [str] (personalized, 3-6 each), "notes": str (what to listen for with THIS lead)}],
  "tempCheck": [str] (the temp check lines including the follow-ups),
  "pitch": {"eaglesEye": str (personalized paragraph), "steps": [{"title": str, "talkTrack": str (personalized, includes analogy)}], "price": str (the price reveal line)},
  "objectionPrep": [{"objection": str, "response": str}] (3 items)
}`;

export async function generateCallScript(leadId: string): Promise<CallScriptData> {
  const lead = await prisma.funnelLead.findUnique({
    where: { id: leadId },
    include: {
      auditReports: { orderBy: { createdAt: 'desc' }, take: 1 },
      bookings: { orderBy: { createdAt: 'desc' }, take: 1 },
    },
  });
  if (!lead) throw new Error('Lead not found');

  const audit = lead.auditReports[0];
  let auditSummary = 'No audit run yet.';
  if (audit && audit.status !== 'failed') {
    try {
      const r = JSON.parse(audit.reportJson);
      auditSummary = JSON.stringify({
        scores: r.scores,
        topIssues: (r.issues || []).slice(0, 5).map((i: AuditIssueLite) => ({ title: i.title, severity: i.severity, finding: i.finding })),
        quickWins: r.quickWins,
      }, null, 2);
    } catch { /* keep default */ }
  }

  const userPrompt = `Prepare the personalized SLOSHED call script for this lead.

LEAD APPLICATION:
- Name: ${lead.name}
- Email: ${lead.email}
- Store: ${lead.storeUrl || 'not given'}
- Role: ${lead.role || lead.profession || 'not given'}
- Stated challenge: ${lead.challenge || 'not stated'}
- Monthly revenue: ${lead.revenue || 'not stated'}
- Their own words on what's blocking conversions: "${lead.blocker || 'not stated'}"
- Financial situation: ${lead.financial || 'not stated'}
- Readiness: ${lead.readiness || 'not stated'}
- Source: ${lead.utmSource ? `${lead.utmSource} / ${lead.utmCampaign || ''}` : 'organic/direct'}
${lead.bookings[0] ? `- Call booked for: ${lead.bookings[0].startTime.toISOString()}` : ''}

AUDIT FINDINGS (from the automated store audit):
${auditSummary}`;

  const script = await askClaudeJson<CallScriptData>({
    system: SLOSHED_SYSTEM,
    user: userPrompt,
    maxTokens: 8000,
  });

  await prisma.funnelLead.update({
    where: { id: leadId },
    data: { callScript: JSON.stringify(script) },
  });

  return script;
}

interface AuditIssueLite { title: string; severity: string; finding: string }
