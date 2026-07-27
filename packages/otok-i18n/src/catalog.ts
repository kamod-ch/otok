export type MessageCatalog<Locales extends string = string> = Record<Locales, Record<string, string>>;

export type Translator = (key: string, fallback?: string) => string;

function resolveMessage(
  catalog: MessageCatalog,
  locale: string,
  defaultLocale: string,
  key: string,
  fallback?: string,
): string {
  const primary = catalog[locale]?.[key];
  if (primary != null && primary !== "") return primary;
  const secondary = catalog[defaultLocale]?.[key];
  if (secondary != null && secondary !== "") return secondary;
  if (fallback != null && fallback !== "") return fallback;
  return key;
}

export function createTranslator<Catalog extends MessageCatalog>(
  catalog: Catalog,
  locale: keyof Catalog & string,
  defaultLocale: keyof Catalog & string,
): Translator {
  return (key: string, fallback?: string) => resolveMessage(catalog, locale, defaultLocale, key, fallback);
}
