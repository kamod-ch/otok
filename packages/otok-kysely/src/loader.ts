import type { LoaderResult, OtokActionContext, OtokContext, OtokLoader } from "otok/server";
import type { LoaderEnhancer } from "otok/route";
import type { Kysely } from "kysely";
import { dbFromHono } from "./context.js";
import { tryGetKyselyRuntime } from "./registry.js";

type LoaderDbContext<DB> = {
  db: Kysely<DB>;
};

type ActionDbContext<DB> = LoaderDbContext<DB>;

function resolveDb<DB>(hono: OtokContext["hono"]): Kysely<DB> {
  const runtime = tryGetKyselyRuntime<DB>();
  if (!runtime) {
    throw new Error(
      "otok-kysely: defineLoader requires kysely() plugin or registerKyselyRuntime(). " +
        "Use loader: ({ hono }) => dbFromHono(hono) for manual wiring.",
    );
  }
  return dbFromHono<DB>(hono, runtime.contextKey);
}

/**
 * Wrap a loader with typed `db` from the registered otok-kysely runtime.
 *
 * ```ts
 * export const loader = defineLoader(async ({ db }) => {
 *   return db.selectFrom("contacts").selectAll().execute();
 * });
 * ```
 */
export function defineLoader<Data extends LoaderResult, DB = unknown>(
  handler: (ctx: OtokContext & LoaderDbContext<DB>) => Data | Promise<Data>,
): OtokLoader<Data> {
  return (context) => handler({ ...context, db: resolveDb<DB>(context.hono) });
}

/** Loader enhancer that injects `db` from the otok-kysely runtime (outermost in composeLoader). */
export function withDb<DB>(): LoaderEnhancer {
  return (loader) => (context) =>
    loader({ ...context, db: resolveDb<DB>(context.hono) } as OtokContext);
}

/**
 * Wrap an action with typed `db` from the registered otok-kysely runtime.
 */
export function defineAction<Result, DB = unknown>(
  handler: (ctx: OtokActionContext & ActionDbContext<DB>) => Result | Promise<Result>,
): (context: OtokActionContext) => Result | Promise<Result> {
  return (context) => handler({ ...context, db: resolveDb<DB>(context.hono) });
}

export { dbFromHono };
