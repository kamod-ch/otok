import { defineLoader, serializeI18n } from "@kamod-ch/otok-i18n/loader";
import { i18nHead } from "@kamod-ch/otok-i18n";
import { stripLocaleParam } from "@kamod-ch/otok-i18n/routes";
import type { OtokPageProps } from "otok/server";

const LOCALES = ["de", "en", "fr"] as const;
const ORIGIN = process.env.APP_URL ?? "http://localhost:5173";

export const loader = defineLoader(({ i18n, hono, request }) => {
  const url = new URL(request.url);
  const { pathname } = stripLocaleParam(url.pathname, LOCALES);
  return { i18n: serializeI18n(hono), pathname };
});

export const head = ({ data }) =>
  i18nHead({
    locale: data.i18n.locale,
    locales: LOCALES,
    defaultLocale: "de",
    origin: ORIGIN,
    pathname: data.pathname,
    extra: { title: data.i18n.messages["nav.products"] ?? "Products" },
  });

export default function ProductsPage({ data }: OtokPageProps<typeof loader>) {
  return (
    <main class="card">
      <h1>{data.i18n.messages["nav.products"]}</h1>
      <p>{data.i18n.messages["dashboard.price"]}: CHF 29</p>
    </main>
  );
}
