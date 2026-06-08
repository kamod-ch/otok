function escapeHtml(value) {
    return value
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;");
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
    return [
        '<meta charset="utf-8">',
        '<meta name="viewport" content="width=device-width, initial-scale=1">',
        `<title>${title}</title>`,
        description,
        meta,
    ]
        .filter(Boolean)
        .join("\n    ");
}
export function pageHtml({ body, head, islands, manifest, clientEntry = "src/client.ts", devClientEntry = "/src/client.ts", base = "/", }) {
    const entry = findEntry(manifest, clientEntry);
    const css = collectCss(manifest, entry);
    const stylesheetLinks = css
        .map((href) => `<link rel="stylesheet" href="${escapeHtml(publicPath(href, base))}">`)
        .join("\n    ");
    const hasIslands = islands.length > 0;
    const clientScript = hasIslands
        ? entry?.file
            ? `<script type="module" src="${escapeHtml(publicPath(entry.file, base))}"></script>`
            : `<script type="module" src="${escapeHtml(devClientEntry)}"></script>`
        : "";
    const lang = escapeHtml(head?.lang ?? "en");
    return `<!doctype html>
<html lang="${lang}">
  <head>
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