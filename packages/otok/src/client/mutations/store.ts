import type { FetcherState, OtokDataResponse } from "../../shared/mutations.js";

export interface MutationEntry<TData = unknown, TError = unknown> {
  key: string;
  state: FetcherState;
  data?: TData;
  error?: TError;
  formData?: FormData | Record<string, unknown> | URLSearchParams;
  version: number;
  abortController?: AbortController;
  idempotencyKey?: string;
}

export interface OptimisticPatch {
  key: string;
  scope: string;
  data: unknown;
  previous?: unknown;
  version: number;
}

export interface LoaderCacheEntry {
  route: string;
  data: unknown;
  tags: string[];
  version: number;
}

type Listener = () => void;

class MutationStore {
  private mutations = new Map<string, MutationEntry>();
  private optimistic = new Map<string, OptimisticPatch>();
  private loaderCache = new Map<string, LoaderCacheEntry>();
  private listeners = new Set<Listener>();
  private globalVersion = 0;
  private submitTimestamps = new Map<string, number>();
  readonly doubleSubmitWindowMs = 500;

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  getSnapshot(): number {
    return this.globalVersion;
  }

  private bump(): void {
    this.globalVersion += 1;
    for (const listener of this.listeners) listener();
  }

  getMutation(key: string): MutationEntry | undefined {
    return this.mutations.get(key);
  }

  setMutation(key: string, patch: Partial<MutationEntry> & { key?: string }): void {
    const current = this.mutations.get(key);
    this.mutations.set(key, {
      state: "idle",
      ...current,
      ...patch,
      key,
      version: (current?.version ?? 0) + 1,
    });
    this.bump();
  }

  clearMutation(key: string): void {
    this.mutations.delete(key);
    this.bump();
  }

  isDoubleSubmit(key: string): boolean {
    const last = this.submitTimestamps.get(key);
    const now = Date.now();
    if (last !== undefined && now - last < this.doubleSubmitWindowMs) return true;
    this.submitTimestamps.set(key, now);
    return false;
  }

  applyOptimistic(scope: string, data: unknown): OptimisticPatch {
    const key = `${scope}:${this.globalVersion}`;
    const previous = this.getLoaderData(scope);
    const patch: OptimisticPatch = { key, scope, data, previous, version: this.globalVersion };
    this.optimistic.set(scope, patch);
    this.bump();
    return patch;
  }

  rollbackOptimistic(scope: string): void {
    const patch = this.optimistic.get(scope);
    if (!patch) return;
    if (patch.previous !== undefined) {
      this.setLoaderData(scope, patch.previous, []);
    }
    this.optimistic.delete(scope);
    this.bump();
  }

  commitOptimistic(scope: string): void {
    const patch = this.optimistic.get(scope);
    if (!patch) return;
    this.setLoaderData(scope, patch.data, []);
    this.optimistic.delete(scope);
    this.bump();
  }

  getLoaderData(route: string): unknown {
    const cached = this.loaderCache.get(route);
    const optimistic = this.optimistic.get(route);
    if (optimistic) return optimistic.data;
    return cached?.data;
  }

  setLoaderData(route: string, data: unknown, tags: string[] = []): void {
    const current = this.loaderCache.get(route);
    this.loaderCache.set(route, {
      route,
      data,
      tags,
      version: (current?.version ?? 0) + 1,
    });
    this.bump();
  }

  mergeLoaderData(route: string, patch: Record<string, unknown>): void {
    const current = (this.getLoaderData(route) ?? {}) as Record<string, unknown>;
    this.setLoaderData(route, { ...current, ...patch });
  }

  invalidateTags(tags: string[]): void {
    for (const [route, entry] of this.loaderCache) {
      if (entry.tags.some((tag) => tags.includes(tag))) {
        this.loaderCache.delete(route);
      }
    }
    this.bump();
  }

  invalidatePaths(paths: string[]): void {
    for (const path of paths) {
      this.loaderCache.delete(path);
    }
    this.bump();
  }

  abortStale(key: string, controller: AbortController): void {
    const current = this.mutations.get(key);
    if (current?.abortController && current.abortController !== controller) {
      current.abortController.abort();
    }
  }
}

export const mutationStore = new MutationStore();

export type { OtokDataResponse };
