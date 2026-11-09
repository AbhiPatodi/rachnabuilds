-- Follow-up date, last touch and speed-to-lead alarm counter on funnel leads.
-- IF NOT EXISTS because it was applied directly to Neon when it shipped.
ALTER TABLE "funnel_leads" ADD COLUMN IF NOT EXISTS "nextFollowUpAt" TIMESTAMP(3);
ALTER TABLE "funnel_leads" ADD COLUMN IF NOT EXISTS "lastTouchAt" TIMESTAMP(3);
ALTER TABLE "funnel_leads" ADD COLUMN IF NOT EXISTS "speedAlarms" INTEGER NOT NULL DEFAULT 0;
CREATE INDEX IF NOT EXISTS "funnel_leads_nextFollowUpAt_idx" ON "funnel_leads"("nextFollowUpAt");
