import { describe, expect, it } from "vitest";
import { hashPasswordWebCrypto, verifyPasswordWebCrypto } from "./password-webcrypto.js";

describe("password webcrypto", () => {
  it("hashes and verifies with PBKDF2", async () => {
    const hash = await hashPasswordWebCrypto("correct horse battery", { iterations: 1000 });
    expect(hash.startsWith("pbkdf2$1000$")).toBe(true);
    expect(await verifyPasswordWebCrypto(hash, "correct horse battery")).toBe(true);
    expect(await verifyPasswordWebCrypto(hash, "wrong")).toBe(false);
  });
});
