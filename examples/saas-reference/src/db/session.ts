import type { Kysely } from "kysely";
import type {
  CreateSessionRecordInput,
  ResolvedSessionRecord,
  SessionAdapter,
} from "@kamod-ch/otok-auth";
import type { SaasDatabase, SaasUser } from "./types.js";

type GetDb = () => Kysely<SaasDatabase>;

export function createSaasSessionAdapter(options: {
  getDb: GetDb;
  resolveUser: (db: Kysely<SaasDatabase>, tokenHash: string) => Promise<SaasUser | null>;
}): SessionAdapter<SaasUser> {
  return {
    async createRecord(input: CreateSessionRecordInput) {
      const db = options.getDb();
      await db
        .insertInto("app_session")
        .values({
          user_id: input.userId,
          token_hash: input.tokenHash,
          expires_at: input.expiresAt.toISOString(),
          user_agent: input.userAgent,
          ip_address: input.ipAddress,
        } as any)
        .execute();
    },
    async revokeRecord(tokenHash) {
      const db = options.getDb();
      await db
        .updateTable("app_session")
        .set({ revoked_at: new Date().toISOString() })
        .where("token_hash", "=", tokenHash)
        .execute();
    },
    async resolveUser(tokenHash) {
      return options.resolveUser(options.getDb(), tokenHash);
    },
    async touchRecord(tokenHash) {
      const db = options.getDb();
      await db
        .updateTable("app_session")
        .set({ last_seen_at: new Date().toISOString() })
        .where("token_hash", "=", tokenHash)
        .execute();
    },
    async resolveRecord(tokenHash): Promise<ResolvedSessionRecord | null> {
      const db = options.getDb();
      const row = await db
        .selectFrom("app_session")
        .select(["user_id", "token_hash", "created_at", "expires_at"])
        .where("token_hash", "=", tokenHash)
        .where("revoked_at", "is", null)
        .where("expires_at", ">", new Date().toISOString())
        .executeTakeFirst();
      if (!row) return null;
      return {
        userId: row.user_id,
        tokenHash: row.token_hash,
        createdAt: new Date(row.created_at),
        expiresAt: new Date(row.expires_at),
      };
    },
  };
}

export async function resolveUserByToken(
  db: Kysely<SaasDatabase>,
  tokenHash: string,
): Promise<SaasUser | null> {
  const row = await db
    .selectFrom("app_session")
    .innerJoin("app_user", "app_user.id", "app_session.user_id")
    .select(["app_user.id", "app_user.email", "app_user.name"])
    .where("app_session.token_hash", "=", tokenHash)
    .where("app_session.revoked_at", "is", null)
    .where("app_session.expires_at", ">", new Date().toISOString())
    .executeTakeFirst();

  if (!row) return null;
  return { id: row.id, email: row.email, name: row.name };
}
