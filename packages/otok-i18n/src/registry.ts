import type { I18nPluginOptions, I18nContext, RoutingMode } from "./types.js";
import type { MessageLoader, NamespaceLoader } from "./types.js";

export interface I18nRuntime {
  options: NormalizedI18nOptions;
  getContext: () => I18nContext | undefined;
}

export interface NormalizedI18nOptions {
  locales: readonly string[];
  defaultLocale: string;
  fallbackLocale: string;
  routing: RoutingMode;
  domains: Record<string, string>;
  messages: Record<string, MessageLoader | NamespaceLoader>;
  paramKey: string;
  cookieName: string;
  contextKey: string;
  persistLocale: boolean;
  warnMissingKeys: boolean;
  redirectUnknownLocale: boolean;
  cookieMaxAge: number;
}

let runtime: I18nRuntime | undefined;

export function normalizePluginOptions<Locales extends readonly string[]>(
  options: I18nPluginOptions<Locales>,
): NormalizedI18nOptions {
  return {
    locales: options.locales,
    defaultLocale: options.defaultLocale,
    fallbackLocale: options.fallbackLocale ?? options.defaultLocale,
    routing: options.routing ?? "prefix-except-default",
    domains: (options.domains ?? {}) as Record<string, string>,
    messages: options.messages as Record<string, MessageLoader | NamespaceLoader>,
    paramKey: options.paramKey ?? "lang",
    cookieName: options.cookieName ?? "locale",
    contextKey: options.contextKey ?? "i18n",
    persistLocale: options.persistLocale ?? true,
    warnMissingKeys: options.warnMissingKeys ?? process.env.NODE_ENV !== "production",
    redirectUnknownLocale: options.redirectUnknownLocale ?? true,
    cookieMaxAge: options.cookieMaxAge ?? 60 * 60 * 24 * 365,
  };
}

export function registerI18nRuntime(next: I18nRuntime): void {
  runtime = next;
}

export function getI18nRuntime(): I18nRuntime {
  if (!runtime) {
    throw new Error(
      "otok-i18n: i18n() plugin not registered. Add i18n() to otok.config.ts plugins.",
    );
  }
  return runtime;
}

export function tryGetI18nRuntime(): I18nRuntime | undefined {
  return runtime;
}

export function clearI18nRuntime(): void {
  runtime = undefined;
}
