import { defineConfig } from "otok";
import node from "otok-adapter-node";
import kysely from "@kamod-ch/otok-kysely";
import auth from "@kamod-ch/otok-auth";
import i18n from "@kamod-ch/otok-i18n";
import audit from "@kamod-ch/otok-audit";
import search from "@kamod-ch/otok-search";
import workflows from "@kamod-ch/otok-workflows";
import kamod from "@kamod-ch/otok-kamod";
import { enrichCompany } from "@kamod-ch/otok-workflows";
import { createMemorySessionAdapter } from "@kamod-ch/otok-auth/adapters/memory";
import { resolveCrmSessionUser } from "./src/lib/auth-users.js";

const sessionAdapter = createMemorySessionAdapter({
  resolveUser: ({ session }) => resolveCrmSessionUser(session.userId),
});

export default defineConfig({
  adapter: node({ outDir: "dist", port: 3010, host: "0.0.0.0" }),
  plugins: [
    kamod({ theme: "default", icons: true, forms: true }),
    kysely({
      dialect: "postgres",
      connectionString:
        process.env.DATABASE_URL ?? "postgres://otok:otok@localhost:5433/crm_swiss",
      migrations: { directory: "migrations" },
      seeds: { directory: "seeds" },
    }),
    auth({
      secret: process.env.AUTH_SECRET ?? "dev-secret-at-least-32-characters-long-for-crm!!",
      session: { cookieName: "crm_session" },
      adapter: sessionAdapter,
      redirectAllowlist: ["/", "/crm", "/login"],
      getRole: (user) => user.roleSlug,
      loginPath: "/login",
    }),
    i18n({
      defaultLocale: (process.env.OTOK_LOCALE as "de" | "fr" | "en" | "it") ?? "de",
      locales: ["de", "fr", "en", "it"],
    }),
    audit({ defaultTenantId: "org-swiss-demo", redactFields: ["email"] }),
    search({ searchPath: "/api/search" }),
    workflows({
      workflows: { enrichCompany },
      processIntervalMs: 500,
    }),
  ],
});
