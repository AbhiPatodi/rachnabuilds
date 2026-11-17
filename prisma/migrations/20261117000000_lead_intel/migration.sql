-- Everything we learn about a lead (Meta details, phone area → state/time zone,
-- email type, device + location from link visits). Applied directly to Neon.
ALTER TABLE "funnel_leads" ADD COLUMN IF NOT EXISTS "leadIntel" JSONB;
