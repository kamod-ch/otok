const BLOCKED_SCHEME = /^(javascript|data|vbscript|file):/i;

export function isAllowedDiscussionUrl(href: string): boolean {
  const trimmed = href.trim();
  if (!trimmed) return false;
  if (BLOCKED_SCHEME.test(trimmed)) return false;
  if (trimmed.startsWith("//")) return false;
  if (/^[\w+.-]+:/i.test(trimmed)) {
    return /^(https?|mailto):/i.test(trimmed);
  }
  return trimmed.startsWith("/") || trimmed.startsWith("#");
}

export function sanitizeDiscussionHref(href: string): string | null {
  const trimmed = href.trim();
  if (!isAllowedDiscussionUrl(trimmed)) return null;
  return trimmed;
}
