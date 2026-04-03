-- ============================================================
-- Rachna Builds — New Client Portal Schema Migration
-- Generated: 2026-04-03
-- ============================================================
-- SAFE: Old tables (reports, report_sections, client_documents,
--       portal_comments, portal_events, portal_sessions) are
--       NOT dropped. Run this once against the Neon production DB.
-- ============================================================

-- ─── 1. CREATE NEW TABLES ────────────────────────────────────

CREATE TABLE IF NOT EXISTS clients (
  id              TEXT        PRIMARY KEY,
  name            TEXT        NOT NULL,
  email           TEXT,
  phone           TEXT,
  slug            TEXT        NOT NULL UNIQUE,
  "passwordHash"  TEXT        NOT NULL,
  "passwordPlain" TEXT,
  "isActive"      BOOLEAN     NOT NULL DEFAULT TRUE,
  "clientProfile" JSONB       NOT NULL DEFAULT '{}',
  "createdAt"     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS client_projects (
  id             TEXT        PRIMARY KEY,
  "clientId"     TEXT        NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  name           TEXT        NOT NULL,
  "clientType"   TEXT        NOT NULL DEFAULT 'new_build',
  status         TEXT        NOT NULL DEFAULT 'active',
  "tabConfig"    JSONB,
  "adminProfile" JSONB       NOT NULL DEFAULT '{}',
  "displayOrder" INTEGER     NOT NULL DEFAULT 0,
  "createdAt"    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS project_sections (
  id             TEXT        PRIMARY KEY,
  "projectId"    TEXT        NOT NULL REFERENCES client_projects(id) ON DELETE CASCADE,
  "sectionType"  TEXT        NOT NULL,
  title          TEXT        NOT NULL,
  content        JSONB       NOT NULL DEFAULT '{}',
  "displayOrder" INTEGER     NOT NULL DEFAULT 0,
  "createdAt"    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS project_documents (
  id           TEXT        PRIMARY KEY,
  "projectId"  TEXT        NOT NULL REFERENCES client_projects(id) ON DELETE CASCADE,
  "docType"    TEXT        NOT NULL,
  title        TEXT        NOT NULL,
  url          TEXT        NOT NULL,
  notes        TEXT,
  "uploadedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS project_comments (
  id          TEXT        PRIMARY KEY,
  "projectId" TEXT        NOT NULL REFERENCES client_projects(id) ON DELETE CASCADE,
  context     TEXT        NOT NULL DEFAULT 'general',
  author      TEXT        NOT NULL,
  text        TEXT        NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS project_events (
  id          TEXT        PRIMARY KEY,
  "projectId" TEXT        NOT NULL REFERENCES client_projects(id) ON DELETE CASCADE,
  "eventType" TEXT        NOT NULL,
  meta        JSONB       NOT NULL DEFAULT '{}',
  "sessionId" TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS project_sessions (
  id              TEXT        PRIMARY KEY,
  "projectId"     TEXT        NOT NULL REFERENCES client_projects(id) ON DELETE CASCADE,
  "sessionId"     TEXT        NOT NULL UNIQUE,
  ip              TEXT,
  country         TEXT,
  "countryCode"   TEXT,
  city            TEXT,
  device          TEXT,
  browser         TEXT,
  "totalDuration" INTEGER     NOT NULL DEFAULT 0,
  "startedAt"     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "lastActiveAt"  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── 2. MIGRATE EXISTING DATA ────────────────────────────────
-- Uses CTEs to insert Clients + ClientProjects from old reports,
-- then maps old reportId → new projectId for child rows.

-- Step 2a: Insert Clients (one per old report row)
INSERT INTO clients (
  id, name, email, slug, "passwordHash", "passwordPlain",
  "isActive", "clientProfile", "createdAt", "updatedAt"
)
SELECT
  -- Derive a stable client id from the report id (prefix avoids collisions)
  'cl_' || id                       AS id,
  "clientName"                      AS name,
  "clientEmail"                     AS email,
  -- Map slug: strip '-YYYY' suffix to get a clean client slug
  CASE slug
    WHEN 'sage-and-veda-2026'   THEN 'sage-and-veda'
    WHEN 'kruti-shopify-2026'   THEN 'kruti-lunawat'
    ELSE slug
  END                               AS slug,
  "passwordHash",
  "clientPasswordPlain"             AS "passwordPlain",
  "isActive",
  COALESCE("clientProfile", '{}')   AS "clientProfile",
  "createdAt",
  "updatedAt"
FROM reports
ON CONFLICT (slug) DO NOTHING;

-- Step 2b: Insert ClientProjects (one per old report row)
INSERT INTO client_projects (
  id, "clientId", name, "clientType", status,
  "adminProfile", "displayOrder", "createdAt", "updatedAt"
)
SELECT
  -- Derive a stable project id from the report id
  'cp_' || r.id                     AS id,
  'cl_' || r.id                     AS "clientId",
  CASE r.slug
    WHEN 'sage-and-veda-2026'   THEN 'Shopify Audit & Optimisation'
    WHEN 'kruti-shopify-2026'   THEN 'Shopify Store Build — Phase 1'
    ELSE r."clientName" || ' — Project'
  END                               AS name,
  CASE r.slug
    WHEN 'sage-and-veda-2026'   THEN 'existing_optimisation'
    WHEN 'kruti-shopify-2026'   THEN 'new_build'
    ELSE 'new_build'
  END                               AS "clientType",
  'active'                          AS status,
  COALESCE(r."adminProfile", '{}')  AS "adminProfile",
  0                                 AS "displayOrder",
  r."createdAt",
  r."updatedAt"
FROM reports r
ON CONFLICT DO NOTHING;

-- Step 2c: Migrate report_sections → project_sections
INSERT INTO project_sections (
  id, "projectId", "sectionType", title, content, "displayOrder", "createdAt"
)
SELECT
  rs.id,
  'cp_' || rs."reportId"           AS "projectId",
  rs."sectionType",
  rs.title,
  COALESCE(rs.content, '{}')        AS content,
  rs."displayOrder",
  rs."createdAt"
FROM report_sections rs
WHERE EXISTS (SELECT 1 FROM client_projects cp WHERE cp.id = 'cp_' || rs."reportId")
ON CONFLICT DO NOTHING;

-- Step 2d: Migrate client_documents → project_documents
INSERT INTO project_documents (
  id, "projectId", "docType", title, url, notes, "uploadedAt"
)
SELECT
  cd.id,
  'cp_' || cd."reportId"           AS "projectId",
  cd."docType",
  cd.title,
  cd.url,
  cd.notes,
  cd."uploadedAt"
FROM client_documents cd
WHERE EXISTS (SELECT 1 FROM client_projects cp WHERE cp.id = 'cp_' || cd."reportId")
ON CONFLICT DO NOTHING;

-- Step 2e: Migrate portal_comments → project_comments
INSERT INTO project_comments (
  id, "projectId", context, author, text, "createdAt"
)
SELECT
  pc.id,
  'cp_' || pc."reportId"           AS "projectId",
  pc.context,
  pc.author,
  pc.text,
  pc."createdAt"
FROM portal_comments pc
WHERE EXISTS (SELECT 1 FROM client_projects cp WHERE cp.id = 'cp_' || pc."reportId")
ON CONFLICT DO NOTHING;

-- Step 2f: Migrate portal_events → project_events
INSERT INTO project_events (
  id, "projectId", "eventType", meta, "sessionId", "createdAt"
)
SELECT
  pe.id,
  'cp_' || pe."reportId"           AS "projectId",
  pe."eventType",
  COALESCE(pe.meta, '{}')           AS meta,
  pe."sessionId",
  pe."createdAt"
FROM portal_events pe
WHERE EXISTS (SELECT 1 FROM client_projects cp WHERE cp.id = 'cp_' || pe."reportId")
ON CONFLICT DO NOTHING;

-- Step 2g: Migrate portal_sessions → project_sessions
INSERT INTO project_sessions (
  id, "projectId", "sessionId", ip, country, "countryCode",
  city, device, browser, "totalDuration", "startedAt", "lastActiveAt"
)
SELECT
  ps.id,
  'cp_' || ps."reportId"           AS "projectId",
  ps."sessionId",
  ps.ip,
  ps.country,
  ps."countryCode",
  ps.city,
  ps.device,
  ps.browser,
  ps."totalDuration",
  ps."startedAt",
  ps."lastActiveAt"
FROM portal_sessions ps
WHERE EXISTS (SELECT 1 FROM client_projects cp WHERE cp.id = 'cp_' || ps."reportId")
ON CONFLICT DO NOTHING;

-- ─── 3. VERIFICATION QUERIES ─────────────────────────────────
-- Run these after migration to confirm row counts:
--
-- SELECT 'clients'          AS tbl, COUNT(*) FROM clients;
-- SELECT 'client_projects'  AS tbl, COUNT(*) FROM client_projects;
-- SELECT 'project_sections' AS tbl, COUNT(*) FROM project_sections;
-- SELECT 'project_documents'AS tbl, COUNT(*) FROM project_documents;
-- SELECT 'project_comments' AS tbl, COUNT(*) FROM project_comments;
-- SELECT 'project_events'   AS tbl, COUNT(*) FROM project_events;
-- SELECT 'project_sessions' AS tbl, COUNT(*) FROM project_sessions;
-- ─────────────────────────────────────────────────────────────
