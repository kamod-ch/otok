import { defineRendering } from "otok/rendering";
import { setContentManifest, getEntryByRoute, listDocRoutes } from "../../lib/content.js";
import { DocsLayout } from "../../components/docs-layout.js";
import { docsTheme, siteTitle } from "../../site/docs-theme.js";
import { contentManifest } from "virtual:otok-plugin/@kamod-ch/otok-content/manifest";

setContentManifest(contentManifest);

const routes = listDocRoutes().filter((r) => r.startsWith("/docs"));

export const rendering = defineRendering({
  mode: "ssg",
  prerender: {
    paths: routes,
    params: {
      slug: routes.map((r) => r.replace(/^\/docs\//, "")).filter(Boolean),
    },
  },
});

type PageProps = { params: { slug?: string } };

function resolveDocRoute(params: PageProps["params"]): string {
  const slug = params.slug ?? "";
  if (!slug) return "/docs/index";
  if (slug.startsWith("v2/")) return `/docs/${slug}`;
  return `/docs/${slug}`;
}

export default function DocPage({ params }: PageProps) {
  const route = resolveDocRoute(params);
  const entry = getEntryByRoute(route) ?? getEntryByRoute("/docs/index");
  if (!entry) return <main>Not found</main>;

  const version = typeof entry.data.version === "string" ? entry.data.version : "v1";

  return (
    <DocsLayout
      siteTitle={siteTitle}
      theme={docsTheme}
      locale={entry.locale}
      version={version}
      page={{
        route: entry.route,
        title: String(entry.data.title),
        description: typeof entry.data.description === "string" ? entry.data.description : undefined,
        html: entry.html,
        toc: entry.toc,
      }}
    />
  );
}

export function meta({ params }: PageProps) {
  const route = resolveDocRoute(params);
  const entry = getEntryByRoute(route);
  return { title: entry ? String(entry.data.title) : "Docs" };
}
