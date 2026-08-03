const SLUG_MAX = 80;

export function slugifyTitle(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, SLUG_MAX);
}

/** Build a stable URL slug: `{id}--{titleSlug}` */
export function buildThreadSlug(threadId: string, title: string): string {
  const titleSlug = slugifyTitle(title) || "thread";
  return `${threadId}--${titleSlug}`;
}

/** Parse thread ID from composite slug. Returns null if invalid. */
export function parseThreadIdFromSlug(threadSlug: string): string | null {
  const idx = threadSlug.indexOf("--");
  if (idx <= 0) return null;
  const id = threadSlug.slice(0, idx);
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  return id;
}

export function parseTitleSlugFromComposite(threadSlug: string): string | null {
  const idx = threadSlug.indexOf("--");
  if (idx < 0) return null;
  return threadSlug.slice(idx + 2) || null;
}

export function isCanonicalThreadSlug(threadSlug: string, threadId: string, title: string): boolean {
  return threadSlug === buildThreadSlug(threadId, title);
}

export function slugifyTag(name: string): string {
  return slugifyTitle(name);
}

export async function ensureUniqueSlug(
  base: string,
  exists: (slug: string) => Promise<boolean>,
): Promise<string> {
  let slug = base || "item";
  let n = 0;
  while (await exists(slug)) {
    n += 1;
    slug = `${base}-${n}`.slice(0, SLUG_MAX);
  }
  return slug;
}
