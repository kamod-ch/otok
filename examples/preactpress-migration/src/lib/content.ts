import type { ContentEntry, ContentManifest } from "@kamod-ch/otok-content";
import { setContentManifest as setRuntimeManifest, getCollection } from "@kamod-ch/otok-content/runtime";

type ManifestEntry = Omit<ContentManifest["collections"][string]["entries"][number], "data"> &
  Pick<ContentEntry, "collection"> & { data: DocData };

type DocData = {
  title?: unknown;
  description?: unknown;
  version?: unknown;
};

let manifest: ContentManifest | null = null;

export function setContentManifest(next: ContentManifest) {
  manifest = next;
  setRuntimeManifest(next);
}

export function getEntryByRoute(route: string): ManifestEntry | undefined {
  if (!manifest) return undefined;
  for (const bucket of Object.values(manifest.collections)) {
    const hit = bucket.entries.find((e) => e.route === route);
    if (hit) return { ...hit, collection: bucket.name, data: hit.data as DocData };
  }
  return undefined;
}

export function listDocRoutes(): string[] {
  if (!manifest) return [];
  const docs = manifest.collections.docs?.entries ?? [];
  return docs.map((e) => e.route);
}

export async function searchDocs(query: string, limit = 8) {
  const entries = await getCollection("docs");
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return entries
    .filter((e) => {
      const data = e.data as DocData;
      const title = String(data.title ?? "").toLowerCase();
      const desc = String(data.description ?? "").toLowerCase();
      return title.includes(q) || desc.includes(q) || e.slug.includes(q);
    })
    .slice(0, limit);
}
