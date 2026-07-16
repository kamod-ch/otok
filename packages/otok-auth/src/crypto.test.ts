import { describe, expect, it } from "vitest";
import { randomToken, sha256 } from "./crypto.js";

describe("crypto", () => {
  it("produces stable sha256 hashes", () => {
    expect(sha256("hello")).toBe(sha256("hello"));
    expect(sha256("hello")).not.toBe(sha256("world"));
    expect(sha256("hello")).toMatch(/^[a-f0-9]{64}$/);
  });

  it("produces base64url tokens of expected length", () => {
    const token = randomToken(32);
    expect(token).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(token.length).toBeGreaterThanOrEqual(40);
    expect(randomToken()).not.toBe(randomToken());
  });
});
