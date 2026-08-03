import { useCallback, useEffect, useMemo, useState } from "preact/hooks";
import type { JSX } from "preact";
import {
  createIdempotencyKey,
  OTOK_FETCHER_ATTR,
  OTOK_IDEMPOTENCY_FIELD,
  type ActionDescriptor,
  type FetcherState,
  type MutationSubmitOptions,
  type OtokDataResponse,
} from "../../shared/mutations.js";
import type { IslandRegistry } from "../../shared/islands.js";
import { mutationStore } from "./store.js";
import { readCsrfToken, revalidateLoader, submitMutation } from "./fetch.js";

let fetcherCounter = 0;
let globalRegistry: IslandRegistry | undefined;

export function setMutationRegistry(registry: IslandRegistry): void {
  globalRegistry = registry;
}

function useMutationSnapshot(key: string) {
  const [, rerender] = useState(0);
  useEffect(() => mutationStore.subscribe(() => rerender((n) => n + 1)), []);
  return mutationStore.getMutation(key);
}

export interface UseActionOptions {
  action?: string;
  method?: ActionDescriptor["method"];
  key?: string;
}

export interface ActionHandle<TAction = unknown, TLoader = unknown> {
  state: FetcherState;
  data: TAction | undefined;
  error: unknown;
  submit: (
    input: FormData | Record<string, unknown>,
    options?: MutationSubmitOptions,
  ) => Promise<OtokDataResponse<TAction, TLoader>>;
  reset: () => void;
}

export function useAction<TAction = unknown, TLoader = unknown>(
  descriptor?: string | ActionDescriptor,
  options: UseActionOptions = {},
): ActionHandle<TAction, TLoader> {
  const actionPath = typeof descriptor === "string"
    ? descriptor
    : descriptor?.action ?? options.action ?? (typeof window !== "undefined" ? window.location.pathname : "/");
  const method = typeof descriptor === "object" ? descriptor.method : options.method;
  const key = options.key ?? `action:${actionPath}:${method ?? "POST"}`;

  const entry = useMutationSnapshot(key);

  const submit = useCallback(
    async (input: FormData | Record<string, unknown>, submitOptions: MutationSubmitOptions = {}) => {
      return submitMutation<TAction, TLoader>(
        { fetcherKey: key, action: actionPath, method, registry: globalRegistry },
        input,
        { navigate: true, ...submitOptions },
      );
    },
    [actionPath, key, method],
  );

  const reset = useCallback(() => mutationStore.clearMutation(key), [key]);

  return {
    state: entry?.state ?? "idle",
    data: entry?.data as TAction | undefined,
    error: entry?.error,
    submit,
    reset,
  };
}

export interface FetcherFormProps extends JSX.HTMLAttributes<HTMLFormElement> {
  method?: "get" | "post";
  action?: string;
}

export interface FetcherHandle<TAction = unknown, TLoader = unknown> {
  key: string;
  state: FetcherState;
  data: TAction | undefined;
  error: unknown;
  formProps: FetcherFormProps;
  submit: (
    input?: FormData | Record<string, unknown>,
    options?: MutationSubmitOptions,
  ) => Promise<OtokDataResponse<TAction, TLoader>>;
  load: (url?: string) => Promise<OtokDataResponse<TLoader>>;
  Form: (props: JSX.HTMLAttributes<HTMLFormElement>) => JSX.Element;
}

export function useFetcher<TAction = unknown, TLoader = unknown>(
  action?: string,
): FetcherHandle<TAction, TLoader> {
  const fetcherKey = useMemo(() => `fetcher:${++fetcherCounter}`, []);
  const actionPath = action ?? (typeof window !== "undefined" ? window.location.pathname : "/");
  const entry = useMutationSnapshot(fetcherKey);

  const submit = useCallback(
    async (input: FormData | Record<string, unknown> = {}, submitOptions: MutationSubmitOptions = {}) => {
      return submitMutation<TAction, TLoader>(
        { fetcherKey, action: actionPath, registry: globalRegistry },
        input,
        { navigate: false, ...submitOptions },
      );
    },
    [actionPath, fetcherKey],
  );

  const load = useCallback(
    async (url?: string) => revalidateLoader(url ?? actionPath) as Promise<OtokDataResponse<TLoader>>,
    [actionPath],
  );

  const formProps: FetcherFormProps = useMemo(() => {
    const csrf = readCsrfToken();
    return {
      method: "post",
      action: actionPath,
      [OTOK_FETCHER_ATTR]: fetcherKey,
      "aria-busy": (entry?.state ?? "idle") !== "idle" ? true : undefined,
      onSubmit: (event) => {
        event.preventDefault();
        const form = event.currentTarget as HTMLFormElement;
        const data = new FormData(form);
        data.set(OTOK_IDEMPOTENCY_FIELD, createIdempotencyKey());
        const token = readCsrfToken();
        if (token) data.set("_csrf", token);
        void submit(data);
      },
    };
  }, [actionPath, entry?.state, fetcherKey, submit]);

  const Form = useCallback(
    (props: JSX.HTMLAttributes<HTMLFormElement>) => <form {...formProps} {...props} />,
    [formProps],
  );

  return {
    key: fetcherKey,
    state: entry?.state ?? "idle",
    data: entry?.data as TAction | undefined,
    error: entry?.error,
    formProps,
    submit,
    load,
    Form,
  };
}

export function useRevalidator(route?: string) {
  const path = route ?? (typeof window !== "undefined" ? window.location.pathname : "/");
  const revalidate = useCallback(
    (options?: { tags?: string[]; paths?: string[] }) => {
      if (options?.tags?.length) mutationStore.invalidateTags(options.tags);
      if (options?.paths?.length) mutationStore.invalidatePaths(options.paths);
      return revalidateLoader(path);
    },
    [path],
  );
  return { revalidate };
}

export interface BlockerOptions {
  when: boolean | (() => boolean);
  message?: string;
}

export function useNavigationBlocker(options: BlockerOptions): void {
  const when = typeof options.when === "function" ? options.when() : options.when;

  useEffect(() => {
    if (typeof window === "undefined" || !when) return;

    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = options.message ?? "";
    };

    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [when, options.message]);
}

export function useLoaderData<T>(route?: string): T | undefined {
  const path = route ?? (typeof window !== "undefined" ? window.location.pathname : "/");
  const [, rerender] = useState(0);
  useEffect(() => mutationStore.subscribe(() => rerender((n) => n + 1)), []);
  return mutationStore.getLoaderData(path) as T | undefined;
}
