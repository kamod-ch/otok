import type { LoaderResult, OtokActionContext, OtokContext, OtokLoader } from "otok/server";
import { readI18n } from "./middleware.js";
import type { I18nContext } from "./types.js";

type LoaderI18nContext = {
  i18n: I18nContext;
};

type ActionI18nContext = LoaderI18nContext;

function resolveI18n(hono: OtokContext["hono"], contextKey = "i18n"): I18nContext {
  const ctx = readI18n(hono, contextKey);
  if (!ctx) {
    throw new Error(
      "otok-i18n: defineLoader requires i18n() plugin or createI18nMiddleware(). " +
        "Use loader: ({ hono }) => readI18n(hono) for manual wiring.",
    );
  }
  return ctx;
}

/**
 * Wrap a loader with typed `i18n` from the Hono context.
 *
 * ```ts
 * export const loader = defineLoader(async ({ i18n }) => ({
 *   locale: i18n.locale,
 *   title: i18n.t("dashboard.welcome"),
 *   i18n: i18n.toClientPayload(),
 * }));
 * ```
 */
export function defineLoader<Data extends LoaderResult>(
  handler: (ctx: OtokContext & LoaderI18nContext) => Data | Promise<Data>,
): OtokLoader<Data> {
  return (context) => handler({ ...context, i18n: resolveI18n(context.hono) });
}

export function defineAction<Result>(
  handler: (ctx: OtokActionContext & ActionI18nContext) => Result | Promise<Result>,
): (context: OtokActionContext) => Result | Promise<Result> {
  return (context) => handler({ ...context, i18n: resolveI18n(context.hono) });
}

/** Serialize i18n for client islands — call from loaders. */
export function serializeI18n(hono: OtokContext["hono"], contextKey = "i18n") {
  return resolveI18n(hono, contextKey).toClientPayload();
}
