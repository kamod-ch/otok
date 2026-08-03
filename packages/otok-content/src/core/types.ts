import type { ZodType, output } from "zod";

/** Validated content entry from a collection scan. */
export interface ContentEntry<TData = unknown> {
  /** Stable content id (path within collection). */
  id: string;
  /** URL slug segment for routing. */
  slug: string;
  /** Public URL path. */
  route: string;
  relativePath: string;
  file: string;
  locale?: string;
  collection: string;
  data: TData;
  /** Pre-rendered HTML (build-time markdown/mdx). */
  html?: string;
  /** Table of contents headings. */
  toc?: TocItem[];
  /** Git-derived timestamps when enabled. */
  git?: GitTimestamps;
}

export interface TocItem {
  id: string;
  text: string;
  level: number;
}

export interface GitTimestamps {
  createdAt?: string;
  updatedAt?: string;
}

export type CollectionSortFn<TData = unknown> = (a: ContentEntry<TData>, b: ContentEntry<TData>) => number;

export type CollectionSortOption =
  | "slug:asc"
  | "slug:desc"
  | "date:asc"
  | "date:desc"
  | "order:asc"
  | "order:desc"
  | CollectionSortFn;

export type CollectionFilterFn<TData = unknown> = (entry: ContentEntry<TData>) => boolean;

export interface CollectionDefinition<TSchema extends ZodType = ZodType> {
  readonly __kind: "otok-collection";
  name?: string;
  /** Glob patterns relative to content root (e.g. content/posts/all markdown files) */
  source: string | string[];
  schema: TSchema;
  includeDrafts?: boolean;
  sort?: CollectionSortOption | CollectionSortFn;
  references?: Record<string, string>;
  /** Computed fields derived from validated data + file metadata. */
  computed?: Record<string, ComputedField<TSchema>>;
  /** Cache tag for Otok revalidation. */
  cacheTag?: string;
}

export type ComputedField<TSchema extends ZodType> = (
  entry: ContentEntry<output<TSchema>>,
) => unknown | Promise<unknown>;

export interface ContentCollectionsConfig {
  root?: string;
  collections: Record<string, CollectionDefinition>;
  locales?: string[];
  defaultLocale?: string;
  mdx?: boolean;
  gitDates?: boolean;
  incremental?: boolean;
}

export interface ContentManifest {
  version: 1;
  generatedAt: string;
  root: string;
  collections: Record<string, SerializedCollection>;
  searchIndex?: SearchIndexEntry[];
}

export interface SerializedCollection {
  name: string;
  cacheTag: string;
  entries: SerializedEntry[];
}

export interface SerializedEntry {
  id: string;
  slug: string;
  route: string;
  relativePath: string;
  file: string;
  locale?: string;
  data: unknown;
  html?: string;
  toc?: TocItem[];
  git?: GitTimestamps;
}

export interface SearchIndexEntry {
  collection: string;
  id: string;
  slug: string;
  route: string;
  title: string;
  excerpt?: string;
  locale?: string;
}

export interface PaginationResult<TData = unknown> {
  entries: ContentEntry<TData>[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export type InferCollectionData<T> = T extends CollectionDefinition<infer S> ? output<S> : never;

export type InferCollectionEntry<T> = ContentEntry<InferCollectionData<T>>;

/** Remote content source — implement for CMS, git sync, etc. */
export interface RemoteContentSource {
  readonly name: string;
  list(collection: string): Promise<RemoteContentFile[]>;
}

export interface RemoteContentFile {
  path: string;
  body: string;
  updatedAt?: string;
}

export interface IncrementalState {
  version: 1;
  files: Record<string, { hash: string; mtimeMs: number }>;
}
