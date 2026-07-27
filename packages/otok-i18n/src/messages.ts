import type { FlatMessages, MessageLoader, NamespaceLoader } from "./types.js";

export type { MessageLoader, NamespaceLoader } from "./types.js";

function isNamespaceLoader(loader: MessageLoader | NamespaceLoader): loader is NamespaceLoader {
  return typeof loader === "object" && !("then" in loader) && typeof loader !== "function";
}

async function resolveLoader(loader: MessageLoader): Promise<FlatMessages> {
  const result = await loader();
  if (typeof result === "string") return {};
  if (result && typeof result === "object" && "default" in result) {
    const value = result.default;
    if (value && typeof value === "object") return value;
    return {};
  }
  return result as FlatMessages;
}

/** Flatten nested namespace loaders into a single message map. */
export async function loadLocaleMessages(
  loader: MessageLoader | NamespaceLoader,
  namespaces?: string[],
): Promise<FlatMessages> {
  if (!isNamespaceLoader(loader)) {
    return resolveLoader(loader);
  }

  const keys = namespaces ?? Object.keys(loader);
  const merged: FlatMessages = {};

  for (const ns of keys) {
    const nsLoader = loader[ns];
    if (!nsLoader) continue;
    const messages = await resolveLoader(nsLoader);
    for (const [key, value] of Object.entries(messages)) {
      merged[`${ns}.${key}`] = value;
      merged[key] = value;
    }
  }

  return merged;
}

const messageCache = new Map<string, FlatMessages>();

export function cacheKey(locale: string, namespaces?: string[]): string {
  return namespaces?.length ? `${locale}:${namespaces.sort().join(",")}` : locale;
}

export async function getCachedMessages(
  locale: string,
  loader: MessageLoader | NamespaceLoader,
  namespaces?: string[],
): Promise<FlatMessages> {
  const key = cacheKey(locale, namespaces);
  const cached = messageCache.get(key);
  if (cached) return cached;
  const messages = await loadLocaleMessages(loader, namespaces);
  messageCache.set(key, messages);
  return messages;
}

/** Clear message cache (for tests). */
export function clearMessageCache(): void {
  messageCache.clear();
}
