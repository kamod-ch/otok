import type { DiscussionComment } from "../types/domain.js";
import type { DiscussionsContextState } from "../http/types.js";

export type EnrichedCommentItem = Pick<
  DiscussionComment,
  "id" | "bodyMarkdown" | "authorId" | "status" | "isPlaceholder" | "scorePositive" | "scoreNegative" | "createdAt"
> & {
  authorDisplayName?: string;
  authorAvatarUrl?: string;
};

export async function enrichCommentItems(
  state: DiscussionsContextState,
  items: DiscussionComment[],
): Promise<EnrichedCommentItem[]> {
  const resolver = state.options.actorResolver;
  const cache = new Map<string, { displayName?: string; avatarUrl?: string }>();

  return Promise.all(
    items.map(async (item) => {
      let cached = cache.get(item.authorId);
      if (!cached) {
        const actor = await resolver.resolveActor({ userId: item.authorId });
        cached = actor
          ? { displayName: actor.displayName, avatarUrl: actor.avatarUrl }
          : { displayName: item.authorId };
        cache.set(item.authorId, cached);
      }
      return {
        id: item.id,
        bodyMarkdown: item.bodyMarkdown,
        authorId: item.authorId,
        status: item.status,
        isPlaceholder: item.isPlaceholder,
        scorePositive: item.scorePositive,
        scoreNegative: item.scoreNegative,
        createdAt: item.createdAt,
        authorDisplayName: cached.displayName,
        authorAvatarUrl: cached.avatarUrl,
      };
    }),
  );
}
