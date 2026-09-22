import { describe, expect, it } from "vitest";
import { AdminDirectory } from "./directory.js";
import { hasAdminPermission } from "../permissions.js";
import kit from "../kit.js";

describe("admin directory", () => {
  it("creates users against known roles", () => {
    const admin = new AdminDirectory();
    const user = admin.createUser({ email: "ada@example.com", name: "Ada", roleId: "role-admin" });
    expect(user.email).toBe("ada@example.com");
    expect(admin.listUsers()).toHaveLength(1);
    expect(admin.getRole(user.roleId)?.name).toBe("Admin");
  });

  it("rejects unknown roles", () => {
    const admin = new AdminDirectory();
    expect(() => admin.createUser({ email: "x@y.z", name: "X", roleId: "missing" })).toThrow(/Unknown role/);
  });

  it("deactivates users", () => {
    const admin = new AdminDirectory();
    const user = admin.createUser({ email: "a@b.c", name: "A", roleId: "role-member" });
    expect(admin.setUserActive(user.id, false)?.active).toBe(false);
  });

  it("checks permissions", () => {
    expect(hasAdminPermission(["admin:users:read"], "admin:users:read")).toBe(true);
    expect(hasAdminPermission(["admin:users:read"], "admin:users:write")).toBe(false);
    expect(hasAdminPermission(["admin:*"], "admin:roles:write")).toBe(true);
  });
});

describe("admin kit", () => {
  it("ships users and roles routes", () => {
    expect(kit.version).toBe("0.2.0");
    expect(kit.routes?.map((r) => r.to)).toEqual([
      "src/app/routes/admin/index.tsx",
      "src/app/routes/admin/users.tsx",
      "src/app/routes/admin/roles.tsx",
    ]);
  });
});
