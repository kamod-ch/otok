export const JOBS_TABLE = "otok_queue_jobs";
export const DEAD_LETTER_TABLE = "otok_queue_dead_letter";
export const CRON_DEDUPE_TABLE = "otok_queue_cron_dedupe";
export const IDEMPOTENCY_TABLE = "otok_idempotency_records";

export interface QueueJobsTable {
  id: string;
  name: string;
  payload: unknown;
  status: string;
  attempts: number;
  max_attempts: number;
  idempotency_scope: string | null;
  idempotency_key: string | null;
  created_at: Date;
  available_at: Date;
  lease_owner: string | null;
  lease_token: string | null;
  lease_until: Date | null;
  last_error: string | null;
}

export interface QueueDatabase {
  [JOBS_TABLE]: QueueJobsTable;
  [DEAD_LETTER_TABLE]: {
    id: string;
    job_id: string;
    name: string;
    payload: unknown;
    attempts: number;
    error: string;
    failed_at: Date;
    retain_until: Date;
  };
  [CRON_DEDUPE_TABLE]: {
    schedule_name: string;
    fire_at_utc: Date;
    created_at: Date;
  };
  [IDEMPOTENCY_TABLE]: {
    storage_key: string;
    fingerprint: string;
    state: string;
    response_body: Buffer | null;
    response_meta: unknown | null;
    expires_at: Date;
    updated_at: Date;
  };
}
