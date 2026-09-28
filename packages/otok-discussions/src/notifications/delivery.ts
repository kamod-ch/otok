import type { NotificationDeliveryProvider, NotificationJobPayload } from "./types.js";
import type { SubscriptionStorePort } from "./types.js";

export async function deliverNotificationJob(
  provider: NotificationDeliveryProvider,
  subscriptions: SubscriptionStorePort,
  payload: NotificationJobPayload,
  ctx: {
    idempotencyKey: string;
    attempt: number;
    isRecipientActive?: (tenantId: string, userId: string) => Promise<boolean>;
  },
): Promise<import("./types.js").NotificationDeliveryResult> {
  if (ctx.isRecipientActive && !(await ctx.isRecipientActive(payload.tenantId, payload.recipientUserId))) {
    return { status: "skipped", reason: "inactive_recipient" };
  }

  const prefs = await subscriptions.getPreferences(payload.tenantId, payload.recipientUserId);
  const allowed = (payload.kind === "reply" && prefs.replyOptIn) || (payload.kind === "mention" && prefs.mentionOptIn);
  if (!allowed) {
    return { status: "skipped", reason: "opt_out" };
  }

  return provider.deliver(payload, { idempotencyKey: ctx.idempotencyKey, attempt: ctx.attempt });
}

/** Queue worker entry — idempotent via deliveryKey. */
export function createNotificationJobHandler(options: {
  provider: NotificationDeliveryProvider;
  subscriptions: SubscriptionStorePort;
  isRecipientActive?: (tenantId: string, userId: string) => Promise<boolean>;
}) {
  return async (payload: NotificationJobPayload) => {
    return deliverNotificationJob(options.provider, options.subscriptions, payload, {
      idempotencyKey: payload.deliveryKey,
      attempt: 1,
      isRecipientActive: options.isRecipientActive,
    });
  };
}
