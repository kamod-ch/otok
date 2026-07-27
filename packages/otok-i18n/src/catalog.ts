import { interpolate } from "./interpolate.js";
import { extractCount, pickPluralMessage } from "./plural.js";
import type { FlatMessages, TranslateValues, Translator } from "./types.js";

export type { FlatMessages, TranslateValues, Translator } from "./types.js";

export type MessageCatalog<Locales extends string = string> = Record<Locales, FlatMessages>;

export interface CreateTranslatorOptions {
  warnMissingKeys?: boolean;
  onMissingKey?: (key: string, locale: string) => void;
}

function resolveMessage(
  messages: FlatMessages,
  fallbackMessages: FlatMessages,
  locale: string,
  key: string,
  values?: TranslateValues,
  explicitFallback?: string,
): string | undefined {
  const count = extractCount(values);

  if (count != null) {
    const plural =
      pickPluralMessage(messages, key, locale, count) ??
      pickPluralMessage(fallbackMessages, key, locale, count);
    if (plural != null) return interpolate(plural, { ...values, count });
  }

  const primary = messages[key];
  if (primary != null && primary !== "") return interpolate(primary, values);

  const secondary = fallbackMessages[key];
  if (secondary != null && secondary !== "") return interpolate(secondary, values);

  if (explicitFallback != null && explicitFallback !== "") return explicitFallback;
  return undefined;
}

export function createTranslator(
  messages: FlatMessages,
  locale: string,
  fallbackLocale: string,
  fallbackMessages: FlatMessages = {},
  options: CreateTranslatorOptions = {},
): Translator {
  const warn = options.warnMissingKeys ?? process.env.NODE_ENV !== "production";
  const warned = new Set<string>();

  return (key: string, values?: TranslateValues, explicitFallback?: string) => {
    const resolved = resolveMessage(messages, fallbackMessages, locale, key, values, explicitFallback);
    if (resolved != null) return resolved;

    if (warn && !warned.has(key)) {
      warned.add(key);
      options.onMissingKey?.(key, locale);
      if (process.env.NODE_ENV !== "production") {
        console.warn(`[otok-i18n] missing key "${key}" for locale "${locale}"`);
      }
    }

    return explicitFallback ?? key;
  };
}

/** Extract typed keys from a flat message object. */
export type TranslationKey<M extends FlatMessages> = Extract<keyof M, string>;

/** Flatten nested object keys into dot notation for typed catalogs. */
export type FlattenKeys<T, Prefix extends string = ""> = T extends string
  ? Prefix extends "" ? never : Prefix
  : {
      [K in keyof T & string]: T[K] extends string
        ? Prefix extends ""
          ? K
          : `${Prefix}.${K}`
        : FlattenKeys<T[K], Prefix extends "" ? K : `${Prefix}.${K}`>;
    }[keyof T & string];

export { resolveMessage };
