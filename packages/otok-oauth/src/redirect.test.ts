import { describe, expect, it } from "vitest";
import { safeNextPath } from "./redirect.js";

describe("safeNextPath", () => {
  it("accepts relative same-origin paths", () => {
    expect(safeNextPath("/studio")).toBe("/studio");
    expect(safeNextPath("/studio/jobs?x=1")).toBe("/studio/jobs?x=1");
  });

  it("rejects open redirects", () => {
    expect(safeNextPath("//evil.com")).toBeNull();
    expect(safeNextPath("https://evil.com")).toBeNull();
    expect(safeNextPath("evil.com")).toBeNull();
    expect(safeNextPath("")).toBeNull();
    expect(safeNextPath(null)).toBeNull();
    expect(safeNextPath(undefined)).toBeNull();
  });
});
