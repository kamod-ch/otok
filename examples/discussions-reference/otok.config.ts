import { defineConfig } from "@kamod-ch/otok";
import node from "otok-adapter-node";
import kysely from "@kamod-ch/otok-kysely";
import auth from "@kamod-ch/otok-auth";
import i18n from "@kamod-ch/otok-i18n";
import kamod from "@kamod-ch/otok-kamod";
import security from "@kamod-ch/otok-security";
import seo from "@kamod-ch/otok-seo";
import { getKyselyRuntime } from "@kamod-ch/otok-kysely/registry";
import { createRefSessionAdapter, resolveUserByToken } from "./src/db/session.js";
import refCore from "./src/plugins/ref-core.js";
import refDiscussions from "./src/plugins/ref-discussions.js";
import type { RefDatabase } from "./src/db/types.js";
import type { DiscussionsDatabase } from "@kamod-ch/otok-discussions/kysely";

const appUrl = process.env.APP_URL ?? "http://localhost:5195";
const connectionString =
  process.env.DATABASE_URL ?? "postgres://otok:otok@localhost:5437/discussions_reference";

const sessionAdapter = createRefSessionAdapter({
  getDb: () => getKyselyRuntime<RefDatabase & DiscussionsDatabase>().db,
  resolveUser: resolveUserByToken,
});

export default defineConfig({
  adapter: node({ outDir: "dist", port: Number(process.env.PORT ?? 5195), host: "0.0.0.0" }),
  plugins: [
    security({
      trustedHosts: ["localhost", "127.0.0.1"],
      strict: false,
      csrf: { cookieName: "discussions_ref_csrf" },
    }),
    seo({
      origin: appUrl,
      titleTemplate: "%s | Discussions Reference",
      siteName: "Discussions Reference",
      sitemapPaths: ["/articles", "/login"],
    }),
    kysely({
      dialect: "postgres",
      connectionString,
      migrations: { directory: "migrations" },
      seeds: { directory: "seeds" },
    }),
    kamod({ theme: "default", icons: true, forms: true }),
    i18n({
      locales: ["de", "en"],
      defaultLocale: "de",
      routing: "prefix-except-default",
      fallbackLocale: "en",
      messages: {
        de: () => import("./src/locales/de.json"),
        en: () => import("./src/locales/en.json"),
      },
    }),
    auth({
      secret: process.env.AUTH_SECRET ?? "dev-secret-at-least-32-characters-long-disc-ref!!",
      session: {
        cookieName: "discussions_ref_session",
        csrfCookie: "discussions_ref_csrf",
        rotationIntervalSeconds: 3600,
        maxAgeSeconds: 60 * 60 * 24 * 14,
      },
      adapter: sessionAdapter,
      loginPath: "/login",
      redirectAllowlist: ["/", "/articles", "/discussions"],
    }),
    refCore(),
    refDiscussions(),
  ],
});
