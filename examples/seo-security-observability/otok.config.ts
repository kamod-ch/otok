import { defineConfig } from "otok";
import node from "otok-adapter-node";
import observability from "@kamod-ch/otok-observability";
import security from "@kamod-ch/otok-security";
import seo from "@kamod-ch/otok-seo";

export default defineConfig({
  adapter: node({ outDir: "dist", port: 3010, host: "0.0.0.0" }),
  plugins: [
    // Order: security → observability → SEO (utility routes after guards)
    security({
      trustedHosts: ["localhost", "127.0.0.1"],
      strict: false,
    }),
    observability(),
    seo({
      origin: "http://localhost:3010",
      titleTemplate: "%s | Otok Demo",
      siteName: "Otok Demo",
      sitemapPaths: ["/", "/products/widget"],
      icons: [{ href: "/favicon.ico" }],
    }),
  ],
});
