import { composeLoader, loaderEnhancer, type LoaderResult } from "otok/route";
import { defineAction as defineDbAction, withDb } from "@kamod-ch/otok-kysely/loader";
import { getKyselyRuntime } from "@kamod-ch/otok-kysely/registry";
import { defineAction as defineValidatedAction } from "@kamod-ch/otok-validation/loader";
import type { ValidationSchema } from "@kamod-ch/otok-validation";
import { authFromOtokContext, tryGetAuthRuntime } from "@kamod-ch/otok-auth";
import type { Kysely } from "kysely";
import type { ActionResult, OtokActionContext, OtokContext } from "otok/server";
import type { SaasContextUser, SaasDatabase, SaasUser } from "../db/types.js";
import { resolveOrgContext } from "./tenant.js";
import { can, type SaasPermission } from "./permissions.js";

export type SaasLoaderContext = OtokContext & {
  user: SaasContextUser;
  db: Kysely<SaasDatabase>;
};

type DbContext = OtokContext & { db: Kysely<SaasDatabase> };

async function resolveSaasContext(ctx: DbContext): Promise<Pick<SaasLoaderContext, "user">> {
  const runtime = tryGetAuthRuntime();
  if (!runtime) throw new Error("auth plugin required");
  const auth = authFromOtokContext(ctx.hono, runtime.helpers);
  const baseUser = await auth.requireUser();
  const saasUser = { id: baseUser.id, email: baseUser.email ?? "", name: (baseUser as SaasUser).name ?? null };
  const orgUser = await resolveOrgContext(ctx.db, saasUser, ctx.hono);
  if (!orgUser) throw new Response(null, { status: 303, headers: { Location: "/org/new" } });
  return { user: orgUser };
}

export function defineSaasLoader<Data extends LoaderResult>(
  handler: (ctx: SaasLoaderContext) => Data | Promise<Data>,
) {
  return composeLoader(
    async (ctx) => handler(ctx as unknown as SaasLoaderContext),
    loaderEnhancer(async (ctx) => resolveSaasContext(ctx as DbContext)),
    withDb<SaasDatabase>(),
  );
}

export function defineSaasAction<Result>(
  handler: (ctx: SaasLoaderContext & { formData?: FormData }) => Result | Promise<Result>,
) {
  return defineDbAction<Result, SaasDatabase>(async (ctx) => {
    const saas = await resolveSaasContext(ctx);
    return handler({ ...ctx, ...saas });
  });
}

export function defineSaasSchemaAction<TSchema extends ValidationSchema>(
  definition: {
    schema: TSchema;
    handler: (
      ctx: SaasLoaderContext & {
        input: TSchema extends ValidationSchema<infer O> ? O : never;
        formData?: FormData;
      },
    ) => ActionResult | Promise<ActionResult>;
  },
) {
  return defineValidatedAction({
    schema: definition.schema,
    handler: async (ctx: OtokActionContext & { input: unknown; db?: Kysely<SaasDatabase> }) => {
      const db = ctx.db ?? getKyselyRuntime<SaasDatabase>().db;
      const saas = await resolveSaasContext({ ...ctx, db } as DbContext);
      return definition.handler({ ...ctx, ...saas, db, input: ctx.input as never });
    },
  });
}

export function requirePermission(user: SaasContextUser, permission: SaasPermission): void {
  if (!can(user.orgRole, user.plan, permission)) {
    throw new Response("Forbidden", { status: 403 });
  }
}
