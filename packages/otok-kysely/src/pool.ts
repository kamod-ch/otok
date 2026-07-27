import { Kysely } from "kysely";
import type { BuiltInDialect, DialectAdapter, DialectConnectOptions, PoolOptions } from "./types.js";

export function resolveConnectionString(explicit?: string): string {
  const value = explicit ?? process.env.DATABASE_URL;
  if (!value) {
    throw new Error(
      "otok-kysely: provide connectionString or set DATABASE_URL environment variable.",
    );
  }
  return value;
}

export function isDialectAdapter(dialect: BuiltInDialect | DialectAdapter): dialect is DialectAdapter {
  return typeof dialect === "object" && dialect !== null && "createDialect" in dialect;
}

export function isEdgeCapable(dialect: BuiltInDialect | DialectAdapter): boolean {
  if (isDialectAdapter(dialect)) {
    return dialect.edgeCapable ?? false;
  }
  return dialect === "sqlite";
}

export async function createKyselyInstance<DB>(
  dialect: BuiltInDialect | DialectAdapter,
  connectionString: string,
  pool?: PoolOptions,
): Promise<Kysely<DB>> {
  const options: DialectConnectOptions = { connectionString, pool };

  if (isDialectAdapter(dialect)) {
    const kyselyDialect = await dialect.createDialect(options);
    return new Kysely<DB>({ dialect: kyselyDialect as never });
  }

  switch (dialect) {
    case "postgres": {
      const { PostgresDialect } = await import("kysely");
      let Pool: typeof import("pg").Pool;
      try {
        ({ Pool } = await import("pg"));
      } catch {
        throw new Error("otok-kysely: install `pg` to use the postgres dialect.");
      }
      const pgPool = new Pool({
        connectionString,
        min: pool?.min,
        max: pool?.max ?? 10,
      });
      return new Kysely<DB>({ dialect: new PostgresDialect({ pool: pgPool }) });
    }
    case "sqlite": {
      const { SqliteDialect } = await import("kysely");
      const Database = (await import("better-sqlite3")).default;
      const filename = connectionString.replace(/^sqlite:\/\//, "");
      const sqlite = new Database(filename);
      return new Kysely<DB>({ dialect: new SqliteDialect({ database: sqlite }) });
    }
    default:
      throw new Error(`otok-kysely: unsupported dialect "${String(dialect)}".`);
  }
}

export async function destroyKyselyInstance(db: Kysely<any>): Promise<void> {
  await db.destroy();
}
