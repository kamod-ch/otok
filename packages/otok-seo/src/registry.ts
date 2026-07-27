import type { Context } from "hono";
import type { SeoPluginOptions } from "./types.js";

let runtime: NormalizedSeoOptions | null = null;

export interface NormalizedSeoOptions extends SeoPluginOptions {
  origin: string;
  robotsEnabled: boolean;
  sitemapEnabled: boolean;
}

export function normalizeSeoOptions(options: SeoPluginOptions): NormalizedSeoOptions {
  if (!options.origin || typeof options.origin !== "string") {
    throw new Error("seo() requires origin: string (absolute site URL)");
  }

  const sitemapPaths = options.sitemapPaths ?? [];
  const sitemapEnabled = options.sitemap !== false && sitemapPaths.length > 0;
  const robotsEnabled = options.robots !== false;

  return {
    ...options,
    origin: options.origin.replace(/\/$/, ""),
    sitemapPaths,
    robotsEnabled,
    sitemapEnabled,
  };
}

export function registerSeoRuntime(options: NormalizedSeoOptions): void {
  runtime = options;
}

export function getSeoRuntime(): NormalizedSeoOptions {
  if (!runtime) {
    throw new Error("otok-seo: plugin not registered. Add seo() to otok.config.ts plugins.");
  }
  return runtime;
}

export function tryGetSeoRuntime(): NormalizedSeoOptions | null {
  return runtime;
}

export function readSeoOrigin(c: Context, contextKey = "seoOrigin"): string | undefined {
  return c.get(contextKey) as string | undefined;
}

export function resetSeoRuntimeForTests(): void {
  runtime = null;
}
