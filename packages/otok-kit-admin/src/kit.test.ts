import { describe, expect, it } from "vitest";
import kit from "./kit.js";
import { adminKit } from "./index.js";

describe("admin kit", () => {
  it("exports the admin kit manifest", () => {
    expect(adminKit).toBe(kit);
    expect(kit).toMatchObject({
      kind: "kit",
      name: "@kamod-ch/otok-kit-admin",
      version: "0.1.0",
      starter: "minimal",
      otok: "^0.4.0",
      conflicts: ["@kamod-ch/otok-kit-marketplace"],
    });
  });

  it("declares admin routes, permissions, and package dependency", () => {
    expect(kit.permissions).toEqual(["admin:users:read", "admin:users:write", "admin:roles:read"]);
    expect(kit.routes).toEqual([
      { from: "kit-files/routes/admin/index.tsx", to: "src/app/routes/admin/index.tsx" },
    ]);
    expect(kit.packageJson?.dependencies).toEqual({ "@kamod-ch/otok-kit-admin": "workspace:*" });
  });
});
