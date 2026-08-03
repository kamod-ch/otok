import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "./password.js";

describe("password", () => {
  it("hashes and verifies passwords", () => {
    const stored = hashPassword("secret-password");
    expect(verifyPassword("secret-password", stored)).toBe(true);
    expect(verifyPassword("wrong", stored)).toBe(false);
  });
});
