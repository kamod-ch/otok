import { themeBootstrapScript, themeColorSchemeStyle } from "../shared/theme.js";
function escapeHtml(value) {
    return value
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;");
}
function escapeScriptJson(value) {
    return value.replaceAll("<", "\\u003c");
}
function publicPath(path, base) {
    const normalizedBase = base.endsWith("/") ? base : `${base}/`;
    return `${normalizedBase}${path}`.replace(/\/{2,}/g, "/");
}
function findEntry(manifest, clientEntry) {
    if (!manifest)
        return undefined;
    return (manifest[clientEntry] ??
        manifest[`/${clientEntry}`] ??
        manifest[clientEntry.replace(/^\//, "")] ??
        Object.values(manifest).find((entry) => entry.isEntry && entry.file?.endsWith(".js")));
}
function collectCss(manifest, entry) {
    if (!manifest || !entry)
        return [];
    const seen = new Set();
    const css = [];
    const visit = (item) => {
        if (!item)
            return;
        for (const href of item.css ?? []) {
            if (!seen.has(href)) {
                seen.add(href);
                css.push(href);
            }
        }
        for (const imported of item.imports ?? [])
            visit(manifest[imported]);
    };
    visit(entry);
    return css;
}
function renderHead(head) {
    const title = escapeHtml(head?.title ?? "Otok App");
    const description = head?.description
        ? `<meta name="description" content="${escapeHtml(head.description)}">`
        : "";
    const meta = Object.entries(head?.meta ?? {})
        .map(([name, content]) => `<meta name="${escapeHtml(name)}" content="${escapeHtml(content)}">`)
        .join("\n    ");
    const links = (head?.links ?? [])
        .map((link) => {
        const attrs = [
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
        .map((script) => {
        const attrs = [
            script.src ? `src="${escapeHtml(script.src)}"` : "",
            script.type ? `type="${escapeHtml(script.type)}"` : "",
            script.async ? "async" : "",
            script.defer ? "defer" : "",
        ].filter(Boolean);
        return `<script ${attrs.join(" ")}></script>`;
    })
        .join("\n    ");
    const jsonLd = head?.jsonLd
        ? `<script type="application/ld+json">${escapeScriptJson(JSON.stringify(head.jsonLd))}</script>`
        : "";
    return [
        '<meta charset="utf-8">',
        '<meta name="viewport" content="width=device-width, initial-scale=1">',
        `<title>${title}</title>`,
        description,
        meta,
        links,
        scripts,
        jsonLd,
    ]
        .filter(Boolean)
        .join("\n    ");
}
export function pageHtml({ body, head, islands, manifest, clientEntry = "src/client.ts", devClientEntry = "/src/client.ts", base = "/", darkMode = false, }) {
    const entry = findEntry(manifest, clientEntry);
    const css = collectCss(manifest, entry);
    const stylesheetLinks = css
        .map((href) => `<link rel="stylesheet" href="${escapeHtml(publicPath(href, base))}">`)
        .join("\n    ");
    const hasIslands = islands.length > 0;
    const needsDevClientEntry = !manifest;
    const clientScript = hasIslands || needsDevClientEntry
        ? entry?.file
            ? `<script type="module" src="${escapeHtml(publicPath(entry.file, base))}"></script>`
            : `<script type="module" src="${escapeHtml(devClientEntry)}"></script>`
        : "";
    const lang = escapeHtml(head?.lang ?? "en");
    const htmlClass = darkMode ? ` class="dark"` : "";
    return `<!doctype html>
<html lang="${lang}"${htmlClass}>
  <head>
    ${themeBootstrapScript}
    ${themeColorSchemeStyle}
    ${renderHead(head)}
    ${stylesheetLinks}
  </head>
  <body>
    ${body}
    ${clientScript}
  </body>
</html>`;
}
//# sourceMappingURL=html.js.map