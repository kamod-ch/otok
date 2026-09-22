import { describe, expect, it } from "vitest";
import kit from "./kit.js";
import { adminKit } from "./index.js";
import { ADMIN_PERMISSIONS } from "./permissions.js";

describe("admin kit", () => {
  it("exports the admin kit manifest", () => {
    expect(adminKit).toBe(kit);
    expect(kit).toMatchObject({
      kind: "kit",
      name: "@kamod-ch/otok-kit-admin",
      version: "0.2.0",
      starter: "minimal",
      otok: "^0.4.0",
      conflicts: ["@kamod-ch/otok-kit-marketplace"],
    });
  });

  it("declares admin routes, permissions, and package dependency", () => {
    expect(kit.permissions).toEqual(Object.values(ADMIN_PERMISSIONS));
    expect(kit.routes?.map((route) => route.to)).toEqual([
      "src/app/routes/admin/index.tsx",
      "src/app/routes/admin/users.tsx",
      "src/app/routes/admin/roles.tsx",
    ]);
    expect(kit.packageJson?.dependencies).toEqual({ "@kamod-ch/otok-kit-admin": "workspace:*" });
  });
});
