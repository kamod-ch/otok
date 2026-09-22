export interface CacheConfig {
  /** Browser max-age in seconds. */
  maxAge?: number;
  /** CDN/shared max-age in seconds. */
  sMaxAge?: number;
  /** stale-while-revalidate in seconds. */
  staleWhileRevalidate?: number;
  /** Force private cache (default when auth/session/cookies detected). */
  private?: boolean;
  /** Force public cache (never use with personalized responses). */
  public?: boolean;
  /** Cache tags for on-demand revalidation. */
  tags?: string[];
  /** Skip caching entirely. */
  noStore?: boolean;
  /** Vary response by these request headers. */
  vary?: string[];
}

export interface CacheEntry<T = string> {
  value: T;
  tags: string[];
  path: string;
  createdAt: number;
  maxAge: number;
  staleWhileRevalidate: number;
  private: boolean;
}

export interface CacheLookupResult<T = string> {
  hit: "fresh" | "stale" | "miss";
  entry?: CacheEntry<T>;
}

export interface CacheProvider {
  readonly name: string;
  get(key: string): Promise<CacheLookupResult | undefined>;
  set(key: string, entry: CacheEntry): Promise<void>;
  delete(key: string): Promise<boolean>;
  deleteByTag(tag: string): Promise<number>;
  deleteByPath(path: string): Promise<number>;
}

export interface CacheKeyInput {
  method: string;
  /** Stable route identifier (file route id), not the request pathname. */
  routeId: string;
  /** Request pathname (no query). */
  requestPath: string;
  /** Query string entries in request order (multi-value keys preserved). */
  query: ReadonlyArray<readonly [string, string]>;
  /** Shared (anonymous) HTML cache entry. */
  shared: boolean;
  userId?: string;
  tenantId?: string;
  scopeLocale?: string;
  varyHeaders?: Record<string, string>;
}

/** @deprecated Legacy fields — do not use for new keys. */
export interface LegacyCacheKeyInput {
  method: string;
  pathname: string;
  params: Record<string, string>;
  locale?: string;
  tenant?: string;
  varyHeaders?: Record<string, string | undefined>;
  private: boolean;
}

export interface RevalidationResult {
  tag?: string;
  path?: string;
  invalidated: number;
}
