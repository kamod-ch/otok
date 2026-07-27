import type { OtokHead } from "otok/server";

/** Merge `lang` into an Otok head result for `<html lang="…">`. */
export function i18nHead(locale: string, extra: OtokHead = {}): OtokHead {
  return {
    ...extra,
    lang: locale,
  };
}
