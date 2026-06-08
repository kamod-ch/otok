import { describe, expect, it } from "vitest";
import { decodeIslandProps, encodeIslandProps } from "./islands.js";

describe("island prop serialization", () => {
  it("round-trips JSON-safe props through base64url", () => {
    const encoded = encodeIslandProps({
      name: "Otok",
      count: 3,
      nested: { enabled: true },
    });

    expect(encoded).not.toContain("+");
    expect(encoded).not.toContain("/");
    expect(decodeIslandProps(encoded)).toEqual({
      name: "Otok",
      count: 3,
      nested: { enabled: true },
    });
  });

  it("uses an empty payload for empty props", () => {
    expect(encodeIslandProps({})).toBe("");
    expect(decodeIslandProps("")).toEqual({});
  });
});
