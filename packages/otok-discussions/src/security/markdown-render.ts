import { sanitizeDiscussionHref } from "./urls.js";

export type SafeMarkdownSegment =
  | { kind: "text"; value: string }
  | { kind: "strong"; value: string }
  | { kind: "em"; value: string }
  | { kind: "code"; value: string }
  | { kind: "link"; label: string; href: string };

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Parses a restricted markdown subset for SSR. Does not accept HTML.
 */
export function parseSafeDiscussionMarkdown(source: string): SafeMarkdownSegment[] {
  const segments: SafeMarkdownSegment[] = [];
  let i = 0;
  while (i < source.length) {
    const rest = source.slice(i);
    const link = rest.match(/^\[([^\]]+)\]\(([^)]+)\)/);
    if (link) {
      const href = sanitizeDiscussionHref(link[2]!);
      if (href) {
        segments.push({ kind: "link", label: link[1]!, href });
      } else {
        segments.push({ kind: "text", value: link[0]! });
      }
      i += link[0]!.length;
      continue;
    }
    const code = rest.match(/^`([^`]+)`/);
    if (code) {
      segments.push({ kind: "code", value: code[1]! });
      i += code[0]!.length;
      continue;
    }
    const strong = rest.match(/^\*\*([^*]+)\*\*/);
    if (strong) {
      segments.push({ kind: "strong", value: strong[1]! });
      i += strong[0]!.length;
      continue;
    }
    const em = rest.match(/^\*([^*]+)\*/);
    if (em) {
      segments.push({ kind: "em", value: em[1]! });
      i += em[0]!.length;
      continue;
    }
    const nextSpecial = rest.search(/[\[*`]/);
    const chunk = nextSpecial === -1 ? rest : rest.slice(0, nextSpecial);
    if (chunk) segments.push({ kind: "text", value: chunk });
    i += chunk.length || 1;
  }
  return segments;
}

export function renderSafeDiscussionMarkdownHtml(source: string): string {
  const lines = source.split("\n");
  const htmlLines = lines.map((line) => {
    const parts = parseSafeDiscussionMarkdown(line);
    return parts
      .map((p) => {
        switch (p.kind) {
          case "text":
            return escapeHtml(p.value);
          case "strong":
            return `<strong>${escapeHtml(p.value)}</strong>`;
          case "em":
            return `<em>${escapeHtml(p.value)}</em>`;
          case "code":
            return `<code>${escapeHtml(p.value)}</code>`;
          case "link": {
            const external = /^https?:\/\//i.test(p.href);
            const rel = external ? ' rel="noopener noreferrer nofollow ugc"' : "";
            const target = external ? ' target="_blank"' : "";
            return `<a href="${escapeHtml(p.href)}"${rel}${target}>${escapeHtml(p.label)}</a>`;
          }
          default:
            return "";
        }
      })
      .join("");
  });
  return htmlLines.map((l) => `<p>${l || "<br>"}</p>`).join("");
}
