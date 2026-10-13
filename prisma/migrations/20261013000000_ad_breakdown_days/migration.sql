-- Per-day Meta spend split by one dimension (region / platform / age+gender).
-- IF NOT EXISTS because the table was created directly against the database
-- when the Meta Ads report shipped; this file keeps the migration history honest.
CREATE TABLE IF NOT EXISTS "ad_breakdown_days" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "dimension" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "spend" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "impressions" INTEGER NOT NULL DEFAULT 0,
    "reach" INTEGER NOT NULL DEFAULT 0,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "leads" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ad_breakdown_days_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ad_breakdown_days_accountId_date_dimension_key_key" ON "ad_breakdown_days"("accountId", "date", "dimension", "key");
CREATE INDEX IF NOT EXISTS "ad_breakdown_days_accountId_dimension_date_idx" ON "ad_breakdown_days"("accountId", "dimension", "date");
