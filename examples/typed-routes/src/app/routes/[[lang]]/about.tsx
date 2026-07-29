import { defineLoader } from "otok/route";

export const loader = defineLoader(async ({ params }) => ({
  locale: params.lang ?? "default",
}));

export default function AboutPage({ loaderData }: Route.ComponentProps) {
  return (
    <main>
      <h1>About ({loaderData.locale})</h1>
    </main>
  );
}
