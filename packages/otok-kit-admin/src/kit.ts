import { defineKit } from "@kamod-ch/otok-config";
import { ADMIN_PERMISSIONS } from "./permissions.js";

const KIT_ROOT = "kit-files";

export default defineKit({
  kind: "kit",
  name: "@kamod-ch/otok-kit-admin",
  version: "0.2.0",
  starter: "minimal",
  otok: "^0.4.0",
  conflicts: ["@kamod-ch/otok-kit-marketplace"],
  permissions: Object.values(ADMIN_PERMISSIONS),
  routes: [
    { from: `${KIT_ROOT}/routes/admin/index.tsx`, to: "src/app/routes/admin/index.tsx" },
    { from: `${KIT_ROOT}/routes/admin/users.tsx`, to: "src/app/routes/admin/users.tsx" },
    { from: `${KIT_ROOT}/routes/admin/roles.tsx`, to: "src/app/routes/admin/roles.tsx" },
  ],
  files: [{ from: `${KIT_ROOT}/data/admin-runtime.ts`, to: "src/app/data/admin-runtime.ts" }],
  packageJson: { dependencies: { "@kamod-ch/otok-kit-admin": "workspace:*" } },
});
