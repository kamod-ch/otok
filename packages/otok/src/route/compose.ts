import type { LoaderResult, OtokContext, OtokLoader } from "../shared/routes.js";

export type LoaderEnhancer = <Data extends LoaderResult>(
  loader: OtokLoader<Data>,
) => OtokLoader<Data>;

/**
 * Compose loader enhancers around a base handler.
 * Enhancers listed later wrap outer (they run first and may inject context for inner enhancers).
 */
export function composeLoader<Data extends LoaderResult>(
  handler: (ctx: OtokContext) => Data | Promise<Data>,
  ...enhancers: LoaderEnhancer[]
): OtokLoader<Data> {
  const base = handler as OtokLoader<Data>;
  return enhancers.reduce((loader, enhance) => enhance(loader), base);
}

/** Add fields to the loader context before invoking the inner loader. */
export function loaderEnhancer<TExtra extends object>(
  extend: (ctx: OtokContext) => Promise<TExtra> | TExtra,
): LoaderEnhancer {
  return (loader) => async (ctx) => {
    const extra = await extend(ctx);
    return loader({ ...ctx, ...extra } as OtokContext);
  };
}
