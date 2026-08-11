import { defineKit } from "@kamod-ch/otok-config";

export default defineKit({
  kind: "kit",
  name: "@kamod-ch/otok-kit-saas",
  version: "0.1.0",
  starter: "minimal",
  otok: "^0.4.0",
  recommends: ["@kamod-ch/otok-kit-admin"],
  permissions: ["saas:billing:read", "saas:subscriptions:manage"],
  routes: [{ from: "kit-files/routes/billing/index.tsx", to: "src/app/routes/billing/index.tsx" }],
  packageJson: {
    dependencies: { "@kamod-ch/otok-stripe": ">=0.1.0", "@kamod-ch/otok-kit-saas": "workspace:*" },
  },
});
