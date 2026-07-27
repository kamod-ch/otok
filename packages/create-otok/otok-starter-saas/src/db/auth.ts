import BetterSqlite3 from "better-sqlite3";
import { Kysely, SqliteDialect } from "kysely";
import type { SaasDatabase, SaasUser } from "./types.js";

function sqlitePath(connectionString: string): string {
  const url = connectionString.replace(/^sqlite:\/\//, "");
  return url.startsWith("/") || url.includes(":") ? url : `./${url}`;
}

export function createAuthDb(connectionString: string): Kysely<SaasDatabase> {
  const database = new BetterSqlite3(sqlitePath(connectionString));
  database.pragma("foreign_keys = ON");
  return new Kysely<SaasDatabase>({
    dialect: new SqliteDialect({ database }),
  });
}

export async function resolveUserByToken(db: Kysely<SaasDatabase>, tokenHash: string): Promise<SaasUser | null> {
  const row = await db
    .selectFrom("sessions")
    .innerJoin("users", "users.id", "sessions.userId")
    .select(["users.id", "users.email", "users.name", "users.role"])
    .where("sessions.tokenHash", "=", tokenHash)
    .where("sessions.revokedAt", "is", null)
    .where("sessions.expiresAt", ">", new Date().toISOString())
    .executeTakeFirst();

  if (!row) return null;
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    role: row.role,
  };
}
