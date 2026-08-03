-- @otok/kit-crm initial schema (PostgreSQL-compatible; SQLite uses TEXT)
-- Migration id: 20260803120000_crm_initial

CREATE TABLE IF NOT EXISTS otok_migrations (
  name TEXT PRIMARY KEY,
  applied_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS crm_organizations (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  uid TEXT,
  locale TEXT NOT NULL DEFAULT 'de',
  timezone TEXT NOT NULL DEFAULT 'Europe/Zurich',
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS crm_roles (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL REFERENCES crm_organizations(id),
  name TEXT NOT NULL,
  permissions TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS crm_users (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL REFERENCES crm_organizations(id),
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  role_id TEXT NOT NULL REFERENCES crm_roles(id),
  locale TEXT NOT NULL DEFAULT 'de',
  active INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS crm_pipelines (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  name TEXT NOT NULL,
  stages TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS crm_companies (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  name TEXT NOT NULL,
  uid TEXT,
  legal_form TEXT,
  canton TEXT,
  city TEXT,
  industry TEXT,
  website TEXT,
  pipeline_id TEXT,
  stage_id TEXT,
  owner_id TEXT,
  tag_ids TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_crm_companies_org ON crm_companies(org_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_crm_companies_uid ON crm_companies(org_id, uid);

CREATE TABLE IF NOT EXISTS crm_contacts (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  company_id TEXT,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  title TEXT,
  language TEXT NOT NULL DEFAULT 'de'
);

CREATE TABLE IF NOT EXISTS crm_activities (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  company_id TEXT NOT NULL,
  contact_id TEXT,
  type TEXT NOT NULL,
  subject TEXT NOT NULL,
  body TEXT,
  occurred_at TEXT NOT NULL,
  user_id TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS crm_notes (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  body TEXT NOT NULL,
  author_id TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS crm_tasks (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  title TEXT NOT NULL,
  due_at TEXT,
  assignee_id TEXT,
  status TEXT NOT NULL DEFAULT 'open',
  related_type TEXT,
  related_id TEXT
);

CREATE TABLE IF NOT EXISTS crm_tags (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  name TEXT NOT NULL,
  color TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS crm_saved_filters (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  name TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  query TEXT NOT NULL,
  user_id TEXT NOT NULL
);
