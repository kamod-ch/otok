import type {
  ActionResult,
  LoaderResult,
  OtokAction,
  OtokActionContext,
  OtokContext,
  OtokFailure,
  OtokHead,
  OtokLoader,
  OtokPageProps,
  RouteParams,
  TypedOtokAction,
} from "../shared/routes.js";

export type {
  ActionResult,
  LoaderResult,
  OtokAction,
  OtokActionContext,
  OtokContext,
  OtokFailure,
  OtokHead,
  OtokLoader,
  OtokPageProps,
  RouteParams,
};

type OtokRoutePrimitive = string | number | boolean;
type OtokRouteQueryValue = OtokRoutePrimitive | null | undefined | Array<OtokRoutePrimitive | null | undefined>;

type SplitRoute<Path extends string> = Path extends `/${infer Rest}` ? SplitRoute<Rest> : Path;

type SegmentParam<Segment extends string> = Segment extends `[[${infer Name}]]`
  ? { [Key in Name]?: OtokRoutePrimitive }
  : Segment extends `[...${infer Name}]`
    ? { [Key in Name]: OtokRoutePrimitive | OtokRoutePrimitive[] }
    : Segment extends `[${infer Name}]`
      ? { [Key in Name]: OtokRoutePrimitive }
      : {};

type MergeParams<Left, Right> = Left & Right;

export type RouteParamsFromPattern<Path extends string> = Path extends `${infer Segment}/${infer Rest}`
  ? MergeParams<SegmentParam<Segment>, RouteParamsFromPattern<Rest>>
  : SegmentParam<Path>;

type RequiredKeys<T> = { [K in keyof T]-?: Record<string, never> extends Pick<T, K> ? never : K }[keyof T];

export type RouteBuildOptions<Path extends string> = {
  params?: RouteParamsFromPattern<SplitRoute<Path>>;
  query?: Record<string, OtokRouteQueryValue>;
  hash?: string;
};

export type RouteBuildOptionsFor<Path extends string> = RequiredKeys<
  RouteParamsFromPattern<SplitRoute<Path>>
> extends never
  ? RouteBuildOptions<Path> | undefined
  : Omit<RouteBuildOptions<Path>, "params"> & { params: RouteParamsFromPattern<SplitRoute<Path>> };

type SerializableLoaderData<T> = T extends Response
  ? never
  : T extends void
    ? Record<string, never>
    : T extends OtokFailure
      ? never
      : T;

type SerializableActionData<T> = T extends Response
  ? never
  : T extends void
    ? undefined
    : T extends OtokFailure
      ? T
      : T;

export type ExtractLoaderData<TLoader> = TLoader extends OtokLoader<infer Data>
  ? SerializableLoaderData<Awaited<ReturnType<TLoader>>>
  : TLoader extends (...args: never[]) => infer Result
    ? SerializableLoaderData<Awaited<Result>>
    : Record<string, never>;

export type ExtractActionData<TAction> = TAction extends OtokAction<infer Result>
  ? SerializableActionData<Awaited<ReturnType<TAction>>>
  : TAction extends (...args: never[]) => infer Result
    ? SerializableActionData<Awaited<Result>>
    : undefined;

type InferSchemaOutput<T> = T extends { schema: infer Schema }
  ? Schema extends { "~standard": { types: { output: infer Output } } }
    ? Output
    : Schema extends { _output: infer Output }
      ? Output
      : Schema extends { _type: infer Output }
        ? Output
        : unknown
  : unknown;

export type ExtractActionInput<TAction> = TAction extends {
  readonly __otokAction?: { input: infer Input };
}
  ? Input
  : TAction extends (...args: never[]) => unknown
    ? InferSchemaOutput<TAction>
    : unknown;

export type ExtractSearchParams<TSchema> = TSchema extends SearchParamsDefinition<infer Output>
  ? Output
  : TSchema extends { schema: infer Schema }
    ? InferSchemaOutput<{ schema: Schema }>
    : Record<string, string | string[] | undefined>;

export type ExtractMeta<
  THead extends ((props: OtokPageProps) => unknown) | undefined,
  TMeta extends ((props: OtokPageProps) => unknown) | undefined,
> = THead extends (props: OtokPageProps<infer Data>) => infer Head
  ? Head extends OtokHead | Promise<OtokHead>
    ? OtokHead
    : OtokHead
  : TMeta extends (props: OtokPageProps<infer Data>) => infer Meta
    ? Meta extends OtokHead | Promise<OtokHead>
      ? OtokHead
      : OtokHead
    : OtokHead;

export interface RouteComponentProps<
  LoaderData extends LoaderResult = LoaderResult,
  ActionData = ActionResult | undefined,
  Params extends RouteParams = RouteParams,
> {
  /** Loader output for the current route. Alias of `data`. */
  loaderData: LoaderData;
  /** Legacy alias kept for compatibility with existing route modules. */
  data: LoaderData;
  actionData?: ActionData;
  params: Params;
  route: string;
}

export interface RouteErrorProps<
  LoaderData extends LoaderResult = LoaderResult,
  Params extends RouteParams = RouteParams,
> {
  error: Error | OtokFailure;
  loaderData?: LoaderData;
  params: Params;
  route: string;
}

export interface SearchParamsDefinition<Output = Record<string, string | string[] | undefined>> {
  readonly __otokSearchParams?: Output;
}

export interface ActionDefinition<
  TSchema,
  TContext,
  Result extends ActionResult = ActionResult,
> {
  schema: TSchema;
  handler: (ctx: TContext & { input: InferSchemaOutput<{ schema: TSchema }> }) => Result | Promise<Result>;
  parse?: Record<string, unknown>;
}

export interface MetaDefinition<Data extends LoaderResult = LoaderResult> {
  (ctx: { data: Data; params: RouteParams; route: string }): OtokHead | Promise<OtokHead>;
}

/** Preserve loader handler types for generated route module inference. */
export function defineLoader<Data extends LoaderResult, Context = OtokContext>(
  handler: (ctx: Context & OtokContext) => Data | Promise<Data>,
): OtokLoader<Data> {
  return handler as OtokLoader<Data>;
}

/** Preserve action handler types, optionally with a validation schema. */
export function defineAction<
  TSchema,
  Context,
  Result extends ActionResult = ActionResult,
>(definition: ActionDefinition<TSchema, Context, Result>): TypedOtokAction<Result, InferSchemaOutput<{ schema: TSchema }>>;

export function defineAction<Context, Result extends ActionResult = ActionResult>(
  handler: (ctx: Context & OtokActionContext) => Result | Promise<Result>,
): TypedOtokAction<Result, unknown>;

export function defineAction(
  definitionOrHandler: ActionDefinition<unknown, unknown> | ((ctx: OtokActionContext) => ActionResult | Promise<ActionResult>),
): OtokAction {
  if (typeof definitionOrHandler === "function") {
    return definitionOrHandler;
  }

  const { schema, handler } = definitionOrHandler;
  const action = async (context: OtokActionContext) => {
    const input = await parseActionInput(context, schema);
    return handler({ ...context, input } as never);
  };

  Object.defineProperty(action, "__otokAction", {
    value: { input: undefined as InferSchemaOutput<{ schema: typeof schema }>, result: undefined },
    enumerable: false,
  });

  return action;
}

/** Preserve metadata resolver types for generated route module inference. */
export function defineMeta<Data extends LoaderResult = LoaderResult>(
  resolver: MetaDefinition<Data>,
): (props: OtokPageProps<Data>) => Promise<OtokHead> | OtokHead {
  return resolver as (props: OtokPageProps<Data>) => Promise<OtokHead> | OtokHead;
}

/** Declare a typed search params schema for a route module. */
export function defineSearchParams<TSchema>(
  schema: TSchema,
): SearchParamsDefinition<InferSchemaOutput<{ schema: TSchema }>> {
  return schema as SearchParamsDefinition<InferSchemaOutput<{ schema: TSchema }>>;
}

async function parseActionInput(context: OtokActionContext, schema: unknown): Promise<unknown> {
  const contentType = context.request.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    const body = await context.request.clone().json();
    return parseWithSchema(schema, body);
  }

  const formObject = context.formData ? formDataToObject(context.formData) : {};
  return parseWithSchema(schema, formObject);
}

function formDataToObject(formData: FormData): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of formData.entries()) {
    if (result[key] === undefined) {
      result[key] = value;
      continue;
    }
    const current = result[key];
    result[key] = Array.isArray(current) ? [...current, value] : [current, value];
  }
  return result;
}

function parseWithSchema(schema: unknown, value: unknown): unknown {
  if (!schema || typeof schema !== "object") return value;

  const standard = (schema as { "~standard"?: { validate?: (input: unknown) => unknown } })["~standard"];
  if (standard?.validate) {
    const result = standard.validate(value) as { value?: unknown; issues?: unknown[] };
    if (result && typeof result === "object" && "issues" in result && result.issues?.length) {
      throw new Error("otok: search/action schema validation failed.");
    }
    return (result as { value?: unknown }).value ?? value;
  }

  const parser = (schema as { parse?: (input: unknown) => unknown }).parse;
  if (typeof parser === "function") return parser(value);

  const safeParse = (schema as { safeParse?: (input: unknown) => { success: boolean; data?: unknown } }).safeParse;
  if (typeof safeParse === "function") {
    const result = safeParse(value);
    if (!result.success) throw new Error("otok: schema validation failed.");
    return result.data;
  }

  return value;
}

export type RedirectTarget = string;

export { composeLoader, loaderEnhancer, type LoaderEnhancer } from "./compose.js";
