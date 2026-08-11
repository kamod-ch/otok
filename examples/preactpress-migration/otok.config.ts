import { defineConfig } from "otok";
import staticAdapter from "otok-adapter-static";
import content from "@kamod-ch/otok-content/plugin";
import seo from "@kamod-ch/otok-seo";
import i18n from "@kamod-ch/otok-i18n";
import kamod from "@kamod-ch/otok-kamod";

const origin = process.env.SITE_URL ?? "http://localhost:5173";

export default defineConfig({
  adapter: staticAdapter({ outDir: "dist", strict: false }),
  plugins: [
    kamod({ theme: "default", darkMode: true, forms: false }),
    content({
      config: "./content.config.ts",
      root: "content",
      mdx: false,
      live: true,
      locales: ["en", "de"],
      defaultLocale: "en",
    }),
    i18n({
      locales: ["en", "de"],
      defaultLocale: "en",
      routing: "prefix-except-default",
      fallbackLocale: "en",
      messages: {
        en: () => import("./src/locales/en.json"),
        de: () => import("./src/locales/de.json"),
      },
    }),
    seo({
      origin,
      titleTemplate: "%s | PreactPress on Otok",
      sitemapPaths: ["/", "/docs/getting-started", "/docs/markdown-examples", "/de/docs/getting-started"],
      robots: true,
    }),
  ],
});
