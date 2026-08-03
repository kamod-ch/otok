import type { ComponentChildren } from "preact";
import { useState, useMemo } from "preact/hooks";
import { Button } from "@kamod-ch/ui/button";
import {
  flattenSidebarForPager,
  resolveSidebarForRoute,
  type OtokDocsThemeConfig,
} from "@kamod-ch/preactpress-compat";

export type DocsPageView = {
  route: string;
  title: string;
  description?: string;
  html: string;
  toc: Array<{ id: string; text: string; level: number }>;
};

type DocsLayoutProps = {
  siteTitle: string;
  theme: OtokDocsThemeConfig;
  page: DocsPageView;
  locale?: string;
  version?: string;
  children?: ComponentChildren;
};

export function DocsLayout({ siteTitle, theme, page, locale, version }: DocsLayoutProps) {
  const [query, setQuery] = useState("");
  const sidebar = resolveSidebarForRoute(theme, page.route);
  const flat = flattenSidebarForPager(sidebar);
  const idx = flat.findIndex((item) => item.href === page.route);
  const prev = idx > 0 ? flat[idx - 1] : undefined;
  const next = idx >= 0 && idx < flat.length - 1 ? flat[idx + 1] : undefined;

  const filteredNav = useMemo(() => {
    if (!query.trim()) return flat;
    const q = query.toLowerCase();
    return flat.filter((item) => item.label.toLowerCase().includes(q));
  }, [flat, query]);

  return (
    <div class="min-h-screen bg-background text-foreground">
      <header class="border-b border-border">
        <div class="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-3">
          <a href="/" class="font-semibold tracking-tight">
            {siteTitle}
          </a>
          <nav class="flex flex-wrap items-center gap-3 text-sm">
            {theme.nav.map((item) => (
              <a key={item.href} href={item.href} class="text-muted-foreground hover:text-foreground">
                {item.label}
              </a>
            ))}
            <VersionSwitcher current={version ?? "v1"} />
            <ThemeToggle />
            <a href="/de/docs/getting-started" class="text-muted-foreground hover:text-foreground">
              DE
            </a>
          </nav>
        </div>
      </header>

      <div class="mx-auto grid max-w-6xl gap-8 px-4 py-8 lg:grid-cols-[14rem_minmax(0,1fr)_12rem]">
        <aside class="space-y-4 text-sm">
          {theme.searchEnabled && (
            <input
              type="search"
              placeholder="Search…"
              value={query}
              onInput={(e) => setQuery((e.target as HTMLInputElement).value)}
              class="w-full rounded-md border border-input bg-background px-3 py-2"
            />
          )}
          <nav class="space-y-3">
            {(query ? filteredNav : flat).map((item) => (
              <a
                key={item.href}
                href={item.href}
                class={
                  item.href === page.route
                    ? "block font-medium text-foreground"
                    : "block text-muted-foreground hover:text-foreground"
                }
              >
                {item.label}
              </a>
            ))}
          </nav>
        </aside>

        <article class="min-w-0">
          <header class="mb-6 border-b border-border pb-4">
            <h1 class="text-3xl font-semibold tracking-tight">{page.title}</h1>
            {page.description && <p class="mt-2 text-muted-foreground">{page.description}</p>}
            {locale && <p class="mt-1 text-xs text-muted-foreground">Locale: {locale}</p>}
          </header>
          <div
            class="prose prose-neutral dark:prose-invert max-w-none docs-content"
            dangerouslySetInnerHTML={{ __html: page.html }}
          />
          <footer class="mt-10 flex justify-between gap-4 border-t border-border pt-6 text-sm">
            {prev ? (
              <a href={prev.href} class="text-muted-foreground hover:text-foreground">
                ← {prev.label}
              </a>
            ) : (
              <span />
            )}
            {next ? (
              <a href={next.href} class="text-muted-foreground hover:text-foreground">
                {next.label} →
              </a>
            ) : null}
          </footer>
        </article>

        {theme.outlineEnabled && page.toc.length > 0 && (
          <aside class="hidden text-sm lg:block">
            <p class="mb-2 font-medium">On this page</p>
            <ul class="space-y-1 text-muted-foreground">
              {page.toc.map((h) => (
                <li key={h.id} style={{ paddingLeft: `${(h.level - 2) * 0.75}rem` }}>
                  <a href={`#${h.id}`} class="hover:text-foreground">
                    {h.text}
                  </a>
                </li>
              ))}
            </ul>
          </aside>
        )}
      </div>

      {theme.footer && (
        <footer class="border-t border-border py-6 text-center text-sm text-muted-foreground">
          {theme.footer}
        </footer>
      )}
    </div>
  );
}

function ThemeToggle() {
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={() => {
        document.documentElement.classList.toggle("dark");
      }}
    >
      Theme
    </Button>
  );
}

function VersionSwitcher({ current }: { current: string }) {
  return (
    <select
      class="rounded-md border border-input bg-background px-2 py-1 text-sm"
      value={current}
      onChange={(e) => {
        const v = (e.target as HTMLSelectElement).value;
        window.location.href = v === "v2" ? "/docs/v2-overview" : "/docs/getting-started";
      }}
    >
      <option value="v1">v1</option>
      <option value="v2">v2</option>
    </select>
  );
}
