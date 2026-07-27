import type { TranslateValues } from "./types.js";

const PLURAL_SUFFIXES = ["zero", "one", "two", "few", "many", "other"] as const;

const pluralRulesCache = new Map<string, Intl.PluralRules>();

function getPluralRules(locale: string): Intl.PluralRules {
  const cached = pluralRulesCache.get(locale);
  if (cached) return cached;
  const rules = new Intl.PluralRules(locale);
  pluralRulesCache.set(locale, rules);
  return rules;
}

export function resolvePluralKey(baseKey: string, locale: string, count: number): string {
  const category = getPluralRules(locale).select(count);
  const specific = `${baseKey}.${category}`;
  return specific;
}

export function pickPluralMessage(
  messages: Record<string, string>,
  baseKey: string,
  locale: string,
  count: number,
): string | undefined {
  const category = getPluralRules(locale).select(count);
  const candidates = [`${baseKey}.${category}`, ...PLURAL_SUFFIXES.map((s) => `${baseKey}.${s}`)];
  for (const key of candidates) {
    const value = messages[key];
    if (value != null && value !== "") return value;
  }
  const direct = messages[baseKey];
  if (direct != null && direct !== "") return direct;
  return undefined;
}

export function extractCount(values?: TranslateValues): number | undefined {
  if (values == null || !("count" in values)) return undefined;
  const count = values.count;
  if (typeof count === "number" && Number.isFinite(count)) return count;
  if (typeof count === "string") {
    const parsed = Number.parseFloat(count);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}
