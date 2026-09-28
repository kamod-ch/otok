import type { DiscussionSubject } from "../types/domain.js";

/** Explicit opt-in channels — all default off in stores. */
export type NotificationSubscriptionKind = "reply" | "mention";

export interface NotificationPreferences {
  tenantId: string;
  userId: string;
  replyOptIn: boolean;
  mentionOptIn: boolean;
  updatedAt: string;
}

export interface NotificationJobPayload {
  /** Stable delivery idempotency key (queue + provider). */
  deliveryKey: string;
  kind: NotificationSubscriptionKind;
  tenantId: string;
  subject: DiscussionSubject;
  threadId: string;
  commentId: string;
  recipientUserId: string;
  actorUserId: string;
  /** Public reference only — no markdown body. */
  occurredAt: string;
}

export interface NotificationDeliveryContext {
  idempotencyKey: string;
  attempt: number;
}

export type NotificationDeliveryResult =
  | { status: "delivered" }
  | { status: "skipped"; reason: "opt_out" | "inactive_recipient" | "duplicate" }
  | { status: "failed"; retryable: boolean; message: string };

export interface NotificationDeliveryProvider {
  readonly name: string;
  deliver(payload: NotificationJobPayload, ctx: NotificationDeliveryContext): Promise<NotificationDeliveryResult>;
}

export interface NotificationEnqueuePort {
  enqueue(payload: NotificationJobPayload): Promise<void>;
}

export interface SubscriptionStorePort {
  getPreferences(tenantId: string, userId: string): Promise<NotificationPreferences>;
  setPreferences(input: {
    tenantId: string;
    userId: string;
    replyOptIn?: boolean;
    mentionOptIn?: boolean;
  }): Promise<NotificationPreferences>;
}

export interface NotificationsBridgeConfig {
  subscriptions: SubscriptionStorePort;
  enqueue: NotificationEnqueuePort;
  /** Skip delivery when false (deleted/disabled users). */
  isRecipientActive?: (tenantId: string, userId: string) => Promise<boolean>;
}

export const NOTIFICATION_JOB_NAME = "discussions.notify" as const;
