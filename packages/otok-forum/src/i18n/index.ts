import type { ForumLocale, ForumMessageAdapter, ForumMessages } from "../types.js";
import { deMessages } from "./de.js";
import { enMessages } from "./en.js";

const CATALOGS: Record<ForumLocale, ForumMessages> = {
  en: enMessages,
  de: deMessages,
};

export function createMessageAdapter(locale: ForumLocale = "en"): ForumMessageAdapter {
  const catalog = CATALOGS[locale] ?? CATALOGS.en;
  return {
    locale,
    t(key, params) {
      let text = catalog[key] ?? CATALOGS.en[key] ?? key;
      if (params) {
        for (const [k, v] of Object.entries(params)) {
          text = text.replaceAll(`{${k}}`, String(v));
        }
      }
      return text;
    },
  };
}

export { enMessages, deMessages };
