import type { Context, MiddlewareHandler } from "hono";
import type { ComponentChildren, ComponentType } from "preact";
import type { IslandProps, JsonValue } from "./islands.js";

export type RouteParams = Record<string, string>;

export interface OtokChrome {
  title?: string;
  description?: string;
  toolbar?: ComponentChildren;
}

export interface OtokContext<Env = unknown> {
  hono: Context<Env extends object ? Env : object>;
  request: Request;
  params: RouteParams;
  route: string;
}

export interface OtokActionContext<Env = unknown> extends OtokContext<Env> {
  /** Effective action method after applying supported method override conventions. */
  method: "POST" | "PUT" | "PATCH" | "DELETE";
  /** Parsed form data for form submissions. Undefined for non-form requests. */
  formData?: FormData;
}

export type LoaderResult = JsonValue | Record<string, JsonValue> | OtokFailure | Response | void;

export interface OtokFailure<T = unknown> {
  status: number;
  message?: string;
  fieldErrors?: Record<string, string[]>;
  formErrors?: string[];
  data?: T;
}

export type OtokResponse = Response | OtokHttpError;

export type OtokLoader<Data extends LoaderResult = LoaderResult> = (
  context: OtokContext,
) => Data | Promise<Data>;

export type ActionResult = JsonValue | Record<string, JsonValue> | OtokFailure | Response | void;

export type OtokAction<Result extends ActionResult = ActionResult> = (
  context: OtokActionContext,
) => Result | Promise<Result>;

export interface OtokPageProps<Data extends LoaderResult = LoaderResult> {
  data: Data;
  actionData?: ActionResult;
  params: RouteParams;
  route: string;
}

export interface OtokLayoutProps<Data extends LoaderResult = LoaderResult> extends OtokPageProps<Data> {
  children: ComponentChildren;
  chrome?: OtokChrome;
}

export interface RouteModule<Data extends LoaderResult = LoaderResult> {
  default: ComponentType<OtokPageProps<Data>>;
  loader?: OtokLoader<Data>;
  action?: OtokAction;
  /** Force the client entry to load even when the route renders no islands. Useful for progressive form enhancement. */
  client?: boolean;
  head?: (props: OtokPageProps<Data>) => OtokHead | Promise<OtokHead>;
  chrome?: (props: OtokPageProps<Data>) => OtokChrome | Promise<OtokChrome>;
}

export type OtokMiddleware = MiddlewareHandler;

export interface MiddlewareModule {
  default?: OtokMiddleware;
  middleware?: OtokMiddleware;
}

export interface LayoutModule<Data extends LoaderResult = LoaderResult> {
  default: ComponentType<OtokLayoutProps<Data>>;
}

export interface OtokRoute {
  id: string;
  path: string;
  pattern: RegExp;
  params: string[];
  module: RouteModule;
  layouts?: LayoutModule[];
  middleware?: MiddlewareModule[];
}

export interface OtokHead {
  title?: string;
  description?: string;
  lang?: string;
  meta?: Record<string, string>;
  links?: OtokHeadLink[];
  scripts?: OtokHeadScript[];
  jsonLd?: Record<string, JsonValue>;
}

export interface OtokHeadLink {
  rel: string;
  href: string;
  crossorigin?: string;
  as?: string;
  type?: string;
}

export interface OtokHeadScript {
  src?: string;
  type?: string;
  async?: boolean;
  defer?: boolean;
}

export class OtokHttpError extends Error {
  readonly headers: Headers;
  readonly failure?: OtokFailure;

  constructor(
    readonly status: number,
    message = "Otok request failed",
    headers?: HeadersInit,
    failure?: OtokFailure,
  ) {
    super(message);
    this.name = "OtokHttpError";
    this.headers = new Headers(headers);
    this.failure = failure;
  }
}

export function json<T>(data: T, init?: ResponseInit | number): Response {
  const responseInit = typeof init === "number" ? { status: init } : init;
  const headers = new Headers(responseInit?.headers);
  if (!headers.has("content-type")) headers.set("content-type", "application/json; charset=utf-8");
  return new Response(JSON.stringify(data), { ...responseInit, headers });
}

export function redirect(location: string, status = 302): never {
  if (!location) throw new TypeError("otok: redirect() requires a Location value.");
  if (status < 300 || status > 399) throw new RangeError("otok: redirect() status must be a 3xx status code.");
  throw new OtokHttpError(status, "Redirect", { location });
}

export function notFound(message = "Not found"): never {
  throw new OtokHttpError(404, message, undefined, { status: 404, message });
}

export function fail(status: number, failure: Omit<OtokFailure, "status">): never;
export function fail(message?: string, status?: number): never;
export function fail(first: number | string = "Internal server error", second: Omit<OtokFailure, "status"> | number = 500): never {
  if (typeof first === "number") {
    const failure = normalizeFailure(first, second && typeof second === "object" ? second : {});
    throw new OtokHttpError(failure.status, failure.message ?? "Request failed", undefined, failure);
  }

  const status = typeof second === "number" ? second : 500;
  throw new OtokHttpError(status, first, undefined, { status, message: first });
}

function normalizeFailure(status: number, failure: Omit<OtokFailure, "status">): OtokFailure {
  return {
    status,
    ...failure,
    fieldErrors: normalizeFieldErrors(failure.fieldErrors),
  };
}

function normalizeFieldErrors(
  fieldErrors: Record<string, string[]> | undefined,
): Record<string, string[]> | undefined {
  if (!fieldErrors) return undefined;
  return Object.fromEntries(Object.entries(fieldErrors).map(([field, errors]) => [field, [...errors]]));
}

export function isOtokHttpError(error: unknown): error is OtokHttpError {
  return error instanceof OtokHttpError;
}

export function isOtokResponse(value: unknown): value is OtokResponse {
  return value instanceof Response || isOtokHttpError(value);
}

export function defineMiddleware<T extends OtokMiddleware>(middleware: T): T {
  return middleware;
}

export type InferLoaderData<T extends OtokLoader> = Awaited<ReturnType<T>>;

export type InferIslandProps<T> = T extends ComponentType<infer Props>
  ? Props extends IslandProps
    ? Props
    : never
  : never;
