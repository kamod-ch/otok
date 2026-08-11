import { composeLoader, loaderEnhancer, type LoaderResult } from "otok/route";
import { defineAction as defineDbAction, withDb } from "@kamod-ch/otok-kysely/loader";
import { authFromOtokContext, tryGetAuthRuntime } from "@kamod-ch/otok-auth";
import type { Kysely } from "kysely";
import type { OtokContext } from "otok/server";
import { KyselyCrmRepository, type CrmDatabase } from "@kamod-ch/otok-kit-crm/db";
import type { CrmSessionUser } from "./auth-users.js";
import { resolveCrmSessionUser } from "./auth-users.js";
import { createCrmRepositoryOptions } from "./crm-repository-options.js";

export type CrmLoaderContext = {
  user: CrmSessionUser;
  repo: KyselyCrmRepository;
  db: Kysely<CrmDatabase>;
};

type DbContext = OtokContext & { db: Kysely<CrmDatabase> };

async function resolveCrmContext(ctx: DbContext): Promise<Pick<CrmLoaderContext, "user" | "repo">> {
  const runtime = tryGetAuthRuntime();
  if (!runtime) throw new Error("auth plugin required");
  const auth = authFromOtokContext(ctx.hono, runtime.helpers);
  const sessionUser = await auth.requireUser();
  const user = resolveCrmSessionUser(sessionUser.id);
  if (!user) throw new Error("Unknown CRM user");
  return { user, repo: new KyselyCrmRepository(ctx.db, createCrmRepositoryOptions()) };
}

export function defineCrmLoader<Data extends LoaderResult>(
  handler: (ctx: CrmLoaderContext & { hono: unknown }) => Data | Promise<Data>,
) {
  return composeLoader(
    async (ctx) => handler(ctx as unknown as CrmLoaderContext & { hono: unknown }),
    loaderEnhancer(async (ctx) => resolveCrmContext(ctx as DbContext)),
    withDb<CrmDatabase>(),
  );
}

export function defineCrmAction<Result>(
  handler: (ctx: CrmLoaderContext & { hono: unknown; formData?: FormData }) => Result | Promise<Result>,
) {
  return defineDbAction<Result, CrmDatabase>(async (ctx) => {
    const crm = await resolveCrmContext(ctx);
    return handler({ ...ctx, ...crm });
  });
}
