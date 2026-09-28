import type { DiscussionSubject } from "../types/domain.js";
import type { DiscussionsCacheInvalidation } from "./types.js";
import { buildThreadCacheInvalidation } from "./cache-policy.js";

export async function invalidateDiscussionThreadCache(
  invalidation: DiscussionsCacheInvalidation | undefined,
  basePath: string,
  subject: DiscussionSubject,
): Promise<void> {
  if (!invalidation) return;
  const { tags, paths } = buildThreadCacheInvalidation(basePath, subject);
  if (invalidation.revalidateTags) {
    await invalidation.revalidateTags(tags);
    return;
  }
  if (invalidation.revalidatePaths) {
    await invalidation.revalidatePaths(paths);
  }
}
