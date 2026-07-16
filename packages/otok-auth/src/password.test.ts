import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "./password.js";

describe("password", () => {
  it("hashes and verifies passwords", async () => {
    const hashed = await hashPassword("secret-pass");
    expect(hashed).not.toBe("secret-pass");
    expect(await verifyPassword(hashed, "secret-pass")).toBe(true);
    expect(await verifyPassword(hashed, "wrong")).toBe(false);
  });
});
