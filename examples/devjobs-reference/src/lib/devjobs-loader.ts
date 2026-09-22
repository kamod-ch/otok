import { composeLoader, loaderEnhancer, type LoaderResult } from "@kamod-ch/otok/route";
import { defineAction as defineDbAction, withDb } from "@kamod-ch/otok-kysely/loader";
import { getKyselyRuntime } from "@kamod-ch/otok-kysely/registry";
import { defineAction as defineValidatedAction } from "@kamod-ch/otok-validation/loader";
import type { ValidationSchema } from "@kamod-ch/otok-validation";
import { authFromOtokContext, tryGetAuthRuntime } from "@kamod-ch/otok-auth";
import type { Kysely } from "kysely";
import type { ActionResult, OtokActionContext, OtokContext } from "@kamod-ch/otok/server";
import type { DevjobsContextUser, DevjobsDatabase, DevjobsUser } from "../db/types.js";
import { resolveCompanyContext } from "./tenant.js";

export type DevjobsLoaderContext = OtokContext & {
  user: DevjobsContextUser;
  db: Kysely<DevjobsDatabase>;
};

type DbContext = OtokContext & { db: Kysely<DevjobsDatabase> };

async function resolveDevjobsContext(ctx: DbContext): Promise<Pick<DevjobsLoaderContext, "user">> {
  const runtime = tryGetAuthRuntime();
  if (!runtime) throw new Error("auth plugin required");
  const auth = authFromOtokContext(ctx.hono, runtime.helpers);
  const baseUser = await auth.requireUser();
  const user: DevjobsUser = {
    id: baseUser.id,
    email: baseUser.email ?? "",
    name: (baseUser as DevjobsUser).name ?? null,
  };
  const companyUser = await resolveCompanyContext(ctx.db, user);
  if (!companyUser) throw new Response("Forbidden", { status: 403 });
  return { user: companyUser };
}

export function defineEmployerLoader<Data extends LoaderResult>(
  handler: (ctx: DevjobsLoaderContext) => Data | Promise<Data>,
) {
  return composeLoader(
    async (ctx) => handler(ctx as unknown as DevjobsLoaderContext),
    loaderEnhancer(async (ctx) => resolveDevjobsContext(ctx as DbContext)),
    withDb<DevjobsDatabase>(),
  );
}

export function defineEmployerSchemaAction<TSchema extends ValidationSchema>(definition: {
  schema: TSchema;
  handler: (
    ctx: DevjobsLoaderContext & {
      input: TSchema extends ValidationSchema<infer O> ? O : never;
      formData?: FormData;
    },
  ) => ActionResult | Promise<ActionResult>;
}) {
  return defineValidatedAction({
    schema: definition.schema,
    handler: async (ctx: OtokActionContext & { input: unknown; db?: Kysely<DevjobsDatabase> }) => {
      const db = ctx.db ?? getKyselyRuntime<DevjobsDatabase>().db;
      const devjobs = await resolveDevjobsContext({ ...ctx, db } as DbContext);
      return definition.handler({ ...ctx, ...devjobs, db, input: ctx.input as never });
    },
  });
}

export function defineEmployerAction<Result>(
  handler: (ctx: DevjobsLoaderContext & { formData?: FormData }) => Result | Promise<Result>,
) {
  return defineDbAction<Result, DevjobsDatabase>(async (ctx) => {
    const devjobs = await resolveDevjobsContext(ctx);
    return handler({ ...ctx, ...devjobs });
  });
}
