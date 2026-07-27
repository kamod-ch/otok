import { definePlugin } from "otok";
import type { Hono } from "hono";
import { dbFromHono } from "./context.js";
import { createKyselyInstance, destroyKyselyInstance, isEdgeCapable, resolveConnectionString } from "./pool.js";
import { registerKyselyRuntime } from "./registry.js";
import type { KyselyPluginOptions, KyselyRuntime } from "./types.js";

function resolveMigrationsConfig(options: KyselyPluginOptions): KyselyRuntime["migrations"] {
  return {
    directory: options.migrations?.directory ?? "migrations",
    tableName: options.migrations?.tableName ?? "otok_migrations",
  };
}

function resolveSeedsConfig(options: KyselyPluginOptions): KyselyRuntime["seeds"] {
  return {
    directory: options.seeds?.directory ?? "seeds",
  };
}

export async function configureKyselyApp(app: Hono, options: KyselyPluginOptions): Promise<KyselyRuntime> {
  const connectionString = resolveConnectionString(options.connectionString);
  const contextKey = options.contextKey ?? "db";
  const db = await createKyselyInstance(options.dialect, connectionString, options.pool);

  const runtime: KyselyRuntime = {
    db: db as KyselyRuntime["db"],
    contextKey,
    dialect: options.dialect,
    connectionString,
    migrations: resolveMigrationsConfig(options),
    seeds: resolveSeedsConfig(options),
    edgeCapable: isEdgeCapable(options.dialect),
  };

  registerKyselyRuntime(runtime);

  app.use("*", async (c, next) => {
    c.set(contextKey as never, db as never);
    await next();
  });

  return runtime;
}

const kyselyPluginFactory = definePlugin<KyselyPluginOptions>({
  name: "@kamod-ch/otok-kysely",
  version: "1.0.0",
  schema: {
    parse(input) {
      if (!input || typeof input !== "object") {
        throw new Error("kysely() options must be an object");
      }
      const record = input as Record<string, unknown>;
      if (!record.dialect) {
        throw new Error("kysely() requires a dialect (postgres, sqlite, or DialectAdapter)");
      }
      return input as KyselyPluginOptions;
    },
  },
  envSchema: {
    parse(input) {
      const url = input.DATABASE_URL;
      if (url !== undefined && !url) {
        throw new Error("otok-kysely: DATABASE_URL must not be empty when set");
      }
      return { databaseUrl: url };
    },
  },
});

/** Otok plugin factory — register in otok.config.ts plugins array. */
export default function kysely(options: KyselyPluginOptions) {
  const plugin = kyselyPluginFactory(options);
  let runtime: KyselyRuntime | null = null;

  plugin.configureApp = async ({ app }) => {
    runtime = await configureKyselyApp(app, options);
  };

  plugin.buildEnd = async () => {
    if (runtime) {
      await destroyKyselyInstance(runtime.db);
      runtime = null;
    }
  };

  return plugin;
}

export { dbFromHono, getDb } from "./context.js";
