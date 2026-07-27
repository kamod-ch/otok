import { describe, expect, it } from "vitest";
import { safeRedirectPath } from "./redirect.js";

describe("safeRedirectPath", () => {
  it("accepts allowlisted relative paths", () => {
    expect(safeRedirectPath("/dashboard", ["/", "/dashboard"])).toBe("/dashboard");
    expect(safeRedirectPath("/dashboard/settings", ["/dashboard"])).toBe("/dashboard/settings");
  });

  it("rejects external and protocol-relative URLs", () => {
    expect(safeRedirectPath("https://evil.test")).toBeNull();
    expect(safeRedirectPath("//evil.test")).toBeNull();
  });

  it("rejects paths outside the allowlist", () => {
    expect(safeRedirectPath("/admin", ["/dashboard"])).toBeNull();
  });
});
