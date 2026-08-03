import MarkdownIt from "markdown-it";
import type { ForumMarkdownAdapter } from "./types.js";

let mdInstance: MarkdownIt | undefined;

function getMarkdownIt(): MarkdownIt {
  if (!mdInstance) {
    mdInstance = new MarkdownIt({
      html: false,
      linkify: true,
      typographer: true,
    });
  }
  return mdInstance;
}

/** Strip dangerous HTML — markdown-it already disables raw HTML. */
export function sanitizeHtml(html: string): string {
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/\bon\w+\s*=/gi, "data-blocked=")
    .replace(/javascript:/gi, "blocked:");
}

export function renderMarkdown(markdown: string): { html: string } {
  const raw = getMarkdownIt().render(markdown);
  return { html: sanitizeHtml(raw) };
}

export function createDefaultMarkdownAdapter(): ForumMarkdownAdapter {
  return {
    render: renderMarkdown,
    sanitize: sanitizeHtml,
  };
}

export function renderPostContent(
  markdown: string,
  adapter: ForumMarkdownAdapter = createDefaultMarkdownAdapter(),
): { markdown: string; html: string } {
  const { html: raw } = adapter.render(markdown);
  return { markdown, html: adapter.sanitize(raw) };
}
