import type { ContentManifest } from "@kamod-ch/otok-content";

/** PreactPress themeConfig subset supported by the compat layer. */
export type PreactPressNavItem = {
  text: string;
  link?: string;
  items?: PreactPressNavItem[];
};

export type PreactPressSidebarItem = {
  text: string;
  link?: string;
  collapsed?: boolean;
  items?: PreactPressSidebarItem[];
};

export type PreactPressThemeConfig = {
  nav?: PreactPressNavItem[];
  sidebar?: PreactPressSidebarItem[] | Record<string, PreactPressSidebarItem[]>;
  search?: boolean | { provider?: "local" | "algolia" };
  outline?: boolean | { level?: number | [number, number] };
  logo?: string | { src: string; alt?: string };
  footer?: string;
  socialLinks?: Array<{ icon: string; link: string; ariaLabel?: string }>;
  editLink?: boolean | { pattern: string };
  lastUpdated?: boolean;
};

export type OtokDocsNavItem = {
  label: string;
  href: string;
  children?: OtokDocsNavItem[];
};

export type OtokDocsThemeConfig = {
  nav: OtokDocsNavItem[];
  sidebar: Record<string, OtokDocsNavItem[]>;
  searchEnabled: boolean;
  outlineEnabled: boolean;
  footer?: string;
  socialLinks?: Array<{ icon: string; href: string; ariaLabel?: string }>;
};

/** Map a PreactPress file path to an Otok docs route (default collection prefix `/docs`). */
export function preactPressFileToOtokRoute(
  filePath: string,
  options: { collectionPrefix?: string; stripIndex?: boolean } = {},
): string {
  const prefix = options.collectionPrefix ?? "/docs";
  const stripIndex = options.stripIndex ?? true;
  let normalized = filePath.replace(/\\/g, "/").replace(/^\.\//, "");
  normalized = normalized.replace(/\.(md|mdx)$/, "");
  if (stripIndex && normalized.endsWith("/index")) normalized = normalized.slice(0, -"/index".length);
  if (normalized === "index") return "/";
  const segments = normalized.split("/").filter(Boolean);
  if (segments[0] === "de" || segments[0] === "en" || segments[0] === "fr") {
    const [locale, ...rest] = segments;
    if (rest.length === 0) return `/${locale}`;
    const slug = rest.join("/");
    return slug === "index" ? `/${locale}` : `/${locale}${prefix}/${slug}`;
  }
  return `${prefix}/${segments.join("/")}`;
}

/** Map an Otok public route back to a content-relative path key. */
export function otokRouteToPreactPressPath(route: string, options: { contentRoot?: string } = {}): string {
  const root = options.contentRoot ?? "docs";
  const normalized = route.replace(/\/+$/, "") || "/";
  if (normalized === "/") return `${root}/index.md`;
  const localeMatch = normalized.match(/^\/([a-z]{2})(\/|$)/);
  if (localeMatch) {
    const locale = localeMatch[1];
    const rest = normalized.slice(locale.length + 1) || "";
    if (!rest || rest === "/") return `${locale}/index.md`;
    const slug = rest.replace(/^\/docs\//, "");
    return `${locale}/${root}/${slug}.md`;
  }
  const slug = normalized.replace(/^\/docs\//, "").replace(/^\//, "");
  return `${root}/${slug}.md`;
}

function mapNavItem(item: PreactPressNavItem): OtokDocsNavItem {
  return {
    label: item.text,
    href: item.link ?? "#",
    children: item.items?.map(mapNavItem),
  };
}

function mapSidebarGroup(items: PreactPressSidebarItem[]): OtokDocsNavItem[] {
  return items.flatMap((item) => {
    if (item.items?.length) {
      return [
        {
          label: item.text,
          href: item.link ?? "#",
          children: item.items.map((child) => ({
            label: child.text,
            href: child.link ?? "#",
          })),
        },
      ];
    }
    return [{ label: item.text, href: item.link ?? "#" }];
  });
}

/** Convert PreactPress themeConfig to Otok docs layout configuration. */
export function mapThemeConfig(themeConfig: PreactPressThemeConfig = {}): OtokDocsThemeConfig {
  const sidebarInput = themeConfig.sidebar;
  const sidebar: Record<string, OtokDocsNavItem[]> = {};

  if (Array.isArray(sidebarInput)) {
    sidebar["/"] = mapSidebarGroup(sidebarInput);
  } else if (sidebarInput) {
    for (const [prefix, groups] of Object.entries(sidebarInput)) {
      sidebar[prefix] = mapSidebarGroup(groups);
    }
  }

  const searchEnabled =
    themeConfig.search === true ||
    (typeof themeConfig.search === "object" && themeConfig.search.provider !== "algolia");

  return {
    nav: (themeConfig.nav ?? []).map(mapNavItem),
    sidebar,
    searchEnabled,
    outlineEnabled: themeConfig.outline !== false,
    footer: themeConfig.footer,
    socialLinks: themeConfig.socialLinks?.map((link) => ({
      icon: link.icon,
      href: link.link,
      ariaLabel: link.ariaLabel,
    })),
  };
}

/** PreactPress local search index entry shape (preactpress-search.json). */
export type PreactPressSearchEntry = {
  route: string;
  locale?: string;
  version?: string;
  workspace?: string;
  title: string;
  description?: string;
  excerpt?: string;
  tags?: string[];
};

/** Build a PreactPress-compatible search index from an otok-content manifest. */
export function buildPreactPressSearchIndex(manifest: ContentManifest): PreactPressSearchEntry[] {
  const entries: PreactPressSearchEntry[] = [];
  for (const bucket of Object.values(manifest.collections)) {
    for (const entry of bucket.entries) {
      const data = entry.data as Record<string, unknown>;
      entries.push({
        route: entry.route,
        locale: entry.locale,
        title: (typeof data.title === "string" && data.title) || entry.slug,
        description: typeof data.description === "string" ? data.description : undefined,
        excerpt: typeof data.excerpt === "string" ? data.excerpt : undefined,
        tags: Array.isArray(data.tags) ? (data.tags as string[]) : undefined,
      });
    }
  }
  return entries;
}

export type AdaptedLayoutPage = {
  route: string;
  title: string;
  description?: string;
  html: string;
  toc: Array<{ id: string; text: string; level: number }>;
};

/** Adapt Otok content page data to PreactPress LayoutProps-compatible shape. */
export function adaptLayoutProps(input: {
  page: AdaptedLayoutPage;
  site: { title: string; description?: string; url?: string };
  theme: OtokDocsThemeConfig;
  locale?: string;
  version?: string;
}) {
  return {
    page: {
      route: input.page.route,
      title: input.page.title,
      description: input.page.description,
      content: input.page.html,
      headings: input.page.toc,
    },
    site: input.site,
    themeConfig: {
      nav: input.theme.nav.map((n) => ({
        text: n.label,
        link: n.href,
        items: n.children?.map((c) => ({ text: c.label, link: c.href })),
      })),
      sidebar: input.theme.sidebar,
      search: input.theme.searchEnabled,
      outline: input.theme.outlineEnabled,
      footer: input.theme.footer,
      socialLinks: input.theme.socialLinks?.map((s) => ({
        icon: s.icon,
        link: s.href,
        ariaLabel: s.ariaLabel,
      })),
    },
    locale: input.locale,
    version: input.version,
  };
}

export function flattenSidebarForPager(
  sidebar: OtokDocsNavItem[],
): Array<{ label: string; href: string }> {
  const flat: Array<{ label: string; href: string }> = [];
  for (const item of sidebar) {
    if (item.href && item.href !== "#") flat.push({ label: item.label, href: item.href });
    item.children?.forEach((child) => {
      if (child.href && child.href !== "#") flat.push({ label: child.label, href: child.href });
    });
  }
  return flat;
}

export function resolveSidebarForRoute(theme: OtokDocsThemeConfig, route: string): OtokDocsNavItem[] {
  const prefixes = Object.keys(theme.sidebar).sort((a, b) => b.length - a.length);
  for (const prefix of prefixes) {
    if (route === prefix || route.startsWith(`${prefix}/`)) {
      return theme.sidebar[prefix] ?? [];
    }
  }
  return theme.sidebar["/"] ?? [];
}
