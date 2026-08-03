import { defineKit } from "@otok/config";

export default defineKit({
  kind: "kit",
  name: "@otok/kit-saas",
  version: "0.1.0",
  starter: "minimal",
  otok: "^0.4.0",
  recommends: ["@otok/kit-admin"],
  permissions: ["saas:billing:read", "saas:subscriptions:manage"],
  routes: [{ from: "kit-files/routes/billing/index.tsx", to: "src/app/routes/billing/index.tsx" }],
  packageJson: {
    dependencies: { "@kamod-ch/otok-stripe": ">=0.1.0", "@otok/kit-saas": "workspace:*" },
  },
});
