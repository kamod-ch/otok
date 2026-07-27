import type { ActionResult, LoaderResult, OtokActionContext, OtokContext, OtokLoader } from "otok/server";
import type { FormParseOptions, ValidationSchema } from "./types.js";
import { parseFormData } from "./parse/form-data.js";
import { parseJson } from "./parse/json.js";

type InferOutput<T> = T extends ValidationSchema<infer O> ? O : never;

type DbContext<DB> = { db?: DB };

type ActionInputContext<TSchema extends ValidationSchema> = {
  input: InferOutput<TSchema>;
};

/** Resolve db from Hono context — set by @kamod-ch/otok-kysely middleware. */
function resolveDb<DB>(hono: OtokContext["hono"], contextKey = "db"): DB | undefined {
  const db = hono.get(contextKey as never);
  return db as DB | undefined;
}

async function parseActionInput<TSchema extends ValidationSchema>(
  context: OtokActionContext,
  schema: TSchema,
  options?: FormParseOptions,
): Promise<InferOutput<TSchema>> {
  const contentType = context.request.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    return parseJson(context.request, schema, options) as Promise<InferOutput<TSchema>>;
  }

  return parseFormData(context.formData, schema, options) as Promise<InferOutput<TSchema>>;
}

type ActionHandler<TSchema extends ValidationSchema, DB, Result> = (
  ctx: OtokActionContext & ActionInputContext<TSchema> & DbContext<DB>,
) => Result | Promise<Result>;

type ActionDefinition<TSchema extends ValidationSchema, DB, Result> = {
  schema: TSchema;
  handler: ActionHandler<TSchema, DB, Result>;
  parse?: FormParseOptions;
  /** Hono context key for db. Default: `db`. */
  dbContextKey?: string;
};

export function defineAction<TSchema extends ValidationSchema, DB = unknown, Result extends ActionResult = ActionResult>(
  definition: ActionDefinition<TSchema, DB, Result>,
): (context: OtokActionContext) => Promise<Result> | Result;

export function defineAction<DB = unknown, Result extends ActionResult = ActionResult>(
  handler: (ctx: OtokActionContext & DbContext<DB>) => Result | Promise<Result>,
): (context: OtokActionContext) => Result | Promise<Result>;

export function defineAction<TSchema extends ValidationSchema, DB = unknown, Result extends ActionResult = ActionResult>(
  definitionOrHandler:
    | ActionDefinition<TSchema, DB, Result>
    | ((ctx: OtokActionContext & DbContext<DB>) => Result | Promise<Result>),
): (context: OtokActionContext) => Promise<Result> | Result {
  if (typeof definitionOrHandler === "function") {
    return (context) =>
      definitionOrHandler({
        ...context,
        db: resolveDb<DB>(context.hono),
      });
  }

  const { schema, handler, parse, dbContextKey } = definitionOrHandler;

  return async (context) => {
    const input = await parseActionInput(context, schema, parse);
    return handler({
      ...context,
      input,
      db: resolveDb<DB>(context.hono, dbContextKey),
    });
  };
}

export function defineLoader<Data extends LoaderResult, DB = unknown>(
  handler: (ctx: OtokContext & DbContext<DB>) => Data | Promise<Data>,
  dbContextKey = "db",
): OtokLoader<Data> {
  return (context) =>
    handler({
      ...context,
      db: resolveDb<DB>(context.hono, dbContextKey),
    });
}

export type { InferOutput, ActionDefinition, FormParseOptions };
