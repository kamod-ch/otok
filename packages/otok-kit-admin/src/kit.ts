import { defineKit } from "@kamod-ch/otok-config";

export default defineKit({
  kind: "kit",
  name: "@kamod-ch/otok-kit-admin",
  version: "0.1.0",
  starter: "minimal",
  otok: "^0.4.0",
  conflicts: ["@kamod-ch/otok-kit-marketplace"],
  permissions: ["admin:users:read", "admin:users:write", "admin:roles:read"],
  routes: [{ from: "kit-files/routes/admin/index.tsx", to: "src/app/routes/admin/index.tsx" }],
  packageJson: { dependencies: { "@kamod-ch/otok-kit-admin": "workspace:*" } },
});
