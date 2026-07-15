import { OTOK_HEAD_ATTR } from "../shared/navigation.js";
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
        ? `<meta ${OTOK_HEAD_ATTR}="description" name="description" content="${escapeHtml(head.description)}">`
        : "";
    const meta = Object.entries(head?.meta ?? {})
        .map(([name, content]) => `<meta ${OTOK_HEAD_ATTR}="${escapeHtml(name)}" name="${escapeHtml(name)}" content="${escapeHtml(content)}">`)
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
export function pageHtml({ body, head, islands, manifest, clientEntry = "src/client.ts", devClientEntry = "/src/client.ts", devStylesheets = [], base = "/", darkMode = false, theme = false, }) {
    const entry = findEntry(manifest, clientEntry);
    const css = manifest ? collectCss(manifest, entry) : devStylesheets;
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
    const themeHead = theme ? `${themeBootstrapScript}\n    ${themeColorSchemeStyle}` : "";
    return `<!doctype html>
<html lang="${lang}"${htmlClass}>
  <head>
    ${themeHead}
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