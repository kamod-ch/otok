import { defineKit } from "@otok/config";
import { CRM_PERMISSIONS } from "./permissions.js";

const KIT_ROOT = "kit-files";

export default defineKit({
  kind: "kit",
  name: "@otok/kit-crm",
  version: "0.1.0",
  starter: "minimal",
  otok: "^0.4.0",
  requires: [
    { package: "otok", range: "^0.4.0" },
    { package: "@kamod-ch/otok-audit", range: ">=0.1.0" },
  ],
  recommends: ["@otok/kit-admin"],
  permissions: Object.values(CRM_PERMISSIONS),
  migrations: [
    {
      id: "20260803120000_crm_initial",
      kit: "@otok/kit-crm",
      description: "CRM core tables — organizations, companies, contacts, pipelines",
      up: "src/schema/migrations/001_initial.sql",
    },
  ],
  packageJson: {
    dependencies: {
      "@otok/kit-crm": "workspace:*",
    },
  },
  routes: [
    { from: `${KIT_ROOT}/routes/crm/index.tsx`, to: "src/app/routes/crm/index.tsx" },
    { from: `${KIT_ROOT}/routes/crm/companies/[id].tsx`, to: "src/app/routes/crm/companies/[id].tsx" },
  ],
  files: [
    { from: `${KIT_ROOT}/data/crm-runtime.ts`, to: "src/app/data/crm-runtime.ts" },
    { from: `${KIT_ROOT}/otok.kit.json`, to: "otok.kit.json" },
  ],
  modules: {
    pipelines: {
      id: "pipelines",
      description: "Sales pipelines and stages",
      files: [{ from: `${KIT_ROOT}/routes/crm/pipelines.tsx`, to: "src/app/routes/crm/pipelines.tsx" }],
      permissions: [CRM_PERMISSIONS.PIPELINES_READ],
    },
    "import-export": {
      id: "import-export",
      description: "CSV company import and export",
      files: [{ from: `${KIT_ROOT}/routes/crm/import.tsx`, to: "src/app/routes/crm/import.tsx" }],
      permissions: [CRM_PERMISSIONS.COMPANIES_IMPORT, CRM_PERMISSIONS.COMPANIES_EXPORT],
    },
    notifications: {
      id: "notifications",
      description: "CRM notification hooks (requires @kamod-ch/otok-notifications)",
      packageJson: { dependencies: { "@kamod-ch/otok-notifications": ">=0.1.0" } },
    },
  },
  overwrite: {
    "src/app/routes/crm/index.tsx": "replace",
  },
});
