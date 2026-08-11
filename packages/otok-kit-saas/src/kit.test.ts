import { describe, expect, it } from "vitest";
import kit from "./kit.js";
import { saasKit } from "./index.js";

describe("saas kit", () => {
  it("exports the SaaS kit manifest", () => {
    expect(saasKit).toBe(kit);
    expect(kit).toMatchObject({
      kind: "kit",
      name: "@kamod-ch/otok-kit-saas",
      version: "0.1.0",
      starter: "minimal",
      otok: "^0.4.0",
      recommends: ["@kamod-ch/otok-kit-admin"],
    });
  });

  it("declares billing routes, permissions, and package dependencies", () => {
    expect(kit.permissions).toEqual(["saas:billing:read", "saas:subscriptions:manage"]);
    expect(kit.routes).toEqual([
      { from: "kit-files/routes/billing/index.tsx", to: "src/app/routes/billing/index.tsx" },
    ]);
    expect(kit.packageJson?.dependencies).toEqual({
      "@kamod-ch/otok-stripe": ">=0.1.0",
      "@kamod-ch/otok-kit-saas": "workspace:*",
    });
  });
});
