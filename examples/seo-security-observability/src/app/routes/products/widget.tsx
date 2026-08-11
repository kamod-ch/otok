import { defineLoader } from "@kamod-ch/otok-observability/loader";
import { defineMeta } from "@kamod-ch/otok-seo";

export const loader = defineLoader(async () => ({
  product: {
    name: "Widget",
    description: "A demo product for SEO metadata.",
    slug: "widget",
  },
}));

type LoaderData = Awaited<ReturnType<typeof loader>>;

export const head = defineMeta(
  ({ data }: { data: any }) => ({
    title: data.product.name,
    description: data.product.description,
    canonical: `/products/${data.product.slug}`,
    openGraph: { type: "product" },
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "Product",
      name: data.product.name,
      description: data.product.description,
    },
  }),
  { origin: "http://localhost:3010", titleTemplate: "%s | Otok Demo" },
);

export default function ProductPage({ data }: { data: LoaderData }) {
  return (
    <main>
      <h1>{data.product.name}</h1>
      <p>{data.product.description}</p>
    </main>
  );
}
