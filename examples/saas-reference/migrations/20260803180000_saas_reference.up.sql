-- Otok SaaS reference schema (PostgreSQL)
-- Migration id: 20260803180000_saas_reference

CREATE TABLE IF NOT EXISTS otok_migrations (
  name TEXT PRIMARY KEY,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS app_user (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  name TEXT,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS app_session (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id TEXT NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  user_agent TEXT,
  ip_address TEXT,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS app_session_token_hash_idx ON app_session (token_hash);
CREATE INDEX IF NOT EXISTS app_session_user_id_idx ON app_session (user_id);

CREATE TABLE IF NOT EXISTS oauth_account (
  id TEXT PRIMARY KEY,
  provider TEXT NOT NULL,
  provider_account_id TEXT NOT NULL,
  user_id TEXT NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (provider, provider_account_id)
);

CREATE TABLE IF NOT EXISTS organization (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  owner_id TEXT NOT NULL REFERENCES app_user(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS org_member (
  org_id TEXT NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'member')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (org_id, user_id)
);

CREATE INDEX IF NOT EXISTS org_member_user_idx ON org_member (user_id);

CREATE TABLE IF NOT EXISTS invitation (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'member')),
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  accepted_at TIMESTAMPTZ,
  invited_by TEXT NOT NULL REFERENCES app_user(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS invitation_org_email_idx ON invitation (org_id, email);

CREATE TABLE IF NOT EXISTS billing_record (
  workspace_id TEXT PRIMARY KEY REFERENCES organization(id) ON DELETE CASCADE,
  plan TEXT NOT NULL CHECK (plan IN ('free', 'pro', 'team')),
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS stripe_event (
  event_id TEXT PRIMARY KEY,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS audit_log (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  actor_id TEXT NOT NULL,
  actor TEXT NOT NULL,
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id TEXT NOT NULL,
  resource_name TEXT,
  changes TEXT,
  occurred_at TIMESTAMPTZ NOT NULL,
  request_id TEXT,
  correlation_id TEXT,
  metadata TEXT
);

CREATE INDEX IF NOT EXISTS idx_audit_tenant_time ON audit_log(tenant_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_tenant_action ON audit_log(tenant_id, action);
