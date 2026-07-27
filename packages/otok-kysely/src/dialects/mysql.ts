import type { DialectConnectOptions } from "../types.js";

/**
 * MySQL dialect adapter — install `mysql2` in your app.
 *
 * ```ts
 * import kysely from "@kamod-ch/otok-kysely";
 * import { mysqlDialect } from "@kamod-ch/otok-kysely/dialects";
 *
 * kysely({ dialect: mysqlDialect(), connectionString: env.DATABASE_URL })
 * ```
 */
export function mysqlDialect(): import("../types.js").DialectAdapter {
  return {
    edgeCapable: false,
    createDialect(options: DialectConnectOptions) {
      // Lazy require pattern — mysql2 is an optional peer dependency.
      return createMysqlDialect(options);
    },
  };
}

async function createMysqlDialect(options: DialectConnectOptions): Promise<unknown> {
  const { MysqlDialect } = await import("kysely");
  let createPool: (config: { uri: string; connectionLimit: number }) => unknown;
  try {
    // @ts-expect-error mysql2 is an optional peer dependency
    const mysql = await import("mysql2");
    createPool = mysql.createPool;
  } catch {
    throw new Error("otok-kysely: install `mysql2` to use the mysql dialect adapter.");
  }
  const pool = createPool({
    uri: options.connectionString,
    connectionLimit: options.pool?.max ?? 10,
  });
  return new MysqlDialect({ pool: pool as never });
}

export { mysqlDialect as default };
