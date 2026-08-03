import type { OutboxStatus } from "../types.js";

export const OUTBOX_TABLE = "domain_events_outbox";
export const PROCESSED_TABLE = "domain_events_processed";
export const DEAD_LETTER_TABLE = "domain_events_dead_letter";

export interface OutboxInsertInput {
  id: string;
  eventName: string;
  eventVersion: number;
  payload: unknown;
  metadata: import("../types.js").EventMetadata;
  availableAt: string;
  createdAt: string;
  idempotencyKey?: string;
}

export function serializeOutboxPayload(payload: unknown): string {
  return JSON.stringify(payload);
}

export function parseOutboxPayload(raw: string): unknown {
  return JSON.parse(raw) as unknown;
}

export function serializeOutboxMetadata(metadata: import("../types.js").EventMetadata): string {
  return JSON.stringify(metadata);
}

export function parseOutboxMetadata(raw: string): import("../types.js").EventMetadata {
  return JSON.parse(raw) as import("../types.js").EventMetadata;
}

export function toOutboxRecord(row: {
  id: string;
  event_name: string;
  event_version: number;
  payload: string;
  metadata: string;
  status: OutboxStatus;
  attempts: number;
  available_at: string;
  created_at: string;
  processed_at: string | null;
  last_error: string | null;
  idempotency_key: string | null;
}): import("../types.js").OutboxRecord {
  return {
    id: row.id,
    eventName: row.event_name,
    eventVersion: row.event_version,
    payload: parseOutboxPayload(row.payload),
    metadata: parseOutboxMetadata(row.metadata),
    status: row.status,
    attempts: row.attempts,
    availableAt: row.available_at,
    createdAt: row.created_at,
    processedAt: row.processed_at ?? undefined,
    lastError: row.last_error ?? undefined,
    idempotencyKey: row.idempotency_key ?? undefined,
  };
}

export interface EventsDatabase {
  [OUTBOX_TABLE]: {
    id: string;
    event_name: string;
    event_version: number;
    payload: string;
    metadata: string;
    status: string;
    attempts: number;
    available_at: string;
    created_at: string;
    processed_at: string | null;
    last_error: string | null;
    idempotency_key: string | null;
  };
  [PROCESSED_TABLE]: {
    consumer_name: string;
    idempotency_key: string;
    processed_at: string;
  };
  [DEAD_LETTER_TABLE]: {
    id: string;
    event_name: string;
    event_version: number;
    payload: string;
    metadata: string;
    error: string;
    failed_at: string;
    attempts: number;
  };
}

export type EventsDialect = "sqlite" | "postgres";

export const SQLITE_MIGRATION = `
CREATE TABLE IF NOT EXISTS ${OUTBOX_TABLE} (
  id TEXT PRIMARY KEY,
  event_name TEXT NOT NULL,
  event_version INTEGER NOT NULL,
  payload TEXT NOT NULL,
  metadata TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  attempts INTEGER NOT NULL DEFAULT 0,
  available_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  processed_at TEXT,
  last_error TEXT,
  idempotency_key TEXT UNIQUE
);
CREATE INDEX IF NOT EXISTS idx_outbox_pending ON ${OUTBOX_TABLE}(status, available_at);

CREATE TABLE IF NOT EXISTS ${PROCESSED_TABLE} (
  consumer_name TEXT NOT NULL,
  idempotency_key TEXT NOT NULL,
  processed_at TEXT NOT NULL,
  PRIMARY KEY (consumer_name, idempotency_key)
);

CREATE TABLE IF NOT EXISTS ${DEAD_LETTER_TABLE} (
  id TEXT PRIMARY KEY,
  event_name TEXT NOT NULL,
  event_version INTEGER NOT NULL,
  payload TEXT NOT NULL,
  metadata TEXT NOT NULL,
  error TEXT NOT NULL,
  failed_at TEXT NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0
);
`;

export const POSTGRES_MIGRATION = `
CREATE TABLE IF NOT EXISTS ${OUTBOX_TABLE} (
  id TEXT PRIMARY KEY,
  event_name TEXT NOT NULL,
  event_version INTEGER NOT NULL,
  payload JSONB NOT NULL,
  metadata JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  attempts INTEGER NOT NULL DEFAULT 0,
  available_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  processed_at TIMESTAMPTZ,
  last_error TEXT,
  idempotency_key TEXT UNIQUE
);
CREATE INDEX IF NOT EXISTS idx_outbox_pending ON ${OUTBOX_TABLE}(status, available_at);

CREATE TABLE IF NOT EXISTS ${PROCESSED_TABLE} (
  consumer_name TEXT NOT NULL,
  idempotency_key TEXT NOT NULL,
  processed_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (consumer_name, idempotency_key)
);

CREATE TABLE IF NOT EXISTS ${DEAD_LETTER_TABLE} (
  id TEXT PRIMARY KEY,
  event_name TEXT NOT NULL,
  event_version INTEGER NOT NULL,
  payload JSONB NOT NULL,
  metadata JSONB NOT NULL,
  error TEXT NOT NULL,
  failed_at TIMESTAMPTZ NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0
);
`;
