import type {
  NotificationDeliveryContext,
  NotificationDeliveryProvider,
  NotificationDeliveryResult,
  NotificationJobPayload,
} from "../types.js";

export interface LogNotificationProviderOptions {
  log?: (line: string) => void;
  /** In-process dedupe for tests; production should rely on queue idempotency + DB. */
  seenKeys?: Set<string>;
}

export function createLogNotificationProvider(
  options: LogNotificationProviderOptions = {},
): NotificationDeliveryProvider {
  const log = options.log ?? ((line: string) => console.info(line));
  const seen = options.seenKeys ?? new Set<string>();

  return {
    name: "log",
    async deliver(payload: NotificationJobPayload, ctx: NotificationDeliveryContext): Promise<NotificationDeliveryResult> {
      if (seen.has(ctx.idempotencyKey)) {
        return { status: "skipped", reason: "duplicate" };
      }
      seen.add(ctx.idempotencyKey);
      log(
        JSON.stringify({
          provider: "log",
          idempotencyKey: ctx.idempotencyKey,
          kind: payload.kind,
          tenantId: payload.tenantId,
          recipientUserId: payload.recipientUserId,
          commentId: payload.commentId,
          threadId: payload.threadId,
        }),
      );
      return { status: "delivered" };
    },
  };
}
