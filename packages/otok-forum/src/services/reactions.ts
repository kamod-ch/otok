import type { ForumPermission, ForumReaction, ForumStorageAdapter } from "../types.js";
import { FORUM_PERMISSIONS, requireForumPermission } from "../permissions.js";

export class ReactionService {
  constructor(private readonly storage: ForumStorageAdapter) {}

  async add(
    postId: string,
    userId: string,
    emoji: string,
    permissions: ForumPermission[],
  ): Promise<ForumReaction> {
    requireForumPermission(permissions, FORUM_PERMISSIONS.POST_CREATE);
    return this.storage.reactions.upsert(postId, userId, emoji);
  }

  async remove(postId: string, userId: string, emoji: string, permissions: ForumPermission[]): Promise<void> {
    requireForumPermission(permissions, FORUM_PERMISSIONS.POST_CREATE);
    await this.storage.reactions.remove(postId, userId, emoji);
  }

  listByPost(postId: string): Promise<ForumReaction[]> {
    return this.storage.reactions.listByPost(postId);
  }
}
