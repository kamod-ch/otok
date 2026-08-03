import { defineConfig } from "otok";
import node from "otok-adapter-node";
import kysely from "@kamod-ch/otok-kysely";
import auth from "@kamod-ch/otok-auth";
import oauth from "@kamod-ch/otok-oauth";
import mail from "@kamod-ch/otok-mail";
import stripe from "@kamod-ch/otok-stripe";
import i18n from "@kamod-ch/otok-i18n";
import kamod from "@kamod-ch/otok-kamod";
import security from "@kamod-ch/otok-security";
import seo from "@kamod-ch/otok-seo";
import observability from "@kamod-ch/otok-observability";
import { getKyselyRuntime } from "@kamod-ch/otok-kysely/registry";
import { createSaasSessionAdapter, resolveUserByToken } from "./src/db/session.js";
import { createOAuthAdapter } from "./src/lib/oauth-adapter.js";
import saasCore from "./src/plugins/saas-core.js";
import type { SaasDatabase } from "./src/db/types.js";

const appUrl = process.env.APP_URL ?? "http://localhost:5173";
const connectionString =
  process.env.DATABASE_URL ?? "postgres://otok:otok@localhost:5434/saas_reference";

const sessionAdapter = createSaasSessionAdapter({
  getDb: () => getKyselyRuntime<SaasDatabase>().db,
  resolveUser: resolveUserByToken,
});

const oauthAdapter = createOAuthAdapter(() => getKyselyRuntime<SaasDatabase>().db);

const stripeProvider =
  process.env.STRIPE_SECRET_KEY && process.env.NODE_ENV === "production"
    ? ({ type: "live" as const, secretKey: process.env.STRIPE_SECRET_KEY })
    : ({ type: "test" as const });

const oauthProviders: Record<string, { clientId: string; clientSecret: string; redirectUri: string }> = {};
if (process.env.GITHUB_CLIENT_ID) {
  oauthProviders.github = {
    clientId: process.env.GITHUB_CLIENT_ID,
    clientSecret: process.env.GITHUB_CLIENT_SECRET ?? "",
    redirectUri: `${appUrl}/auth/github/callback`,
  };
}
if (process.env.GOOGLE_CLIENT_ID) {
  oauthProviders.google = {
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    redirectUri: `${appUrl}/auth/google/callback`,
  };
}

export default defineConfig({
  adapter: node({ outDir: "dist", port: 5173, host: "0.0.0.0" }),
  plugins: [
    security({
      trustedHosts: ["localhost", "127.0.0.1"],
      strict: false,
      rateLimit: { windowMs: 60_000, max: 120 },
      csrf: true,
    }),
    observability(),
    seo({
      origin: appUrl,
      titleTemplate: "%s | Otok SaaS Reference",
      siteName: "Otok SaaS Reference",
      sitemapPaths: ["/", "/login", "/register"],
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
      defaultFrom: process.env.MAIL_FROM ?? "Otok SaaS <noreply@saas.local>",
      preview: true,
    }),
    auth({
      secret: process.env.AUTH_SECRET ?? "dev-secret-at-least-32-characters-long-for-saas-ref!!",
      session: {
        cookieName: "saas_session",
        csrfCookie: "saas_csrf",
        rotationIntervalSeconds: 3600,
        maxAgeSeconds: 60 * 60 * 24 * 14,
      },
      adapter: sessionAdapter,
      loginPath: "/login",
      redirectAllowlist: ["/", "/dashboard", "/org/new", "/invite"],
      getRole: (user) => user.id,
    }),
    oauth({
      adapter: oauthAdapter,
      redirectAllowlist: ["/", "/dashboard", "/org/new"],
      providers: oauthProviders,
    }),
    stripe({
      provider: stripeProvider,
      webhookSecret: process.env.STRIPE_WEBHOOK_SECRET ?? "whsec_test",
    }),
    saasCore({
      stripe: {
        provider: stripeProvider,
        webhookSecret: process.env.STRIPE_WEBHOOK_SECRET ?? "whsec_test",
      },
      stripePricePro: process.env.STRIPE_PRICE_PRO ?? "price_pro_test",
      stripePriceTeam: process.env.STRIPE_PRICE_TEAM ?? "price_team_test",
    }),
  ],
});
