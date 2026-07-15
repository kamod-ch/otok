#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const contentDir = path.join(root, "content");
const outDir = path.join(root, "dist");
const config = JSON.parse(fs.readFileSync(path.join(root, "site.config.json"), "utf8"));
const checkMode = process.argv.includes("--check");

function walk(dir) {
  const files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...walk(full));
    else if (entry.name.endsWith(".md")) files.push(full);
  }
  return files.sort();
}

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function slugify(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function parseFrontmatter(markdown) {
  if (!markdown.startsWith("---\n")) return { data: {}, body: markdown };
  const end = markdown.indexOf("\n---\n", 4);
  if (end === -1) return { data: {}, body: markdown };
  const raw = markdown.slice(4, end);
  const data = {};
  for (const line of raw.split("\n")) {
    const match = /^([A-Za-z0-9_-]+):\s*(.*)$/.exec(line);
    if (match) data[match[1]] = match[2].replace(/^['"]|['"]$/g, "");
  }
  return { data, body: markdown.slice(end + 5) };
}

function inline(markdown) {
  return escapeHtml(markdown)
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
}

function renderMarkdown(markdown) {
  const lines = markdown.trim().split("\n");
  const html = [];
  const headings = [];
  let paragraph = [];
  let list = [];
  let code = null;

  const flushParagraph = () => {
    if (paragraph.length > 0) {
      html.push(`<p>${inline(paragraph.join(" "))}</p>`);
      paragraph = [];
    }
  };
  const flushList = () => {
    if (list.length > 0) {
      html.push(`<ul>${list.map((item) => `<li>${inline(item)}</li>`).join("")}</ul>`);
      list = [];
    }
  };

  for (const line of lines) {
    if (line.startsWith("```")) {
      if (code) {
        html.push(`<pre><code>${escapeHtml(code.lines.join("\n"))}</code></pre>`);
        code = null;
      } else {
        flushParagraph();
        flushList();
        code = { lines: [] };
      }
      continue;
    }
    if (code) {
      code.lines.push(line);
      continue;
    }

    if (!line.trim()) {
      flushParagraph();
      flushList();
      continue;
    }
    const heading = /^(#{1,3})\s+(.+)$/.exec(line);
    if (heading) {
      flushParagraph();
      flushList();
      const level = heading[1].length;
      const text = heading[2].trim();
      const id = slugify(text);
      headings.push({ level, text, id });
      html.push(`<h${level} id="${id}"><a href="#${id}">${inline(text)}</a></h${level}>`);
      continue;
    }
    const item = /^[-*]\s+(.+)$/.exec(line);
    if (item) {
      flushParagraph();
      list.push(item[1]);
      continue;
    }
    paragraph.push(line.trim());
  }

  flushParagraph();
  flushList();
  return { html: html.join("\n"), headings };
}

function pagePath(file) {
  const relative = path.relative(contentDir, file).replace(/\\/g, "/").replace(/\.md$/, "");
  if (relative === "index") return "/";
  return relative.endsWith("/index") ? `/${relative.slice(0, -6)}` : `/${relative}`;
}

function titleFromPath(file, data) {
  if (data.title) return data.title;
  return path.basename(file, ".md").split("-").map((part) => part[0].toUpperCase() + part.slice(1)).join(" ");
}

const pages = walk(contentDir).map((file) => {
  const parsed = parseFrontmatter(fs.readFileSync(file, "utf8"));
  const rendered = renderMarkdown(parsed.body);
  return {
    file,
    path: pagePath(file),
    title: titleFromPath(file, parsed.data),
    description: parsed.data.description ?? config.description,
    section: parsed.data.section ?? path.relative(contentDir, path.dirname(file)).split(path.sep)[0],
    order: Number(parsed.data.order ?? 999),
    ...rendered,
  };
}).sort((a, b) => a.order - b.order || a.path.localeCompare(b.path));

function href(page) {
  const base = config.base.endsWith("/") ? config.base.slice(0, -1) : config.base;
  return `${base}${page.path === "/" ? "/" : page.path + "/"}`;
}

function nav(active) {
  const groups = new Map();
  for (const page of pages) {
    const group = page.section || "Docs";
    if (!groups.has(group)) groups.set(group, []);
    groups.get(group).push(page);
  }
  return [...groups.entries()].map(([group, items]) => `
    <section class="nav-group">
      <h2>${escapeHtml(group.replace(/-/g, " "))}</h2>
      ${items.map((page) => `<a class="${page.path === active.path ? "active" : ""}" href="${href(page)}">${escapeHtml(page.title)}</a>`).join("")}
    </section>`).join("");
}

function layout(page) {
  const toc = page.headings.filter((heading) => heading.level > 1).map((heading) => `<a href="#${heading.id}">${escapeHtml(heading.text)}</a>`).join("");
  const canonical = `${config.canonicalOrigin}${href(page)}`;
  const editPath = path.relative(contentDir, page.file).replace(/\\/g, "/");
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(page.title)} | ${escapeHtml(config.title)}</title>
  <meta name="description" content="${escapeHtml(page.description)}">
  <link rel="canonical" href="${canonical}">
  <meta property="og:title" content="${escapeHtml(page.title)}">
  <meta property="og:description" content="${escapeHtml(page.description)}">
  <meta property="og:type" content="website">
  <link rel="stylesheet" href="${config.base}assets/style.css">
  <script type="application/json" id="search-index">${JSON.stringify(pages.map(({ title, path, description }) => ({ title, url: href({ path }), description }))).replaceAll("<", "\\u003c")}</script>
</head>
<body>
  <header class="topbar">
    <a class="brand" href="${config.base}">Otok</a>
    <span>Lightweight Hono + Preact SSR with islands</span>
    <input id="search" type="search" placeholder="Search docs" aria-label="Search docs">
  </header>
  <div class="shell">
    <nav class="sidebar" aria-label="Documentation">${nav(page)}</nav>
    <main>
      <article>${page.html}</article>
      <p class="edit"><a href="${config.githubEditBase}/${editPath}">Edit this page on GitHub</a></p>
    </main>
    <aside class="toc" aria-label="On this page">${toc}</aside>
  </div>
  <script src="${config.base}assets/search.js"></script>
</body>
</html>`;
}

function write(file, content) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
}

if (fs.existsSync(outDir)) fs.rmSync(outDir, { recursive: true, force: true });
for (const page of pages) {
  const target = page.path === "/" ? path.join(outDir, "index.html") : path.join(outDir, page.path, "index.html");
  write(target, layout(page));
}

write(path.join(outDir, "assets/style.css"), fs.readFileSync(path.join(root, "public/style.css"), "utf8"));
write(path.join(outDir, "assets/search.js"), fs.readFileSync(path.join(root, "public/search.js"), "utf8"));
write(path.join(outDir, "robots.txt"), `User-agent: *\nAllow: /\nSitemap: ${config.canonicalOrigin}${config.base}sitemap.xml\n`);
write(path.join(outDir, "sitemap.xml"), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${pages.map((page) => `\n  <url><loc>${config.canonicalOrigin}${href(page)}</loc></url>`).join("")}\n</urlset>\n`);
write(path.join(outDir, "404.html"), layout({ ...pages[0], title: "Page not found", html: "<h1>Page not found</h1><p>The requested documentation page could not be found.</p>", headings: [] }));

if (checkMode) {
  const index = fs.readFileSync(path.join(outDir, "index.html"), "utf8");
  if (!index.includes("What is Otok")) throw new Error("Docs check failed: missing intro content");
  console.info("Docs check passed.");
} else {
  console.info(`Built ${pages.length} documentation pages.`);
}
