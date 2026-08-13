import { defineLoader, type RouteComponentProps } from "@kamod-ch/otok/route";

export const loader = defineLoader(async ({ params }) => ({
  slug: Array.isArray(params.slug) ? params.slug : String(params.slug ?? "").split("/"),
}));

type LoaderData = Awaited<ReturnType<typeof loader>>;

export default function DocsPage({ loaderData }: RouteComponentProps<LoaderData>) {
  return (
    <main>
      <h1>Docs</h1>
      <p>{loaderData.slug.join(" / ")}</p>
    </main>
  );
}
