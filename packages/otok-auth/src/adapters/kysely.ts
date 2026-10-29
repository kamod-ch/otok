import type { Kysely } from "kysely";
import type {
  CreateSessionRecordInput,
  ResolvedSessionRecord,
  SessionAdapter,
  SessionRotationReplacement,
} from "../session/types.js";

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

type SessionRow = {
  tokenHash: string;
  userId: string;
  createdAt: Date;
  expiresAt: Date;
  revokedAt: Date | null;
  userAgent: string | null;
  ipAddress: string | null;
  lastSeenAt: Date | null;
};

function mapRow(row: SessionRow): ResolvedSessionRecord {
  return {
    tokenHash: row.tokenHash,
    userId: row.userId,
    createdAt: row.createdAt instanceof Date ? row.createdAt : new Date(row.createdAt),
    expiresAt: row.expiresAt instanceof Date ? row.expiresAt : new Date(row.expiresAt),
  };
}

function isActiveRow(row: SessionRow, now = new Date()): boolean {
  if (row.revokedAt) return false;
  const expiresAt = row.expiresAt instanceof Date ? row.expiresAt : new Date(row.expiresAt);
  return expiresAt.getTime() > now.getTime();
}

export interface KyselySessionAdapterOptions<TUser> {
  db: Kysely<any>;
  /** Kysely table name (camelCase with {@link https://kysely.dev/docs/plugins/camel-case | CamelCasePlugin}). */
  table: string;
  /** App-specific lookup: joins, roles, tenant context, etc. Called only for active session rows. */
  resolveUser: (tokenHash: string) => Promise<TUser | null> | TUser | null;
}

export function createKyselySessionAdapter<TUser>(options: KyselySessionAdapterOptions<TUser>): SessionAdapter<TUser> {
  const { db, table, resolveUser } = options;
  const now = () => new Date();

  async function fetchRow(tokenHash: string): Promise<SessionRow | undefined> {
    return db.selectFrom(table).selectAll().where("tokenHash", "=", tokenHash).executeTakeFirst() as Promise<
      SessionRow | undefined
    >;
  }

  async function resolveActiveRecord(tokenHash: string): Promise<ResolvedSessionRecord | null> {
    const row = await fetchRow(tokenHash);
    if (!row || !isActiveRow(row, now())) return null;
    return mapRow(row);
  }

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
      await db.updateTable(table).set({ revokedAt: now() }).where("tokenHash", "=", tokenHash).execute();
    },
    async resolveUser(tokenHash) {
      const active = await resolveActiveRecord(tokenHash);
      if (!active) return null;
      return resolveUser(tokenHash);
    },
    async touchRecord(tokenHash) {
      await db
        .updateTable(table)
        .set({ lastSeenAt: now() })
        .where("tokenHash", "=", tokenHash)
        .where("revokedAt", "is", null)
        .where("expiresAt", ">", now())
        .execute();
    },
    async resolveRecord(tokenHash) {
      return resolveActiveRecord(tokenHash);
    },
    async rotateRecord(oldTokenHash: string, replacement: SessionRotationReplacement): Promise<boolean> {
      return db.transaction().execute(async (trx) => {
        const revoked = await trx
          .updateTable(table)
          .set({ revokedAt: now() })
          .where("tokenHash", "=", oldTokenHash)
          .where("revokedAt", "is", null)
          .where("expiresAt", ">", now())
          .executeTakeFirst();

        if (Number(revoked.numUpdatedRows) !== 1) {
          return false;
        }

        await trx
          .insertInto(table)
          .values({
            userId: replacement.userId,
            tokenHash: replacement.newTokenHash,
            expiresAt: replacement.expiresAt,
            userAgent: replacement.userAgent,
            ipAddress: replacement.ipAddress,
          })
          .execute();

        return true;
      });
    },
  };
}
