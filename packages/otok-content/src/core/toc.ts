import type { TocItem } from "./types.js";

const HEADING_RE = /^(#{1,6})\s+(.+)$/gm;

function slugifyHeading(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export function extractToc(markdown: string): TocItem[] {
  const items: TocItem[] = [];
  const seen = new Map<string, number>();

  for (const match of markdown.matchAll(HEADING_RE)) {
    const level = match[1]?.length ?? 1;
    const text = (match[2] ?? "").replace(/#+$/, "").trim();
    if (!text || level > 4) continue;

    let id = slugifyHeading(text);
    const count = seen.get(id) ?? 0;
    if (count > 0) id = `${id}-${count}`;
    seen.set(slugifyHeading(text), count + 1);

    items.push({ id, text, level });
  }

  return items;
}
