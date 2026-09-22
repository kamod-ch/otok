import { describe, expect, it } from "vitest";
import kit from "./kit.js";
import { saasKit } from "./index.js";
import { SAAS_PERMISSIONS } from "./permissions.js";

describe("saas kit", () => {
  it("exports the SaaS kit manifest", () => {
    expect(saasKit).toBe(kit);
    expect(kit).toMatchObject({
      kind: "kit",
      name: "@kamod-ch/otok-kit-saas",
      version: "0.2.0",
      otok: "^0.4.0",
      recommends: ["@kamod-ch/otok-kit-admin"],
    });
  });

  it("declares billing routes, permissions, migration, and package dependencies", () => {
    expect(kit.permissions).toEqual(Object.values(SAAS_PERMISSIONS));
    expect(kit.routes?.map((route) => route.to)).toEqual([
      "src/app/routes/billing/index.tsx",
      "src/app/routes/billing/portal.tsx",
      "src/app/routes/api/stripe/webhook.tsx",
    ]);
    expect(kit.migrations?.[0]?.id).toBe("20260814120000_saas_billing");
    expect(kit.packageJson?.dependencies).toEqual({
      "@kamod-ch/otok-stripe": ">=0.1.0",
      "@kamod-ch/otok-kit-saas": "workspace:*",
    });
  });
});
