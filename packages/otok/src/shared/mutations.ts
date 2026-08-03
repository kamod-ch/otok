import type { ActionResult, LoaderResult, OtokFailure } from "./routes.js";
import type { JsonValue } from "./islands.js";

/** Accept header for fetcher/action data requests (no full HTML). */
export const OTOK_DATA_ACCEPT = "application/vnd.otok+json";

/** Legacy/alternate data request marker. */
export const OTOK_DATA_HEADER = "x-otok-data";

/** Idempotency key for mutation deduplication. */
export const OTOK_IDEMPOTENCY_HEADER = "x-otok-idempotency-key";

/** CSRF token header (double-submit cookie pattern). */
export const OTOK_CSRF_HEADER = "x-csrf-token";

/** Identifies a fetcher instance on form submissions. */
export const OTOK_FETCHER_KEY_HEADER = "x-otok-fetcher-key";

/** Marks fetcher forms in the DOM. */
export const OTOK_FETCHER_ATTR = "data-otok-fetcher";

/** Hidden field name for CSRF in progressive-enhancement forms. */
export const OTOK_CSRF_FIELD = "_csrf";

/** Hidden field for idempotency in native forms. */
export const OTOK_IDEMPOTENCY_FIELD = "_idempotency";

/** Meta tag name for CSRF token injection in HTML shell. */
export const OTOK_CSRF_META = "csrf-token";

export type FetcherState = "idle" | "submitting" | "loading";

export interface OtokDataResponse<TAction = unknown, TLoader = unknown> {
  actionData?: TAction;
  loaderData?: TLoader;
  redirect?: string;
  revalidateTags?: string[];
  revalidatePaths?: string[];
  error?: OtokFailure;
}

export interface MutationSubmitOptions<TOptimistic = unknown> {
  /** Optimistic data patches keyed by cache scope. */
  optimistic?: Record<string, TOptimistic>;
  /** Revalidate specific loader cache tags after success. */
  revalidateTags?: string[];
  /** Revalidate specific paths after success. */
  revalidatePaths?: string[];
  /** Skip navigation after mutation (default for fetchers). */
  navigate?: boolean;
  /** Replace history entry on navigation. */
  replace?: boolean;
  /** Custom idempotency key (auto-generated if omitted). */
  idempotencyKey?: string;
  /** AbortSignal for caller-controlled cancellation. */
  signal?: AbortSignal;
  /** Upload progress callback (XHR fallback when fetch lacks progress). */
  onUploadProgress?: (progress: { loaded: number; total: number; percent: number }) => void;
}

export interface ActionDescriptor {
  /** Route path or URL for the action endpoint. */
  action: string;
  /** HTTP method override for form compatibility. */
  method?: "POST" | "PUT" | "PATCH" | "DELETE";
}

export function isDataRequest(request: Request): boolean {
  const accept = request.headers.get("accept") ?? "";
  if (accept.includes(OTOK_DATA_ACCEPT)) return true;
  return request.headers.get(OTOK_DATA_HEADER) === "1";
}

export function serializeActionData(result: ActionResult): OtokDataResponse["actionData"] | OtokFailure | undefined {
  if (result === undefined || result === null) return undefined;
  if (typeof result === "object" && "status" in result && typeof (result as OtokFailure).status === "number") {
    return result as OtokFailure;
  }
  return result as JsonValue;
}

export function serializeLoaderData(data: LoaderResult): OtokDataResponse["loaderData"] | undefined {
  if (data === undefined || data === null) return undefined;
  if (data instanceof Response) return undefined;
  if (typeof data === "object" && "status" in data && typeof (data as OtokFailure).status === "number") {
    return undefined;
  }
  return data as JsonValue;
}

export function createIdempotencyKey(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
