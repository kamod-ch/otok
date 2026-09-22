CREATE TABLE IF NOT EXISTS otok_queue_jobs (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  payload JSONB NOT NULL,
  status TEXT NOT NULL,
  attempts INT NOT NULL DEFAULT 0,
  max_attempts INT NOT NULL DEFAULT 5,
  idempotency_scope TEXT,
  idempotency_key TEXT,
  created_at TIMESTAMPTZ NOT NULL,
  available_at TIMESTAMPTZ NOT NULL,
  lease_owner TEXT,
  lease_token UUID,
  lease_until TIMESTAMPTZ,
  last_error TEXT
);

CREATE INDEX IF NOT EXISTS otok_queue_jobs_claim_idx
  ON otok_queue_jobs (available_at)
  WHERE status = 'pending';

CREATE UNIQUE INDEX IF NOT EXISTS otok_queue_jobs_dedupe_idx
  ON otok_queue_jobs (idempotency_scope, idempotency_key)
  WHERE idempotency_key IS NOT NULL AND status IN ('pending', 'processing');

CREATE TABLE IF NOT EXISTS otok_queue_dead_letter (
  id UUID PRIMARY KEY,
  job_id UUID NOT NULL,
  name TEXT NOT NULL,
  payload JSONB NOT NULL,
  attempts INT NOT NULL,
  error TEXT NOT NULL,
  failed_at TIMESTAMPTZ NOT NULL,
  retain_until TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS otok_queue_cron_dedupe (
  schedule_name TEXT NOT NULL,
  fire_at_utc TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (schedule_name, fire_at_utc)
);

CREATE TABLE IF NOT EXISTS otok_idempotency_records (
  storage_key TEXT PRIMARY KEY,
  fingerprint TEXT NOT NULL,
  state TEXT NOT NULL,
  response_body BYTEA,
  response_meta JSONB,
  expires_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS otok_idempotency_records_expires_idx
  ON otok_idempotency_records (expires_at);
