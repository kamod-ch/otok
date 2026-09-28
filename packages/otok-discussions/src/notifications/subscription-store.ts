import type { NotificationPreferences, SubscriptionStorePort } from "./types.js";

const DEFAULT_PREFS = (tenantId: string, userId: string, iso: string): NotificationPreferences => ({
  tenantId,
  userId,
  replyOptIn: false,
  mentionOptIn: false,
  updatedAt: iso,
});

export class MemorySubscriptionStore implements SubscriptionStorePort {
  private readonly map = new Map<string, NotificationPreferences>();

  constructor(private readonly clock: () => string = () => new Date().toISOString()) {}

  private key(tenantId: string, userId: string) {
    return `${tenantId}\0${userId}`;
  }

  async getPreferences(tenantId: string, userId: string): Promise<NotificationPreferences> {
    return this.map.get(this.key(tenantId, userId)) ?? DEFAULT_PREFS(tenantId, userId, this.clock());
  }

  async setPreferences(input: {
    tenantId: string;
    userId: string;
    replyOptIn?: boolean;
    mentionOptIn?: boolean;
  }): Promise<NotificationPreferences> {
    const current = await this.getPreferences(input.tenantId, input.userId);
    const next: NotificationPreferences = {
      ...current,
      replyOptIn: input.replyOptIn ?? current.replyOptIn,
      mentionOptIn: input.mentionOptIn ?? current.mentionOptIn,
      updatedAt: this.clock(),
    };
    this.map.set(this.key(input.tenantId, input.userId), next);
    return next;
  }
}
