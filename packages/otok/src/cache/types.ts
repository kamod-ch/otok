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
