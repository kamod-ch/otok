import { defineKit } from "@kamod-ch/otok-config";
import { SAAS_PERMISSIONS } from "./permissions.js";

const KIT_ROOT = "kit-files";

export default defineKit({
  kind: "kit",
  name: "@kamod-ch/otok-kit-saas",
  version: "0.2.0",
  otok: "^0.4.0",
  recommends: ["@kamod-ch/otok-kit-admin"],
  permissions: Object.values(SAAS_PERMISSIONS),
  migrations: [
    {
      id: "20260814120000_saas_billing",
      kit: "@kamod-ch/otok-kit-saas",
      description: "Plans, subscriptions, webhook idempotency table",
      up: "src/schema/migrations/001_initial.sql",
    },
  ],
  routes: [
    { from: `${KIT_ROOT}/routes/billing/index.tsx`, to: "src/app/routes/billing/index.tsx" },
    { from: `${KIT_ROOT}/routes/billing/portal.tsx`, to: "src/app/routes/billing/portal.tsx" },
    { from: `${KIT_ROOT}/routes/api/stripe/webhook.tsx`, to: "src/app/routes/api/stripe/webhook.tsx" },
  ],
  files: [{ from: `${KIT_ROOT}/data/saas-runtime.ts`, to: "src/app/data/saas-runtime.ts" }],
  packageJson: {
    dependencies: {
      "@kamod-ch/otok-stripe": ">=0.1.0",
      "@kamod-ch/otok-kit-saas": "workspace:*",
    },
  },
  envSchema: {
    STRIPE_SECRET_KEY: "string",
    STRIPE_WEBHOOK_SECRET: "string",
    STRIPE_PRICE_LAUNCH: "string",
    STRIPE_PRICE_PRO: "string",
  },
});
