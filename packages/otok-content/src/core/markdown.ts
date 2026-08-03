import MarkdownIt from "markdown-it";
import type { TocItem } from "./types.js";
import { extractToc } from "./toc.js";

export interface RenderMarkdownOptions {
  /** Inject heading ids for TOC anchors. */
  toc?: boolean;
}

let mdInstance: MarkdownIt | undefined;

function getMarkdownIt(): MarkdownIt {
  if (!mdInstance) {
    mdInstance = new MarkdownIt({
      html: false,
      linkify: true,
      typographer: true,
      highlight(code, lang) {
        const language = lang || "text";
        const escaped = escapeHtml(code);
        return `<pre class="language-${language}"><code class="language-${language}">${escaped}</code></pre>`;
      },
    });
  }
  return mdInstance;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export interface RenderMarkdownResult {
  html: string;
  toc: TocItem[];
}

export function renderMarkdown(body: string, options: RenderMarkdownOptions = {}): RenderMarkdownResult {
  const toc = options.toc !== false ? extractToc(body) : [];
  let source = body;

  if (toc.length > 0) {
    const headingCounts = new Map<string, number>();
    source = body.replace(/^(#{1,6})\s+(.+)$/gm, (full, hashes: string, title: string) => {
      const text = title.replace(/#+$/, "").trim();
      const base = text
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, "")
        .replace(/\s+/g, "-");
      const count = headingCounts.get(base) ?? 0;
      headingCounts.set(base, count + 1);
      const id = count > 0 ? `${base}-${count}` : base;
      return `${hashes} ${text} {#${id}}`;
    });
  }

  const html = getMarkdownIt().render(source);
  return { html, toc };
}

/** MDX is compiled at build time only — never executed at runtime. */
export async function compileMdx(
  body: string,
  _file: string,
): Promise<RenderMarkdownResult> {
  try {
    const specifier = "@mdx-js/mdx";
    const mdx = await import(/* @vite-ignore */ specifier);
    const compiled = await mdx.compile(body, { development: false });
    return { html: String(compiled), toc: extractToc(body) };
  } catch {
    return renderMarkdown(body);
  }
}

export async function renderContent(
  file: string,
  body: string,
  options: RenderMarkdownOptions = {},
): Promise<RenderMarkdownResult> {
  if (file.endsWith(".mdx")) {
    return compileMdx(body, file);
  }
  return renderMarkdown(body, options);
}
