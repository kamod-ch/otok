import { describe, expect, it } from "vitest";
import { can, canInviteMore, memberLimitForPlan } from "./permissions.js";

describe("permissions", () => {
  it("blocks invites on free plan", () => {
    expect(can("owner", "free", "team:invite")).toBe(false);
    expect(can("owner", "pro", "team:invite")).toBe(true);
  });

  it("respects member limits", () => {
    expect(canInviteMore("free", 1)).toBe(false);
    expect(canInviteMore("pro", 4)).toBe(true);
    expect(memberLimitForPlan("team")).toBeNull();
  });
});
