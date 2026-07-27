import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "../src/lib/password.js";
import { satisfiesMinimum } from "@kamod-ch/otok-kamod";

describe("password helpers", () => {
  it("hashes and verifies passwords", () => {
    const hash = hashPassword("demo-password");
    expect(verifyPassword("demo-password", hash)).toBe(true);
    expect(verifyPassword("wrong", hash)).toBe(false);
  });
});

describe("kamod version helpers", () => {
  it("compares semver-like versions", () => {
    expect(satisfiesMinimum("1.0.3", "1.0.0")).toBe(true);
    expect(satisfiesMinimum("0.9.0", "1.0.0")).toBe(false);
  });
});
