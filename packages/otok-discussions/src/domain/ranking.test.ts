import { describe, expect, it } from "vitest";
import { commentRankingScore, wilsonScoreLowerBound } from "./ranking.js";

describe("wilsonScoreLowerBound", () => {
  it("ranks higher confidence positives above noisy scores", () => {
    const stable = wilsonScoreLowerBound(90, 100);
    const noisy = wilsonScoreLowerBound(2, 2);
    expect(stable).toBeGreaterThan(noisy);
  });

  it("returns zero without votes", () => {
    expect(wilsonScoreLowerBound(0, 0)).toBe(0);
  });
});

describe("commentRankingScore", () => {
  it("uses positive and negative counts", () => {
    const high = commentRankingScore({ scorePositive: 10, scoreNegative: 1 });
    const low = commentRankingScore({ scorePositive: 2, scoreNegative: 8 });
    expect(high).toBeGreaterThan(low);
  });
});
