import type { OtokHead } from "../shared/routes.js";
import { OTOK_HEAD_ATTR } from "../shared/navigation.js";
import { themeBootstrapScript, themeColorSchemeStyle } from "../shared/theme.js";

export interface ViteManifestEntry {
  file?: string;
  css?: string[];
  imports?: string[];
  isEntry?: boolean;
}

export type ViteManifest = Record<string, ViteManifestEntry>;

export interface PageHtmlOptions {
  body: string;
  head?: OtokHead;
  islands: string[];
  manifest?: ViteManifest;
  clientEntry?: string;
  devClientEntry?: string;
  /** Stylesheet URLs to emit in dev when no Vite manifest is available. */
  devStylesheets?: string[];
  base?: string;
  /** Include the client module even when the route rendered no islands. */
  client?: boolean;
  /** When true, SSR emits `<html class="dark">` from the theme cookie. */
  darkMode?: boolean;
  /** Include theme bootstrap script and color-scheme styles. Defaults to false. */
  theme?: boolean;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function escapeScriptJson(value: string): string {
  return value.replaceAll("<", "\\u003c");
}

function publicPath(path: string, base: string): string {
  const normalizedBase = base.endsWith("/") ? base : `${base}/`;
  return `${normalizedBase}${path}`.replace(/\/{2,}/g, "/");
}

function findEntry(manifest: ViteManifest | undefined, clientEntry: string): ViteManifestEntry | undefined {
  if (!manifest) return undefined;
  return (
    manifest[clientEntry] ??
    manifest[`/${clientEntry}`] ??
    manifest[clientEntry.replace(/^\//, "")] ??
    Object.values(manifest).find((entry) => entry.isEntry && entry.file?.endsWith(".js"))
  );
}

function collectCss(manifest: ViteManifest | undefined, entry: ViteManifestEntry | undefined): string[] {
  if (!manifest || !entry) return [];
  const seen = new Set<string>();
  const css: string[] = [];
  const visit = (item: ViteManifestEntry | undefined) => {
    if (!item) return;
    for (const href of item.css ?? []) {
      if (!seen.has(href)) {
        seen.add(href);
        css.push(href);
      }
    }
    for (const imported of item.imports ?? []) visit(manifest[imported]);
  };
  visit(entry);
  return css;
}

function renderHead(head: OtokHead | undefined): string {
  const title = escapeHtml(head?.title ?? "Otok App");
  const description = head?.description
    ? `<meta ${OTOK_HEAD_ATTR}="description" name="description" content="${escapeHtml(head.description)}">`
    : "";
  const meta = Object.entries(head?.meta ?? {})
    .map(
      ([name, content]) =>
        `<meta ${OTOK_HEAD_ATTR}="${escapeHtml(name)}" name="${escapeHtml(name)}" content="${escapeHtml(content)}">`,
    )
    .join("\n    ");
  const links = (head?.links ?? [])
    .map((link) => {
      const headKey = link.rel === "canonical" ? "canonical" : `link:${link.rel}:${link.href}`;
      const attrs = [
        `${OTOK_HEAD_ATTR}="${escapeHtml(headKey)}"`,
        `rel="${escapeHtml(link.rel)}"`,
        `href="${escapeHtml(link.href)}"`,
        link.crossorigin ? `crossorigin="${escapeHtml(link.crossorigin)}"` : "",
        link.as ? `as="${escapeHtml(link.as)}"` : "",
        link.type ? `type="${escapeHtml(link.type)}"` : "",
      ].filter(Boolean);
      return `<link ${attrs.join(" ")}>`;
    })
    .join("\n    ");
  const scripts = (head?.scripts ?? [])
    .map((script, index) => {
      const attrs = [
        `${OTOK_HEAD_ATTR}="script:${index}"`,
        script.src ? `src="${escapeHtml(script.src)}"` : "",
        script.type ? `type="${escapeHtml(script.type)}"` : "",
        script.async ? "async" : "",
        script.defer ? "defer" : "",
      ].filter(Boolean);
      return `<script ${attrs.join(" ")}></script>`;
    })
    .join("\n    ");
  const jsonLd = head?.jsonLd
    ? `<script ${OTOK_HEAD_ATTR}="json-ld" type="application/ld+json">${escapeScriptJson(JSON.stringify(head.jsonLd))}</script>`
    : "";
  return [
    '<meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1">',
    `<title ${OTOK_HEAD_ATTR}="title">${title}</title>`,
    description,
    meta,
    links,
    scripts,
    jsonLd,
  ]
    .filter(Boolean)
    .join("\n    ");
}

export function pageHtml({
  body,
  head,
  islands,
  manifest,
  clientEntry = "src/client.ts",
  devClientEntry = "/src/client.ts",
  devStylesheets = [],
  base = "/",
  client = false,
  darkMode = false,
  theme = false,
}: PageHtmlOptions): string {
  const shell = pageShell({
    head,
    manifest,
    clientEntry,
    devStylesheets,
    base,
    darkMode,
    theme,
  });
  const footer = pageFooter({
    islands,
    manifest,
    clientEntry,
    devClientEntry,
    base,
    client,
  });
  return `${shell}${body}${footer}`;
}

export interface PageHtmlStreamOptions
  extends Pick<
    PageHtmlOptions,
    | "head"
    | "manifest"
    | "clientEntry"
    | "devClientEntry"
    | "devStylesheets"
    | "base"
    | "client"
    | "darkMode"
    | "theme"
  > {
  bodyStream: ReadableStream<Uint8Array>;
  /** Invoked after the body stream completes so island discovery can finish. */
  getIslands: () => string[];
}

/** Shell-first HTML stream: head emits immediately, body streams, client script follows after body. */
export function composeHtmlStream(options: PageHtmlStreamOptions): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  const shell = pageShell(options);
  const reader = options.bodyStream.getReader();
  let bodyDone = false;

  return new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(encoder.encode(shell));
    },
    async pull(controller) {
      if (!bodyDone) {
        const { done, value } = await reader.read();
        if (!done && value) {
          controller.enqueue(value);
          return;
        }
        bodyDone = true;
      }
      controller.enqueue(
        encoder.encode(
          pageFooter({
            islands: options.getIslands(),
            manifest: options.manifest,
            clientEntry: options.clientEntry,
            devClientEntry: options.devClientEntry,
            base: options.base,
            client: options.client,
          }),
        ),
      );
      controller.close();
    },
    cancel(reason) {
      return reader.cancel(reason);
    },
  });
}

function pageShell({
  head,
  manifest,
  clientEntry = "src/client.ts",
  devStylesheets = [],
  base = "/",
  darkMode = false,
  theme = false,
}: Pick<
  PageHtmlOptions,
  "head" | "manifest" | "clientEntry" | "devStylesheets" | "base" | "darkMode" | "theme"
>): string {
  const entry = findEntry(manifest, clientEntry);
  const css = manifest ? collectCss(manifest, entry) : devStylesheets;
  const stylesheetLinks = css
    .map((href) => `<link rel="stylesheet" href="${escapeHtml(publicPath(href, base))}">`)
    .join("\n    ");
  const lang = escapeHtml(head?.lang ?? "en");
  const htmlClass = darkMode ? ` class="dark"` : "";
  const themeHead = theme ? `${themeBootstrapScript}\n    ${themeColorSchemeStyle}` : "";

  return `<!doctype html>
<html lang="${lang}"${htmlClass}>
  <head>
    ${themeHead}
    ${renderHead(head)}
    ${stylesheetLinks}
  </head>
  <body>
    `;
}

function pageFooter({
  islands,
  manifest,
  clientEntry = "src/client.ts",
  devClientEntry = "/src/client.ts",
  base = "/",
  client = false,
}: Pick<
  PageHtmlOptions,
  "islands" | "manifest" | "clientEntry" | "devClientEntry" | "base" | "client"
>): string {
  const entry = findEntry(manifest, clientEntry);
  const needsClient = client || islands.length > 0;
  const needsDevClientEntry = !manifest;
  const clientScript = needsClient || needsDevClientEntry
    ? entry?.file
      ? `<script type="module" src="${escapeHtml(publicPath(entry.file, base))}"></script>`
      : `<script type="module" src="${escapeHtml(devClientEntry)}"></script>`
    : "";

  return `
    ${clientScript}
  </body>
</html>`;
}
