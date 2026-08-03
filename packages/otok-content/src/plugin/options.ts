import type { CollectionDefinition } from "../core/types.js";

export interface ContentPluginOptions {
  /** Content root directory relative to project root. */
  root?: string;
  /** Inline collection registry. */
  collections?: Record<string, CollectionDefinition>;
  /** Path to content config module exporting `collections`. */
  config?: string;
  /** Enable MDX compilation at build time. */
  mdx?: boolean;
  /** Include draft entries in manifest. */
  includeDrafts?: boolean;
  /** Derive created/updated dates from git history. */
  gitDates?: boolean;
  /** Track file fingerprints for incremental rebuilds. */
  incremental?: boolean;
  /** Supported content locales (first path segment). */
  locales?: string[];
  defaultLocale?: string;
  /** Site origin for feeds and sitemap URLs. */
  origin?: string;
  /** Register RSS/Atom feed routes. */
  feeds?: boolean | { rss?: boolean; atom?: boolean; collection?: string };
  /** Expose search index JSON route. */
  search?: boolean;
  /** Register sitemap URL entries via otok-seo integration hook. */
  sitemap?: boolean;
  /** Live reload collections in dev (rebuild manifest on file changes). */
  live?: boolean;
}

export const DEFAULT_CONTENT_OPTIONS: Required<
  Pick<ContentPluginOptions, "root" | "mdx" | "includeDrafts" | "gitDates" | "incremental" | "live" | "search" | "sitemap">
> = {
  root: "content",
  mdx: true,
  includeDrafts: false,
  gitDates: true,
  incremental: true,
  live: true,
  search: true,
  sitemap: true,
};

export function normalizeContentOptions(
  input: ContentPluginOptions,
): ContentPluginOptions & typeof DEFAULT_CONTENT_OPTIONS {
  return {
    ...DEFAULT_CONTENT_OPTIONS,
    ...input,
  };
}

export const MANIFEST_VIRTUAL_ID = "virtual:otok-content/manifest";
