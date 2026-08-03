import type { ContentEntry, ContentManifest, SerializedEntry } from "../core/types.js";

export type CollectionFilterFn<TData = unknown> = (entry: ContentEntry<TData>) => boolean;

let cachedManifest: ContentManifest | null = null;

export function setContentManifest(manifest: ContentManifest): void {
  cachedManifest = manifest;
}

export function getContentManifest(): ContentManifest {
  if (!cachedManifest) {
    throw new Error(
      "otok-content: manifest not loaded. Import from virtual:otok-content/manifest or call setContentManifest().",
    );
  }
  return cachedManifest;
}

function deserializeEntry(collection: string, entry: SerializedEntry): ContentEntry {
  return { ...entry, collection };
}

export async function getCollection<TData = unknown>(
  name: string,
  filter?: CollectionFilterFn<TData>,
): Promise<ContentEntry<TData>[]> {
  const manifest = getContentManifest();
  const collection = manifest.collections[name];
  if (!collection) {
    const known = Object.keys(manifest.collections).sort().join(", ") || "(none)";
    throw new Error(`otok-content: unknown collection "${name}". Registered: ${known}`);
  }

  let entries = collection.entries.map((e) => deserializeEntry(name, e)) as ContentEntry<TData>[];
  if (filter) {
    entries = entries.filter(filter);
  }
  return entries;
}

export async function getEntry<TData = unknown>(
  collectionName: string,
  slugOrId: string,
): Promise<ContentEntry<TData> | undefined> {
  const entries = await getCollection<TData>(collectionName);
  return entries.find((e) => e.slug === slugOrId || e.id === slugOrId);
}

export async function getEntryOrThrow<TData = unknown>(
  collectionName: string,
  slugOrId: string,
): Promise<ContentEntry<TData>> {
  const entry = await getEntry<TData>(collectionName, slugOrId);
  if (!entry) {
    throw new Error(`otok-content: entry "${slugOrId}" not found in collection "${collectionName}"`);
  }
  return entry;
}
