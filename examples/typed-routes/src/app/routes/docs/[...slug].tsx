import { defineLoader } from "otok/route";

export const loader = defineLoader(async ({ params }) => ({
  slug: Array.isArray(params.slug) ? params.slug : String(params.slug ?? "").split("/"),
}));

export default function DocsPage({ loaderData }: Route.ComponentProps) {
  return (
    <main>
      <h1>Docs</h1>
      <p>{loaderData.slug.join(" / ")}</p>
    </main>
  );
}
