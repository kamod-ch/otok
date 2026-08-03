import { describe, expect, it } from "vitest";
import { hashToken, slugify } from "./ids.js";

describe("ids", () => {
  it("hashes tokens deterministically", () => {
    expect(hashToken("abc")).toBe(hashToken("abc"));
    expect(hashToken("abc")).not.toBe(hashToken("def"));
  });

  it("slugifies organization names", () => {
    expect(slugify("Acme GmbH")).toBe("acme-gmbh");
  });
});
