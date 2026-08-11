/** Example: wrap Kamod UI components for @kamod-ch/otok-forum */
import type { ForumComponentOverrides } from "@kamod-ch/otok-forum";

/**
 * Pass to createForum({ components: kamodForumComponents }) when @kamod-ch/otok-kamod is installed.
 *
 * ```ts
 * import { Button, Card } from "@kamod-ch/otok-kamod";
 * // Map forum slots to Kamod primitives...
 * ```
 */
export const kamodForumComponents: Partial<ForumComponentOverrides> = {
  // Post: KamodPost,
  // ThreadList: KamodThreadList,
};
