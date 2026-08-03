-- @otok/kit-crm extended schema (PostgreSQL)
-- Migration id: 20260803140000_crm_extended

ALTER TABLE crm_companies ADD COLUMN IF NOT EXISTS street TEXT;
ALTER TABLE crm_companies ADD COLUMN IF NOT EXISTS postal_code TEXT;
ALTER TABLE crm_companies ADD COLUMN IF NOT EXISTS municipality_code TEXT;
ALTER TABLE crm_companies ADD COLUMN IF NOT EXISTS source TEXT;
ALTER TABLE crm_companies ADD COLUMN IF NOT EXISTS external_id TEXT;

CREATE INDEX IF NOT EXISTS idx_crm_companies_external ON crm_companies(org_id, external_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_crm_companies_uid_unique ON crm_companies(org_id, uid) WHERE uid IS NOT NULL;

CREATE TABLE IF NOT EXISTS crm_sources (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  name TEXT NOT NULL,
  slug TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS crm_websites (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  company_id TEXT NOT NULL,
  url TEXT NOT NULL,
  is_primary INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS crm_career_areas (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  company_id TEXT NOT NULL,
  name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS crm_contact_requests (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  company_id TEXT,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  message TEXT,
  source_id TEXT,
  status TEXT NOT NULL DEFAULT 'new',
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS crm_audit_log (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id TEXT NOT NULL,
  user_id TEXT,
  payload TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_crm_audit_org ON crm_audit_log(org_id, created_at DESC);
