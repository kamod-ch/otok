import type { Generated } from "kysely";
import type { QueueDatabase } from "@kamod-ch/otok-queue/providers/postgres";

export type JobVisibility = "public" | "private";
export type ImportStatus = "pending" | "processing" | "completed" | "failed";

export interface DevjobsAppDatabase {
  app_user: {
    id: string;
    email: string;
    name: string | null;
    password_hash: string;
    created_at: Generated<string>;
  };
  app_session: {
    id: Generated<string>;
    user_id: string;
    token_hash: string;
    user_agent: string | null;
    ip_address: string | null;
    expires_at: string;
    revoked_at: string | null;
    created_at: Generated<string>;
    last_seen_at: string | null;
  };
  company: {
    id: string;
    slug: string;
    name: string;
    created_at: string;
  };
  company_member: {
    company_id: string;
    user_id: string;
    role: "owner" | "member";
    created_at: Generated<string>;
  };
  job_posting: {
    id: string;
    company_id: string;
    slug: string;
    title: string;
    description: string;
    visibility: JobVisibility;
    external_ref: string | null;
    created_by: string;
    created_at: string;
    updated_at: string;
  };
  job_import: {
    id: string;
    company_id: string;
    created_by: string;
    status: ImportStatus;
    csv_content: string;
    rows_total: number;
    rows_imported: number;
    last_error: string | null;
    created_at: string;
    updated_at: string;
  };
}

export type DevjobsDatabase = DevjobsAppDatabase & QueueDatabase;

export type DevjobsUser = { id: string; email: string; name: string | null };

export type DevjobsContextUser = DevjobsUser & {
  companyId: string;
  companySlug: string;
  companyName: string;
  role: "owner" | "member";
};

export const COMPANY_ALPHA_ID = "co-alpha";
export const COMPANY_BETA_ID = "co-beta";
export const USER_ALICE_ID = "user-alice";
export const USER_BOB_ID = "user-bob";
export const SEED_PASSWORD = "seed-password";
