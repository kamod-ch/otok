-- @kamod-ch/otok-kit-saas billing schema (SQLite / PostgreSQL TEXT ids)
-- Migration id: 20260814120000_saas_billing

CREATE TABLE IF NOT EXISTS saas_plans (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  stripe_price_id TEXT,
  active INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS saas_subscriptions (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL UNIQUE,
  plan_id TEXT NOT NULL REFERENCES saas_plans(id),
  status TEXT NOT NULL,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS saas_webhook_events (
  id TEXT PRIMARY KEY,
  processed_at TEXT NOT NULL
);
