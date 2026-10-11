export const USAGE_TABLE = "ai_budget_usage";
export const RESERVATIONS_TABLE = "ai_budget_reservations";

export type AiBudgetDialect = "sqlite" | "postgres";

export interface AiBudgetDatabase {
  [USAGE_TABLE]: {
    id: string;
    period_start: string;
    period_end: string;
    org_id: string;
    user_id: string;
    tokens_used: number;
    tokens_reserved: number;
    cost_micro_usd_used: string | number;
    cost_micro_usd_reserved: string | number;
    updated_at: string;
  };
  [RESERVATIONS_TABLE]: {
    request_id: string;
    period_start: string;
    org_id: string;
    user_id: string;
    estimated_tokens: number;
    estimated_cost_micro_usd: string | number;
    status: string;
    expires_at: string;
    settled_at: string | null;
    usage_json: string | null;
  };
}

export const SQLITE_MIGRATION = `
CREATE TABLE IF NOT EXISTS ${USAGE_TABLE} (
  id TEXT PRIMARY KEY,
  period_start TEXT NOT NULL,
  period_end TEXT NOT NULL,
  org_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  tokens_used INTEGER NOT NULL DEFAULT 0,
  tokens_reserved INTEGER NOT NULL DEFAULT 0,
  cost_micro_usd_used TEXT NOT NULL DEFAULT '0',
  cost_micro_usd_reserved TEXT NOT NULL DEFAULT '0',
  updated_at TEXT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_ai_budget_usage_period ON ${USAGE_TABLE}(period_start, org_id, user_id);

CREATE TABLE IF NOT EXISTS ${RESERVATIONS_TABLE} (
  request_id TEXT PRIMARY KEY,
  period_start TEXT NOT NULL,
  org_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  estimated_tokens INTEGER NOT NULL,
  estimated_cost_micro_usd TEXT NOT NULL,
  status TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  settled_at TEXT,
  usage_json TEXT
);
CREATE INDEX IF NOT EXISTS idx_ai_budget_res_expires ON ${RESERVATIONS_TABLE}(expires_at, status);
`;

export const POSTGRES_MIGRATION = `
CREATE TABLE IF NOT EXISTS ${USAGE_TABLE} (
  id TEXT PRIMARY KEY,
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  org_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  tokens_used BIGINT NOT NULL DEFAULT 0,
  tokens_reserved BIGINT NOT NULL DEFAULT 0,
  cost_micro_usd_used NUMERIC(20,0) NOT NULL DEFAULT 0,
  cost_micro_usd_reserved NUMERIC(20,0) NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_ai_budget_usage_period ON ${USAGE_TABLE}(period_start, org_id, user_id);

CREATE TABLE IF NOT EXISTS ${RESERVATIONS_TABLE} (
  request_id TEXT PRIMARY KEY,
  period_start TIMESTAMPTZ NOT NULL,
  org_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  estimated_tokens BIGINT NOT NULL,
  estimated_cost_micro_usd NUMERIC(20,0) NOT NULL,
  status TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  settled_at TIMESTAMPTZ,
  usage_json JSONB
);
CREATE INDEX IF NOT EXISTS idx_ai_budget_res_expires ON ${RESERVATIONS_TABLE}(expires_at) WHERE status = 'held';
`;
