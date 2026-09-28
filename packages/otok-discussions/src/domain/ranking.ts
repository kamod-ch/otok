/**
 * Wilson score lower bound (95% confidence) for positive/negative votes.
 * Used for community "top" ranking — not for editorial pin/highlight.
 */
export function wilsonScoreLowerBound(positive: number, total: number, z = 1.96): number {
  if (total <= 0) return 0;
  const phat = positive / total;
  const z2 = z * z;
  const numerator = phat + z2 / (2 * total) - z * Math.sqrt((phat * (1 - phat) + z2 / (4 * total)) / total);
  const denominator = 1 + z2 / total;
  return numerator / denominator;
}

export function commentRankingScore(comment: { scorePositive: number; scoreNegative: number }): number {
  const total = comment.scorePositive + comment.scoreNegative;
  return wilsonScoreLowerBound(comment.scorePositive, total);
}

/** Editorial ordering: pinned threads first by pinRank, then community sort applies within buckets. */
export function compareEditorialPin(
  a: { pinnedAt: string | null; pinRank: number | null },
  b: { pinnedAt: string | null; pinRank: number | null },
): number {
  const aPinned = a.pinnedAt ? 1 : 0;
  const bPinned = b.pinnedAt ? 1 : 0;
  if (aPinned !== bPinned) return bPinned - aPinned;
  const aRank = a.pinRank ?? Number.MAX_SAFE_INTEGER;
  const bRank = b.pinRank ?? Number.MAX_SAFE_INTEGER;
  return aRank - bRank;
}
