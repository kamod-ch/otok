import type { LoaderResult, OtokHead, OtokPageProps } from "otok/server";
import { resolveMetaToHead, type ResolveMetaOptions } from "./resolve.js";
import type { MetaContext, RouteMeta } from "./types.js";

export interface DefineMetaOptions extends ResolveMetaOptions {
  /** Resolve locale from loader data or Hono context. */
  getLocale?: (ctx: MetaContext) => string | undefined;
}

/**
 * Define typed route metadata that resolves into an Otok `head` export.
 *
 * ```ts
 * export const head = defineMeta(({ data, locale }) => ({
 *   title: data.product.name,
 *   description: data.product.description,
 *   canonical: `/products/${data.product.slug}`,
 *   openGraph: { type: "product" },
 * }));
 * ```
 */
export function defineMeta<Data extends LoaderResult = LoaderResult>(
  resolver: (ctx: MetaContext<Data>) => RouteMeta | Promise<RouteMeta>,
  options: DefineMetaOptions = {},
): (props: OtokPageProps<Data>) => Promise<OtokHead> {
  return async (props) => {
    const ctx: MetaContext<Data> = {
      data: props.data,
      params: props.params,
      route: props.route,
      locale: options.getLocale?.({
        data: props.data,
        params: props.params,
        route: props.route,
        origin: options.origin,
      }),
      origin: options.origin,
    };

    const meta = await resolver(ctx);
    if (ctx.locale && !meta.lang) meta.lang = ctx.locale;

    return resolveMetaToHead(meta, options);
  };
}

/** Alias for route modules that export `meta` instead of `head`. */
export const meta = defineMeta;
