import type { Context } from "hono";
import type { LoaderResult, OtokContext, OtokLoader } from "@kamod-ch/otok/server";
import { getSeoRuntime, readSeoOrigin } from "./registry.js";
import type { MetaContext } from "./types.js";

type SeoLoaderContext = {
  seo: {
    origin: string;
    locale?: string;
  };
};

function resolveSeoContext(hono: OtokContext["hono"]): SeoLoaderContext["seo"] {
  const runtime = getSeoRuntime();
  const origin = readSeoOrigin(hono) ?? runtime.origin;
  const i18n = hono.get("i18n" as never) as { locale?: string } | undefined;
  return { origin, locale: i18n?.locale };
}

/** Wrap a loader with typed SEO context (origin, locale). */
export function defineLoader<Data extends LoaderResult>(
  handler: (ctx: OtokContext & SeoLoaderContext) => Data | Promise<Data>,
): OtokLoader<Data> {
  return (context) => handler({ ...context, seo: resolveSeoContext(context.hono) });
}

/** Build meta context from a Hono request — useful in OG image routes. */
export function createMetaContext(c: Context, partial: Partial<MetaContext> = {}): MetaContext {
  const runtime = getSeoRuntime();
  const i18n = c.get("i18n" as never) as { locale?: string } | undefined;
  return {
    data: partial.data ?? {},
    params: partial.params ?? {},
    route: partial.route ?? new URL(c.req.url).pathname,
    locale: partial.locale ?? i18n?.locale,
    origin: partial.origin ?? readSeoOrigin(c) ?? runtime.origin,
  };
}
