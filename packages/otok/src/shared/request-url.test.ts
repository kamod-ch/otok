import { describe, expect, it } from "vitest";
import { SANITIZE_REQUEST_PATH_FALLBACK, sanitizeRequestPath } from "./request-url.js";

const TEST_TOKEN = "otok-url-sanitize-test-token-abc123XYZ";

describe("sanitizeRequestPath", () => {
  it("strips query tokens and fragments", () => {
    const path = sanitizeRequestPath(`https://app.test/orders?token=${TEST_TOKEN}&page=2#section`);
    expect(path).toBe("/orders");
    expect(path).not.toContain(TEST_TOKEN);
    expect(JSON.stringify({ path })).not.toContain(TEST_TOKEN);
  });

  it("masks invite path tokens", () => {
    const path = sanitizeRequestPath(`http://localhost/invite/${TEST_TOKEN}`);
    expect(path).toBe("/invite/:token");
    expect(path).not.toContain(TEST_TOKEN);
  });

  it("uses route pattern when provided", () => {
    const path = sanitizeRequestPath(`http://localhost/invite/${TEST_TOKEN}`, {
      routePattern: "/invite/:token",
    });
    expect(path).toBe("/invite/:token");
    expect(path).not.toContain(TEST_TOKEN);
  });

  it("redacts high-entropy segments on unknown routes", () => {
    const path = sanitizeRequestPath(`http://localhost/files/${TEST_TOKEN}/meta`);
    expect(path).not.toContain(TEST_TOKEN);
    expect(path).toMatch(/\/files\/:redacted\/meta$/);
  });

  it("drops URL credentials without leaking them", () => {
    const path = sanitizeRequestPath(`https://user:${TEST_TOKEN}@app.test/dashboard`);
    expect(path).toBe("/dashboard");
    expect(path).not.toContain(TEST_TOKEN);
  });

  it("handles encoded path segments", () => {
    const encoded = encodeURIComponent(TEST_TOKEN);
    const path = sanitizeRequestPath(`http://localhost/invite/${encoded}`);
    expect(path).toBe("/invite/:token");
    expect(path).not.toContain(TEST_TOKEN);
  });

  it("returns a fixed fallback on invalid input", () => {
    expect(sanitizeRequestPath("")).toBe(SANITIZE_REQUEST_PATH_FALLBACK);
    expect(sanitizeRequestPath("http://evil.test/path", { routePattern: "https://bad?t=1" })).toBe(
      SANITIZE_REQUEST_PATH_FALLBACK,
    );
    expect(SANITIZE_REQUEST_PATH_FALLBACK).not.toBe("");
  });

  it("maps oauth callback paths to provider template", () => {
    expect(sanitizeRequestPath("http://localhost/auth/github/callback?code=secret&state=x")).toBe(
      "/auth/:provider/callback",
    );
  });
});
