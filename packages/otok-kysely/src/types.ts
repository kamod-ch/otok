import type { Kysely } from "kysely";

/** Built-in dialect identifiers. Use `DialectAdapter` for custom drivers (e.g. MySQL variants). */
export type BuiltInDialect = "postgres" | "sqlite";

export interface DialectAdapter {
  /** Create a Kysely-compatible dialect instance. */
  createDialect(options: DialectConnectOptions): unknown | Promise<unknown>;
  /** Whether this dialect can run in edge/worker runtimes. */
  edgeCapable?: boolean;
}

export interface DialectConnectOptions {
  connectionString: string;
  pool?: PoolOptions;
}

export interface PoolOptions {
  min?: number;
  max?: number;
}

export interface MigrationsConfig {
  /** Project-relative migrations directory. Default: `migrations/`. */
  directory?: string;
  /** Table tracking applied migrations. Default: `otok_migrations`. */
  tableName?: string;
}

export interface SeedsConfig {
  /** Project-relative seeds directory. Default: `seeds/`. */
  directory?: string;
}

export interface KyselyPluginOptions<DB = unknown> {
  /** Built-in dialect name or custom adapter. MySQL: pass a `DialectAdapter` from `./dialects/mysql`. */
  dialect: BuiltInDialect | DialectAdapter;
  /** Connection string. Prefer env.DATABASE_URL via envSchema. */
  connectionString?: string;
  migrations?: MigrationsConfig;
  seeds?: SeedsConfig;
  pool?: PoolOptions;
  /** Hono context key for the db instance. Default: `db`. */
  contextKey?: string;
}

export interface KyselyRuntime<DB = unknown> {
  db: Kysely<DB>;
  contextKey: string;
  dialect: BuiltInDialect | DialectAdapter;
  connectionString: string;
  migrations: Required<MigrationsConfig>;
  seeds: Required<SeedsConfig>;
  edgeCapable: boolean;
}

export interface MigrationRecord {
  name: string;
  appliedAt: Date;
}

export interface MigrationFile {
  name: string;
  up: string;
  down: string;
}

export interface MigrationStatus {
  name: string;
  applied: boolean;
  appliedAt?: Date;
}

export interface SeedModule {
  default?: (db: Kysely<unknown>) => void | Promise<void>;
  seed?: (db: Kysely<unknown>) => void | Promise<void>;
}

export type { Kysely };
