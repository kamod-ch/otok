import {
  createIdempotencyKey,
  OTOK_CSRF_FIELD,
  OTOK_CSRF_HEADER,
  OTOK_DATA_ACCEPT,
  OTOK_DATA_HEADER,
  OTOK_IDEMPOTENCY_FIELD,
  OTOK_IDEMPOTENCY_HEADER,
  OTOK_FETCHER_KEY_HEADER,
  type MutationSubmitOptions,
  type OtokDataResponse,
} from "../../shared/mutations.js";
import type { IslandRegistry } from "../../shared/islands.js";
import { applySoftNavigationDocument } from "../soft-nav.js";
import { hydrateIslands } from "../hydration.js";
import { mutationStore } from "./store.js";

export interface SubmitContext {
  registry?: IslandRegistry;
  fetcherKey: string;
  action: string;
  method?: string;
}

export function readCsrfToken(): string | undefined {
  if (typeof document === "undefined") return undefined;
  const meta = document.querySelector('meta[name="csrf-token"]');
  if (meta?.getAttribute("content")) return meta.getAttribute("content") ?? undefined;
  const match = document.cookie.match(/(?:^|;\s*)csrf=([^;]+)/);
  return match?.[1] ? decodeURIComponent(match[1]) : undefined;
}

function buildBody(
  input: FormData | Record<string, unknown> | URLSearchParams,
  idempotencyKey: string,
  csrf?: string,
): FormData | URLSearchParams | string {
  if (input instanceof FormData) {
    const body = new FormData();
    for (const [key, value] of input.entries()) body.append(key, value);
    body.set(OTOK_IDEMPOTENCY_FIELD, idempotencyKey);
    if (csrf) body.set(OTOK_CSRF_FIELD, csrf);
    return body;
  }
  if (input instanceof URLSearchParams) {
    input.set(OTOK_IDEMPOTENCY_FIELD, idempotencyKey);
    if (csrf) input.set(OTOK_CSRF_FIELD, csrf);
    return input;
  }
  return new URLSearchParams({
    ...Object.fromEntries(Object.entries(input).map(([k, v]) => [k, String(v)])),
    [OTOK_IDEMPOTENCY_FIELD]: idempotencyKey,
    ...(csrf ? { [OTOK_CSRF_FIELD]: csrf } : {}),
  });
}

export async function submitMutation<TAction = unknown, TLoader = unknown>(
  ctx: SubmitContext,
  input: FormData | Record<string, unknown> | URLSearchParams,
  options: MutationSubmitOptions = {},
): Promise<OtokDataResponse<TAction, TLoader>> {
  const idempotencyKey = options.idempotencyKey ?? createIdempotencyKey();
  if (mutationStore.isDoubleSubmit(`${ctx.fetcherKey}:${idempotencyKey}`)) {
    throw new Error("otok: duplicate mutation blocked (double-submit protection).");
  }

  const controller = new AbortController();
  mutationStore.abortStale(ctx.fetcherKey, controller);
  if (options.signal) {
    options.signal.addEventListener("abort", () => controller.abort(), { once: true });
  }

  mutationStore.setMutation(ctx.fetcherKey, {
    key: ctx.fetcherKey,
    state: "submitting",
    formData: input instanceof FormData ? input : input,
    abortController: controller,
    idempotencyKey,
  });

  const optimisticScopes = options.optimistic ? Object.keys(options.optimistic) : [];
  for (const scope of optimisticScopes) {
    mutationStore.applyOptimistic(scope, options.optimistic![scope]);
  }

  const csrf = readCsrfToken();
  const body = buildBody(input, idempotencyKey, csrf);
  const method = (ctx.method ?? "POST").toUpperCase();
  const headers: Record<string, string> = {
    Accept: OTOK_DATA_ACCEPT,
    [OTOK_DATA_HEADER]: "1",
    [OTOK_IDEMPOTENCY_HEADER]: idempotencyKey,
    [OTOK_FETCHER_KEY_HEADER]: ctx.fetcherKey,
  };
  if (csrf) headers[OTOK_CSRF_HEADER] = csrf;

  try {
    mutationStore.setMutation(ctx.fetcherKey, { key: ctx.fetcherKey, state: "loading" });

    const response = await fetchWithProgress(ctx.action, {
      method,
      body,
      headers,
      signal: controller.signal,
      credentials: "same-origin",
      redirect: "manual",
    }, options.onUploadProgress);

    const payload = (await response.json()) as OtokDataResponse<TAction, TLoader>;

    if (payload.error) {
      for (const scope of optimisticScopes) mutationStore.rollbackOptimistic(scope);
      mutationStore.setMutation(ctx.fetcherKey, {
        key: ctx.fetcherKey,
        state: "idle",
        error: payload.error,
        data: payload.actionData,
      });
      return payload;
    }

    for (const scope of optimisticScopes) mutationStore.commitOptimistic(scope);

    if (payload.loaderData !== undefined) {
      mutationStore.setLoaderData(ctx.action, payload.loaderData);
    }

    if (options.revalidateTags?.length) mutationStore.invalidateTags(options.revalidateTags);
    if (options.revalidatePaths?.length) mutationStore.invalidatePaths(options.revalidatePaths);
    if (payload.revalidateTags?.length) mutationStore.invalidateTags(payload.revalidateTags);
    if (payload.revalidatePaths?.length) mutationStore.invalidatePaths(payload.revalidatePaths);

    mutationStore.setMutation(ctx.fetcherKey, {
      key: ctx.fetcherKey,
      state: "idle",
      data: payload.actionData,
      error: undefined,
    });

    if (payload.redirect && options.navigate !== false && ctx.registry) {
      await navigateAfterMutation(payload.redirect, ctx.registry, { replace: options.replace });
    }

    return payload;
  } catch (error) {
    for (const scope of optimisticScopes) mutationStore.rollbackOptimistic(scope);
    mutationStore.setMutation(ctx.fetcherKey, {
      key: ctx.fetcherKey,
      state: "idle",
      error,
    });
    throw error;
  }
}

async function fetchWithProgress(
  url: string,
  init: RequestInit,
  onProgress?: MutationSubmitOptions["onUploadProgress"],
): Promise<Response> {
  if (!onProgress || !(init.body instanceof FormData)) {
    return fetch(url, init);
  }

  const hasFile = [...(init.body as FormData).values()].some((v) => v instanceof File);
  if (!hasFile || typeof XMLHttpRequest === "undefined") {
    return fetch(url, init);
  }

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open(init.method ?? "POST", url);
    for (const [key, value] of Object.entries(init.headers ?? {})) {
      xhr.setRequestHeader(key, value);
    }
    xhr.withCredentials = true;
    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable) return;
      onProgress({
        loaded: event.loaded,
        total: event.total,
        percent: Math.round((event.loaded / event.total) * 100),
      });
    };
    xhr.onload = () => {
      resolve(new Response(xhr.responseText, {
        status: xhr.status,
        headers: { "content-type": xhr.getResponseHeader("content-type") ?? OTOK_DATA_ACCEPT },
      }));
    };
    xhr.onerror = () => reject(new Error("otok: upload failed."));
    xhr.onabort = () => reject(new DOMException("Aborted", "AbortError"));
    if (init.signal) {
      init.signal.addEventListener("abort", () => xhr.abort(), { once: true });
    }
    xhr.send(init.body as FormData);
  });
}

export async function revalidateLoader(
  url: string,
  signal?: AbortSignal,
): Promise<OtokDataResponse> {
  const response = await fetch(url, {
    signal,
    headers: { Accept: OTOK_DATA_ACCEPT, [OTOK_DATA_HEADER]: "1" },
    credentials: "same-origin",
  });
  const payload = (await response.json()) as OtokDataResponse;
  if (payload.loaderData !== undefined) {
    mutationStore.setLoaderData(url, payload.loaderData);
  }
  return payload;
}

async function navigateAfterMutation(
  url: string,
  registry: IslandRegistry,
  options: { replace?: boolean },
): Promise<void> {
  const response = await fetch(url, {
    headers: { Accept: "text/html" },
    credentials: "same-origin",
    redirect: "follow",
  });
  const html = await response.text();
  const doc = new DOMParser().parseFromString(html, "text/html");
  applySoftNavigationDocument(doc);
  await hydrateIslands(document, registry);

  const final = new URL(response.url || url, window.location.href);
  const historyPath = `${final.pathname}${final.search}${final.hash}`;
  const state = { otokSoftNav: true, url: historyPath };
  if (options.replace) history.replaceState(state, "", historyPath);
  else history.pushState(state, "", historyPath);
}
