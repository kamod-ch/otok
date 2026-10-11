import { describe, expect, it } from "vitest";
import { safeNextPath, safeRedirectPath } from "./redirect.js";

const ORIGIN = "https://example.com";

function sameOrigin(result: string | null): boolean {
  if (!result) return false;
  return new URL(result, ORIGIN).origin === ORIGIN;
}

describe("safeRedirectPath", () => {
  it("accepts allowlisted relative paths", () => {
    expect(safeRedirectPath("/dashboard", ["/", "/dashboard"])).toBe("/dashboard");
    expect(safeRedirectPath("/dashboard/settings", ["/dashboard"])).toBe("/dashboard/settings");
    expect(safeRedirectPath("/dashboard?tab=x", ["/dashboard"])).toBe("/dashboard?tab=x");
    expect(safeRedirectPath("/", ["/"])).toBe("/");
  });

  it("rejects external and protocol-relative URLs", () => {
    expect(safeRedirectPath("https://evil.test")).toBeNull();
    expect(safeRedirectPath("//evil.test")).toBeNull();
  });

  it("rejects paths outside the allowlist", () => {
    expect(safeRedirectPath("/admin", ["/dashboard"])).toBeNull();
    expect(safeRedirectPath("/dashboard-old", ["/dashboard"])).toBeNull();
  });

  it("rejects traversal and encoded traversal outside allowlist", () => {
    expect(safeRedirectPath("/dashboard/../admin", ["/dashboard"])).toBeNull();
    expect(safeRedirectPath("/dashboard/%2e%2e/admin", ["/dashboard"])).toBeNull();
  });

  it("rejects backslashes, control chars, and slash-backslash mixes", () => {
    expect(safeRedirectPath("/dashboard\\evil", ["/"])).toBeNull();
    expect(safeRedirectPath("/path\r\n", ["/"])).toBeNull();
    expect(safeRedirectPath("/path\t", ["/"])).toBeNull();
    expect(safeRedirectPath("/path\u0000", ["/"])).toBeNull();
  });

  it("rejects paths that normalize to protocol-relative output", () => {
    expect(safeRedirectPath("/.//evil.test", ["/"])).toBeNull();
  });

  it("keeps percent-encoded segments without extra decoding", () => {
    const encoded = safeRedirectPath("/caf%C3%A9", ["/"]);
    expect(encoded).toBe("/caf%C3%A9");
    expect(sameOrigin(encoded)).toBe(true);
  });

  it("returns canonical pathname for accepted targets", () => {
    const result = safeRedirectPath("/dashboard/../dashboard/settings", ["/dashboard"]);
    expect(result).toBe("/dashboard/settings");
    expect(sameOrigin(result)).toBe(true);
  });

  it("uses default allowlist when allowlist is empty", () => {
    expect(safeRedirectPath("/anywhere", [])).toBe("/anywhere");
  });

  it("ignores invalid configured allowlist prefixes without fail-open", () => {
    expect(safeRedirectPath("/safe", ["https://evil.test", "/safe"])).toBe("/safe");
    expect(safeRedirectPath("/other", ["https://evil.test"])).toBeNull();
  });
});

describe("safeNextPath alias", () => {
  it("matches safeRedirectPath", () => {
    expect(safeNextPath("/dashboard", ["/dashboard"])).toBe("/dashboard");
  });
});
