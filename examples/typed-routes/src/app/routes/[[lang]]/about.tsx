import { defineLoader, type RouteComponentProps } from "@kamod-ch/otok/route";

export const loader = defineLoader(async ({ params }) => ({
  locale: params.lang ?? "default",
}));

type LoaderData = Awaited<ReturnType<typeof loader>>;

export default function AboutPage({ loaderData }: RouteComponentProps<LoaderData>) {
  return (
    <main>
      <h1>About ({loaderData.locale})</h1>
    </main>
  );
}
