import { defineRendering } from "@kamod-ch/otok/rendering";
import { setContentManifest, getEntryByRoute, listDocRoutes } from "../../../../lib/content.js";
import { DocsLayout } from "../../../components/docs-layout.js";
import { docsTheme, siteTitle } from "../../../../site/docs-theme.js";
import { contentManifest } from "virtual:otok-plugin/@kamod-ch/otok-content/manifest";

setContentManifest(contentManifest);

const deRoutes = listDocRoutes().filter((r: string) => r.startsWith("/de/docs"));

export const rendering = defineRendering({
  mode: "ssg",
  prerender: {
    paths: deRoutes,
    params: { slug: deRoutes.map((r: string) => r.replace(/^\/de\/docs\//, "")).filter(Boolean) },
  },
});

type PageProps = { params: { slug?: string } };

export default function DeDocPage({ params }: PageProps) {
  const slug = params.slug ?? "";
  const route = slug ? `/de/docs/${slug}` : "/de/docs";
  const entry = getEntryByRoute(route) ?? getEntryByRoute("/de/docs");
  if (!entry) return <main>Nicht gefunden</main>;

  return (
    <DocsLayout
      siteTitle={siteTitle}
      theme={docsTheme}
      locale="de"
      page={{
        route: entry.route,
        title: String(entry.data.title),
        description: typeof entry.data.description === "string" ? entry.data.description : undefined,
        html: entry.html ?? "",
        toc: entry.toc ?? [],
      }}
    />
  );
}

export function meta({ params }: PageProps) {
  const slug = params.slug ?? "";
  const route = slug ? `/de/docs/${slug}` : "/de/docs";
  const entry = getEntryByRoute(route);
  return { title: entry ? String(entry.data.title) : "Dokumentation" };
}
