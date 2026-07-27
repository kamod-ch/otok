import { defineMeta } from "@kamod-ch/otok-seo";

export const head = defineMeta(
  () => ({
    title: "Home",
    description: "SEO, security, and observability integration demo.",
    canonical: "/",
    openGraph: { type: "website" },
  }),
  { origin: "http://localhost:3010", titleTemplate: "%s | Otok Demo" },
);

export default function Home() {
  return (
    <main>
      <h1>SEO + Security + Observability</h1>
      <p>
        Visit <a href="/products/widget">/products/widget</a> for dynamic metadata.
      </p>
      <p>
        Utility routes: <a href="/robots.txt">/robots.txt</a>, <a href="/sitemap.xml">/sitemap.xml</a>
      </p>
    </main>
  );
}
