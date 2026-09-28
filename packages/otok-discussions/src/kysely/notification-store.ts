import type { Kysely } from "kysely";
import type { NotificationPreferences, SubscriptionStorePort } from "../notifications/types.js";
import type { DiscussionsDatabase } from "./schema.js";
import { DISCUSSIONS_NOTIFICATION_PREFS } from "./schema.js";

function rowToPrefs(row: {
  tenant_id: string;
  user_id: string;
  reply_opt_in: number | boolean;
  mention_opt_in: number | boolean;
  updated_at: string;
}): NotificationPreferences {
  return {
    tenantId: row.tenant_id,
    userId: row.user_id,
    replyOptIn: Boolean(row.reply_opt_in),
    mentionOptIn: Boolean(row.mention_opt_in),
    updatedAt: row.updated_at,
  };
}

export class KyselySubscriptionStore implements SubscriptionStorePort {
  constructor(
    private readonly db: Kysely<DiscussionsDatabase>,
    private readonly clock: () => string = () => new Date().toISOString(),
  ) {}

  async getPreferences(tenantId: string, userId: string): Promise<NotificationPreferences> {
    const row = await this.db
      .selectFrom(DISCUSSIONS_NOTIFICATION_PREFS)
      .selectAll()
      .where("tenant_id", "=", tenantId)
      .where("user_id", "=", userId)
      .executeTakeFirst();
    if (!row) {
      return {
        tenantId,
        userId,
        replyOptIn: false,
        mentionOptIn: false,
        updatedAt: this.clock(),
      };
    }
    return rowToPrefs(row);
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
    await this.db
      .insertInto(DISCUSSIONS_NOTIFICATION_PREFS)
      .values({
        tenant_id: next.tenantId,
        user_id: next.userId,
        reply_opt_in: next.replyOptIn ? 1 : 0,
        mention_opt_in: next.mentionOptIn ? 1 : 0,
        updated_at: next.updatedAt,
      })
      .onConflict((oc) =>
        oc.columns(["tenant_id", "user_id"]).doUpdateSet({
          reply_opt_in: next.replyOptIn ? 1 : 0,
          mention_opt_in: next.mentionOptIn ? 1 : 0,
          updated_at: next.updatedAt,
        }),
      )
      .execute();
    return next;
  }
}
