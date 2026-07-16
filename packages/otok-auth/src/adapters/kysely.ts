import type { Kysely } from "kysely";
import type { CreateSessionRecordInput, SessionAdapter } from "../session/types.js";

export const SESSION_TABLE_MIGRATION_SQL = `-- Reference migration for @kamod-ch/otok-auth session adapters
CREATE TABLE IF NOT EXISTS app_session (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
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
CREATE INDEX IF NOT EXISTS app_session_expires_at_idx ON app_session (expires_at);
`;

export interface KyselySessionAdapterOptions<TUser> {
  db: Kysely<any>;
  /** Kysely table name, e.g. "appSession". */
  table: string;
  /** App-specific lookup: joins, roles, tenant context, etc. */
  resolveUser: (tokenHash: string) => Promise<TUser | null> | TUser | null;
}

export function createKyselySessionAdapter<TUser>(
  options: KyselySessionAdapterOptions<TUser>,
): SessionAdapter<TUser> {
  const { db, table, resolveUser } = options;

  return {
    async createRecord(input: CreateSessionRecordInput) {
      await db
        .insertInto(table)
        .values({
          userId: input.userId,
          tokenHash: input.tokenHash,
          expiresAt: input.expiresAt,
          userAgent: input.userAgent,
          ipAddress: input.ipAddress,
        })
        .execute();
    },
    async revokeRecord(tokenHash) {
      await db
        .updateTable(table)
        .set({ revokedAt: new Date() })
        .where("tokenHash", "=", tokenHash)
        .execute();
    },
    async resolveUser(tokenHash) {
      return resolveUser(tokenHash);
    },
    async touchRecord(tokenHash) {
      await db
        .updateTable(table)
        .set({ lastSeenAt: new Date() })
        .where("tokenHash", "=", tokenHash)
        .execute();
    },
  };
}
