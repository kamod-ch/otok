# Technischer Migrationsplan: PreactPress → Otok + `@kamod-ch/otok-content`

**Status:** Draft v1 · **Ziel:** PreactPress bleibt als Produkt erkennbar, Otok liefert Framework/Rendering, `otok-content` übernimmt generische Content Collections.

---

## 1. Executive Summary

PreactPress ist ein **VitePress-inspiriertes Preact-SSG** mit integriertem Docs-Theme, Markdown-Pipeline (Shiki, Container, Includes) und Plugin-Ökosystem. Otok ist ein **Hono + Preact Islands Framework** mit Adapter-basiertem SSG, Plugin-System und wachsender Content-Schicht (`@kamod-ch/otok-content`).

Die Migration erfolgt **schrittweise**, nicht als Big-Bang:

| Phase | Dauer (Schätzung) | Ergebnis |
|-------|-------------------|----------|
| **0 — Inventar & Compat** | 2–3 Wochen | Compatibility Layer, Benchmarks, repräsentative Beispielseite |
| **1 — Shared Content Core** | 4–6 Wochen | PreactPress nutzt `otok-content` für Collections/Manifest |
| **2 — Otok-native Sites** | 6–8 Wochen | Greenfield-Docs auf Otok + `@kamod-ch/otok-preset-docs` |
| **3 — Theme-Konvergenz** | 8–12 Wochen | `@kamod-ch/preactpress-theme` als Otok-Layout-Preset |
| **4 — Deprecation (optional)** | 12+ Monate | PreactPress CLI bleibt; Core wird Thin Wrapper |

**Leitprinzipien**

- PreactPress bleibt **eigenständiges Produkt** (CLI, Templates, Docs-Theme, Plugin-Marketplace).
- Otok liefert **Routing, Rendering, Adapter, Plugin-Lifecycle**.
- `otok-content` liefert **Collections, Validierung, Manifest, Feeds/Search-Helpers**.
- **Keine unnötigen Breaking Changes** — Compat Layer für bestehende `.preactpress/config.ts`.
- **Statische Ausgabe bleibt schnell und klein** — SSG-first, minimal Client-JS.

---

## 2. Architekturvergleich

### 2.1 Routing

| Aspekt | PreactPress | Otok |
|--------|-------------|------|
| **Modell** | Dateibasiert: `guide/foo.md` → `/guide/foo` | Dateibasiert: `src/app/routes/` + dynamische Segmente |
| **Kern** | `src/node/content.ts` → `mdFileToRoute()` | `packages/otok/src/server/router.ts` → `matchRoute()` |
| **Dynamisch** | `[pkg].md` + `[pkg].paths.ts` | `[slug].tsx` + `defineRendering({ prerender: { params } })` |
| **Rewrites** | `rewrites: { "/docs": "/guide" }` | Hono-Middleware / `registerRoutes` Plugin-Hook |
| **Tags** | `/tags/{slug}` synthetisch | Taxonomien via `groupByTaxonomy()` + Route |
| **i18n-Routing** | Locale-Prefix `/de/...` | `@kamod-ch/otok-i18n` — `prefix-except-default` |
| **Versionen** | `/v2/guide/...` Content-Verzeichnis | Route-Prefix + Collection-Filter oder separate Roots |

**Mapping**

```
PreactPress                    Otok
─────────────────────────────────────────────────────
index.md                  →  content/docs/index.md + route /
guide/foo.md              →  content/docs/foo.md + /docs/foo
de/guide/foo.md           →  content/de/docs/foo.md + /de/docs/foo
packages/[pkg].md         →  src/app/routes/packages/[pkg].tsx + prerender.params
/tags/react               →  src/app/routes/tags/[tag].tsx
```

**Compat:** `@kamod-ch/preactpress-compat` exportiert `preactPressRouteToOtok()`, `otokRouteToPreactPress()`.

### 2.2 Markdown / MDX

| Feature | PreactPress | Otok / otok-content |
|---------|-------------|---------------------|
| Engine | markdown-it + Plugins | markdown-it (basic) |
| Frontmatter | gray-matter | gray-matter |
| Syntax Highlight | **Shiki** + Transformer | Escaped `<pre>` (kein Shiki) |
| Container | `::: tip`, GFM alerts | ❌ (Gap) |
| Includes | `<<< @/file` | ❌ (Gap) |
| Snippets | `@/` imports | ❌ (Gap) |
| Math | markdown-it-mathjax3 | ❌ (Gap) |
| MDX | Runtime-Komponenten (`@mdx-js/rollup`) | Compile-to-HTML (kein Runtime) |
| TOC | Heading-Extraktion | `extractToc()` in otok-content |

**Migrationsstrategie Markdown**

1. **Phase 0:** PreactPress-Pipeline als `ContentRenderer`-Plugin für `otok-content` registrieren.
2. **Phase 1:** `@kamod-ch/otok-content-shiki` (neues Paket) — Shiki-Renderer optional.
3. **Phase 2:** Container/Includes als remark/markdown-it Plugins in `otok-content` oder `@kamod-ch/otok-markdown`.

### 2.3 Theme-System

| Aspekt | PreactPress | Otok |
|--------|-------------|------|
| Default Theme | `src/client/theme-default/Layout.tsx` | Kein Docs-Theme |
| Custom Theme | `theme: "./theme/Layout.tsx"` | Preact-Routes + Kamod UI |
| Config | `themeConfig: { nav, sidebar, search, ... }` | App-spezifisch / Preset |
| CSS Tokens | `--pp-*` CSS Variables | Kamod `--background`, `--foreground` |
| Dark Mode | `PREACTPRESS_THEME_BOOT_SCRIPT` | `@kamod-ch/otok-kamod` darkMode |
| Layout Props | `LayoutProps` (page, site, themeConfig) | `OtokPageProps` + Loader-Daten |

**Ziel:** `@kamod-ch/preactpress-theme` — Otok-Layout mit PreactPress-kompatiblen `LayoutProps` (via Compat Layer).

### 2.4 Suche

| Aspekt | PreactPress | Otok |
|--------|-------------|------|
| Lokal | `dist/preactpress-search.json` | `buildSearchIndex()` → Manifest-Feld |
| Algolia | `@docsearch/js` Integration | Manuell / Plugin |
| Client | `useSiteSearch.ts` | Custom Hook auf Manifest-Index |
| CRM-Search | — | `@kamod-ch/otok-search` (nicht docs!) |

**Mapping:** PreactPress-Search-JSON-Format wird von `@kamod-ch/preactpress-compat` aus `ContentManifest.searchIndex` erzeugt.

### 2.5 Navigation

| Aspekt | PreactPress | Otok |
|--------|-------------|------|
| Top Nav | `themeConfig.nav` | App-Config / Compat |
| Sidebar | `themeConfig.sidebar` (prefix-map) | `resolveSidebarForRoute()` via Compat |
| Outline | In-Page TOC aus Headings | `entry.toc` aus Manifest |
| Prev/Next | Flattened sidebar order | Compat: `flattenSidebarItems()` |
| Breadcrumbs | ❌ (nur Pager) | Optional in Theme-Preset |

### 2.6 SSG / Static Generation

| Aspekt | PreactPress | Otok |
|--------|-------------|------|
| Build | Vite client + SSR → HTML pro Route | `otok-adapter-static` prerender |
| Output | `dist/{route}/index.html` | `dist/{route}/index.html` |
| SPA-Nav | JSON-Chunks `preactpress-content/*.json` | Otok Soft-Nav / Islands |
| Incremental | `buildCache.ts` | `.otok-content-state.json` |
| Strict Mode | — | Static adapter blockiert Loader/Action |

**Empfehlung:** Docs-Sites mit `defineRendering({ mode: "ssg" })` + Manifest-Import **ohne Loader** (Build-time virtual module) für strict static output.

### 2.7 i18n

| Aspekt | PreactPress | Otok |
|--------|-------------|------|
| Config | `locales: { root, de, ... }` | `@kamod-ch/otok-i18n` Plugin |
| Content | `/de/` Dateipfad | Locale-Segment in Content oder Routing |
| hreflang | `buildAlternateHeadTags()` | `createLocalizedSitemapEntries()`, `i18nHead` |
| Switcher | `localizedRouteForLocale()` | `switchLocalePath()` |

### 2.8 SEO

| Aspekt | PreactPress | Otok |
|--------|-------------|------|
| Meta/OG | `html.ts`, `usePageHead.ts` | `@kamod-ch/otok-seo`, route `head`/`meta` |
| Sitemap | `writeSitemap()` | `@kamod-ch/otok-seo` + `contentEntriesToSitemapUrls()` |
| RSS/Atom | `feed.ts` → `feed.xml` | `renderAtomFeed()` / `renderRssFeed()` |
| robots.txt | `writeRobots()` | SEO-Plugin auto-route |
| JSON-LD | In `html.ts` | SEO-Plugin / manual head |
| AI Exports | `llms.txt`, `api/context.json` | `@kamod-ch/otok-content` Remote (future) / custom plugin |

### 2.9 Plugins

| PreactPress Hook | Otok Äquivalent |
|------------------|-----------------|
| `config` | Plugin `config` |
| `configResolved` | Nach Plugin-Merge |
| `buildStart` | `buildStart` |
| `extendRoutes` | `registerRoutes` / `configureApp` |
| `transformMarkdown` | `ContentRenderer` Hook (geplant) |
| `transformFence` | Markdown-Renderer Hook |
| `client` | Islands / Client-Bundle |
| `transformPageData` | Loader / Manifest `computed` |
| `extendHead` | Route `head` / SEO-Plugin |
| `buildEnd` | `buildEnd` |

Offizielle PreactPress-Plugins (`@preactpress/plugin-*`) bleiben PreactPress-spezifisch bis Adapter existieren.

### 2.10 Build-Ausgabe

**PreactPress `dist/`**

```
dist/
├── index.html
├── guide/foo/index.html
├── assets/*.js, *.css
├── preactpress-search.json
├── preactpress-content/*.json    # SPA payloads
├── preactpress-theme.js
├── sitemap.xml, robots.txt, feed.xml
├── llms.txt, api/context.json   # optional
└── public/ assets
```

**Otok static `dist/`**

```
dist/
├── index.html
├── docs/foo/index.html
├── client/assets/*.js, *.css
├── search.json                    # via route (Beispiel)
├── feed.xml, sitemap.xml          # via SEO/content routes
└── (kein Server-Bundle nach cleanup)
```

### 2.11 Öffentliche APIs

#### PreactPress

| Export | Pfad | Zweck |
|--------|------|-------|
| `@kamod-ch/preactpress/config` | `defineConfig`, `createContentLoader`, Plugin-Typen |
| `@kamod-ch/preactpress/client` | `LayoutProps`, `usePageHead`, Theme-Utils |
| `@kamod-ch/preactpress/shared` | Route, Sidebar, Search, PageMeta |
| `@kamod-ch/preactpress/content` | `defineCollection`, Presets |
| `@kamod-ch/preactpress` | `build`, `createServer`, `check`, `migrate` |

#### Otok / otok-content

| Export | Pfad | Zweck |
|--------|------|-------|
| `otok` | `defineConfig` | App-Konfiguration |
| `otok/route` | `defineLoader`, `composeLoader` | Route-Helpers |
| `otok/rendering` | `defineRendering` | SSG/SSR-Modi |
| `@kamod-ch/otok-content` | `defineCollection`, `buildContentManifest` | Collections |
| `@kamod-ch/otok-content/runtime` | `getCollection`, `getEntry` | Edge-safe Query |
| `@kamod-ch/otok-content/presets` | `docsPreset`, `blogPreset` | Vordefinierte Schemas |
| `@kamod-ch/preactpress-compat` | Bridge-APIs | **Neu** — Migrations-Compat |

---

## 3. Gap-Analyse & Priorisierung

| Gap | Priorität | Lösung |
|-----|-----------|--------|
| Docs-Theme (Sidebar, Nav, Pager) | P0 | `@kamod-ch/preactpress-theme` für Otok |
| Shiki Syntax Highlighting | P0 | Renderer-Plugin oder Compat-Pipeline |
| MDX Runtime-Komponenten | P1 | Hybrid: MDX nur in PreactPress; Otok compile-only |
| Container/Includes/Snippets | P1 | Port markdown-it Plugins |
| Duplicate slug across locales | — | Fixed in otok-content (`locale/slug` key) |
| Auto prerender.params aus Manifest | P0 | `otok-content` buildEnd Hook |
| Search JSON compat format | P1 | `@kamod-ch/preactpress-compat` ✅ |
| Versionierung `/v2/` | P1 | Content-Root-Multiplier + Switcher |
| AI Exports (llms.txt) | P2 | PreactPress Plugin portieren |
| Dynamic MDX routes | P2 | PreactPress-only (documented limitation) |

---

## 4. Phasenplan (Detail)

### Phase 0 — Compat + Benchmark (jetzt)

**Deliverables**

- [x] `@kamod-ch/preactpress-compat` — Route/Theme/Search-Mapping
- [x] `examples/preactpress-migration` — repräsentative Otok-Docs-Seite
- [x] `scripts/benchmark-preactpress-migration.mjs` — Vorher/Nachher-Metriken
- [x] Regressionstests in `preactpress-compat`
- [x] Dieses Dokument

**Repräsentative Beispielseite** (`examples/preactpress-migration`)

Enthält: Docs-Navigation, Markdown+MDX, Syntax Highlighting (basic), lokale Suche, i18n (de/en), Sitemap, RSS, Dark Mode (Kamod), Custom Theme (PreactPress-styled Layout), Versionierung (v1/v2 Switcher).

### Phase 1 — PreactPress → otok-content Collections

1. PreactPress `src/node/collections/` delegiert an `buildContentManifest()`.
2. `defineCollection` in PreactPress re-exportiert von `@kamod-ch/otok-content`.
3. Snapshot-Tests: `CollectionEntry[]` ↔ `ContentEntry[]`.
4. Markdown-Rendering bleibt in PreactPress (`renderMarkdown`).

**Kein Breaking Change:** Bestehende `content.config.ts` und `.preactpress/config.ts` funktionieren unverändert.

### Phase 2 — Otok-native Greenfield Docs

1. `create-otok` Template `otok-starter-docs` (content + static adapter + theme).
2. `@kamod-ch/otok-preset-docs` — Plugin-Bundle: content + i18n + seo + search route.
3. `apps/docs` (Otok) migriert von PreactPress-Ziel zu Otok.

### Phase 3 — Theme-Konvergenz

1. PreactPress Default-Theme als `@kamod-ch/preactpress-theme` extrahieren.
2. Otok-Layout-Wrapper mit gleichen CSS-Tokens (`--pp-*` Alias auf Kamod).
3. Custom Themes: `./theme/Layout.tsx` → Otok `src/app/components/docs-layout.tsx` mit Compat-Props.

### Phase 4 — Langfristige Konsolidierung

- PreactPress CLI: `preactpress init --engine otok` für neue Projekte.
- PreactPress `build()` kann intern Otok static adapter aufrufen (optional).
- Dokumentation: „PreactPress = Docs Product, powered by Otok“.

---

## 5. Compatibility Layer

Paket: **`@kamod-ch/preactpress-compat`** (`packages/preactpress-compat/`)

```ts
import {
  preactPressRouteToOtok,
  mapThemeConfig,
  buildPreactPressSearchIndex,
  adaptLayoutProps,
  type PreactPressThemeConfig,
} from "@kamod-ch/preactpress-compat";
```

| API | Funktion |
|-----|----------|
| `preactPressRouteToOtok(route)` | `/guide/foo` → Otok route key |
| `mapThemeConfig(config)` | PP themeConfig → Otok docs nav config |
| `buildPreactPressSearchIndex(manifest)` | Manifest → `preactpress-search.json` Format |
| `adaptLayoutProps(otokPage, theme)` | Otok props → PreactPress `LayoutProps` |
| `mapContentEntry(entry)` | Bidirektionale Entry-Map |

**Wann Compat statt Vollmigration?**

- Bestehende Sites mit Custom Themes und PreactPress-Plugins → Compat + Phase 1.
- Neue Sites ohne Legacy → Otok-native (Phase 2).
- Gemischte Monorepos → Compat für Collections, Otok für neue Apps.

---

## 6. Migrationspfad für bestehende Projekte

### Schritt 1 — Inventar

```bash
preactpress check --format json > migration-inventory.json
```

Erfasst: Routen, tote Links, Nav/Sidebar-Konsistenz.

### Schritt 2 — Content portieren

```bash
# Content-Verzeichnis bleibt gleich
cp -r content/ ../my-otok-site/content/
cp content.config.ts ../my-otok-site/
```

Mapping `srcDir` → `content/` root in `otok.config.ts`.

### Schritt 3 — Config migrieren

```ts
// otok.config.ts
import { defineConfig } from "otok";
import staticAdapter from "otok-adapter-static";
import content from "@kamod-ch/otok-content/plugin";
import seo from "@kamod-ch/otok-seo";
import i18n from "@kamod-ch/otok-i18n";
import kamod from "@kamod-ch/otok-kamod";
import { mapThemeConfig } from "@kamod-ch/preactpress-compat";
import legacyConfig from "./.preactpress/config.ts";

const theme = mapThemeConfig(legacyConfig.themeConfig);

export default defineConfig({
  adapter: staticAdapter({ outDir: "dist" }),
  plugins: [
    content({ config: "./content.config.ts", mdx: true, live: true }),
    i18n({ /* aus legacyConfig.locales */ }),
    seo({ origin: legacyConfig.site.url }),
    kamod({ darkMode: true }),
  ],
});
```

### Schritt 4 — Theme anpassen

Custom `Layout.tsx` → `DocsLayout.tsx` mit `adaptLayoutProps()`.

### Schritt 5 — Validierung

```bash
node scripts/benchmark-preactpress-migration.mjs --compare
pnpm --filter @kamod-ch/preactpress-compat test
```

### Rollback

Compat Layer ist additiv. PreactPress-Build bleibt parallel bis Metriken und visuelle Parität bestätigt sind.

---

## 7. Metriken (Vorher / Nachher)

Benchmark-Skript: `scripts/benchmark-preactpress-migration.mjs`

| Metrik | PreactPress (Baseline) | Otok (Ziel) | Messmethode |
|--------|------------------------|-------------|-------------|
| Build-Zeit | TBD | TBD | `measureAsync(build)` |
| Bundle-Größe (dist) | TBD | TBD | `du -sb dist/` |
| Client-JS (main chunk) | TBD | TBD | Parse `index.html` script src |
| Generierte Seiten | TBD | TBD | Count `**/index.html` |
| Suchindex-Größe | TBD | TBD | `preactpress-search.json` vs `search.json` |
| Lighthouse (approx) | TBD | TBD | HTML bytes + JS bytes (static proxy) |

**Baseline-Fixture:** `preactpress/templates/docs` (repräsentative Docs-Seite) vs `otok/examples/preactpress-migration`.

Ergebnisse: `benchmarks/preactpress-migration/results.json`

---

## 8. Regressionstests

| Test-Suite | Ort | Abdeckung |
|------------|-----|-----------|
| Route mapping | `preactpress-compat/*.test.ts` | PP ↔ Otok routes |
| Theme config map | `preactpress-compat/*.test.ts` | nav/sidebar transform |
| Search index format | `preactpress-compat/*.test.ts` | JSON schema parity |
| Content manifest | `otok-content/examples.integration.test.ts` | Collections build |
| E2E visual | `examples/preactpress-migration/e2e/` | Nav, search, i18n switch |

---

## 9. Risiken

| Risiko | Mitigation |
|--------|------------|
| MDX-Feature-Parität | Dokumentierte Limitation; PreactPress für interaktive MDX behalten |
| Static strict + Loader | Manifest virtual import statt Loader |
| Bundle-Größe steigt | Islands sparsam; SSG ohne Hydration wo möglich |
| Plugin-Ökosystem bricht | Compat Phase 1; Plugins unverändert in PreactPress |
| Zwei Theme-Systeme | `--pp-*` Token-Alias; langfristig ein Preset |

---

## 10. Referenzen

- PreactPress Routing: `preactpress/src/node/content.ts`
- PreactPress Build: `preactpress/src/node/build.ts`
- otok-content Architektur: `packages/otok-content/docs/architecture.md`
- otok-content Migration (kurz): `packages/otok-content/docs/migration-preactpress.md`
- Beispiel-Migration: `examples/preactpress-migration/`
- Compat Layer: `packages/preactpress-compat/`
- Benchmark: `scripts/benchmark-preactpress-migration.mjs`
