import { defineConfig } from "@kamod-ch/otok";
import auth from "@kamod-ch/otok-auth";
import { createKyselySessionAdapter } from "@kamod-ch/otok-auth/adapters/kysely";
import i18n from "@kamod-ch/otok-i18n";
import kamod from "@kamod-ch/otok-kamod";
import kysely from "@kamod-ch/otok-kysely";
import security from "@kamod-ch/otok-security";
import seo from "@kamod-ch/otok-seo";
import { createAuthDb, resolveUserByToken } from "./src/db/auth.js";

const connectionString = process.env.DATABASE_URL ?? "sqlite://./data/saas.db";
const authDb = createAuthDb(connectionString);

const sessionAdapter = createKyselySessionAdapter({
  db: authDb,
  table: "sessions",
  resolveUser: (tokenHash) => resolveUserByToken(authDb, tokenHash),
});

export default defineConfig({
  plugins: [
    security(),
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
    seo({
      origin: process.env.APP_URL ?? "http://localhost:5173",
      titleTemplate: "%s | Otok SaaS",
    }),
    kysely({
      dialect: "sqlite",
      connectionString,
    }),
    auth({
      secret: process.env.AUTH_SECRET ?? "dev-secret-at-least-32-characters-long!!",
      session: { cookieName: "saas_session" },
      adapter: sessionAdapter,
      loginPath: "/login",
      redirectAllowlist: ["/", "/dashboard", "/projects"],
      getRole: (user) => user.role,
    }),
  ],
});
