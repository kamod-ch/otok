import { defineKit } from "@kamod-ch/otok-config";

export default defineKit({
  kind: "kit",
  name: "@kamod-ch/otok-kit-marketplace",
  version: "0.1.0",
  starter: "minimal",
  conflicts: ["@kamod-ch/otok-kit-admin"],
  permissions: ["marketplace:listings:read", "marketplace:orders:read"],
  routes: [{ from: "kit-files/routes/marketplace/index.tsx", to: "src/app/routes/marketplace/index.tsx" }],
});
