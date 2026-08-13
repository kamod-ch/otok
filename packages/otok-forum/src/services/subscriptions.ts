import type { ForumPermission, ForumReadState, ForumStorageAdapter } from "../types.js";
import { FORUM_PERMISSIONS, requireForumPermission } from "../permissions.js";

export class SubscriptionService {
  constructor(private readonly storage: ForumStorageAdapter) {}

  async subscribe(threadId: string, userId: string, permissions: ForumPermission[]) {
    requireForumPermission(permissions, FORUM_PERMISSIONS.POST_CREATE);
    return this.storage.subscriptions.subscribe(threadId, userId);
  }

  async unsubscribe(threadId: string, userId: string, permissions: ForumPermission[]) {
    requireForumPermission(permissions, FORUM_PERMISSIONS.POST_CREATE);
    await this.storage.subscriptions.unsubscribe(threadId, userId);
  }

  isSubscribed(threadId: string, userId: string) {
    return this.storage.subscriptions.isSubscribed(threadId, userId);
  }
}

export class ReadStateService {
  constructor(private readonly storage: ForumStorageAdapter) {}

  async markRead(
    threadId: string,
    userId: string,
    lastReadPostId: string | null,
    permissions: ForumPermission[],
  ): Promise<ForumReadState> {
    requireForumPermission(permissions, FORUM_PERMISSIONS.CATEGORY_VIEW);
    return this.storage.readStates.upsert(threadId, userId, lastReadPostId);
  }

  find(threadId: string, userId: string) {
    return this.storage.readStates.find(threadId, userId);
  }
}
