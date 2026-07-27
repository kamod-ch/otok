import { createLocalizedSitemapEntries, renderSitemapXml } from "@kamod-ch/otok-i18n/sitemap";

const ORIGIN = process.env.APP_URL ?? "http://localhost:5173";

export const loader = () => {
  const entries = createLocalizedSitemapEntries(["/", "/products"], {
    origin: ORIGIN,
    locales: ["de", "en", "fr"],
    defaultLocale: "de",
    routing: "prefix-except-default",
  });
  return new Response(renderSitemapXml(entries), {
    headers: { "content-type": "application/xml; charset=utf-8" },
  });
};
