import { defineConfig } from "@kamod-ch/otok";
import node from "otok-adapter-node";
import kysely from "@kamod-ch/otok-kysely";
import auth from "@kamod-ch/otok-auth";
import mail from "@kamod-ch/otok-mail";
import i18n from "@kamod-ch/otok-i18n";
import kamod from "@kamod-ch/otok-kamod";
import security from "@kamod-ch/otok-security";
import seo from "@kamod-ch/otok-seo";
import { getKyselyRuntime } from "@kamod-ch/otok-kysely/registry";
import { createDevjobsSessionAdapter, resolveUserByToken } from "./src/db/session.js";
import devjobsCore from "./src/plugins/devjobs-core.js";
import type { DevjobsDatabase } from "./src/db/types.js";

const appUrl = process.env.APP_URL ?? "http://localhost:5180";
const connectionString =
  process.env.DATABASE_URL ?? "postgres://otok:otok@localhost:5435/devjobs_reference";

const sessionAdapter = createDevjobsSessionAdapter({
  getDb: () => getKyselyRuntime<DevjobsDatabase>().db,
  resolveUser: resolveUserByToken,
});

export default defineConfig({
  adapter: node({ outDir: "dist", port: Number(process.env.PORT ?? 5180), host: "0.0.0.0" }),
  plugins: [
    security({
      trustedHosts: ["localhost", "127.0.0.1"],
      strict: false,
      csrf: true,
    }),
    seo({
      origin: appUrl,
      titleTemplate: "%s | Devjobs Reference",
      siteName: "Devjobs Reference",
      sitemapPaths: ["/jobs", "/login", "/impressum"],
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
    mail({
      provider: { type: "test" },
      defaultFrom: "Devjobs Reference <noreply@devjobs.local>",
      preview: true,
    }),
    auth({
      secret: process.env.AUTH_SECRET ?? "dev-secret-at-least-32-characters-long-devjobs-ref!!",
      session: {
        cookieName: "devjobs_session",
        csrfCookie: "devjobs_csrf",
        rotationIntervalSeconds: 3600,
        maxAgeSeconds: 60 * 60 * 24 * 14,
      },
      adapter: sessionAdapter,
      loginPath: "/login",
      redirectAllowlist: ["/", "/jobs", "/employer"],
    }),
    devjobsCore(),
  ],
});
