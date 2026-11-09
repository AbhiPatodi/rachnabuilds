-- Team members (logins besides the owner password), lead assignment,
-- custom sub-stages, and per-member push devices.
-- IF NOT EXISTS because it was applied directly to Neon when it shipped.
CREATE TABLE IF NOT EXISTS "team_members" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'rep',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "receivesLeads" BOOLEAN NOT NULL DEFAULT true,
    "lastAssignedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "team_members_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "team_members_email_key" ON "team_members"("email");
ALTER TABLE "funnel_leads" ADD COLUMN IF NOT EXISTS "subStatus" TEXT;
ALTER TABLE "funnel_leads" ADD COLUMN IF NOT EXISTS "assignedToId" TEXT;
CREATE INDEX IF NOT EXISTS "funnel_leads_assignedToId_idx" ON "funnel_leads"("assignedToId");
DO $$ BEGIN
  ALTER TABLE "funnel_leads" ADD CONSTRAINT "funnel_leads_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "team_members"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
ALTER TABLE "push_subscriptions" ADD COLUMN IF NOT EXISTS "memberId" TEXT;
DO $$ BEGIN
  ALTER TABLE "push_subscriptions" ADD CONSTRAINT "push_subscriptions_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "team_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
