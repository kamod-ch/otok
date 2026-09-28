import type { NotificationEnqueuePort, NotificationJobPayload } from "./types.js";
import { NOTIFICATION_JOB_NAME } from "./types.js";

export interface QueueEnqueueLike {
  enqueue(
    name: string,
    payload: NotificationJobPayload,
    options?: { idempotencyKey?: string; idempotencyScope?: string },
  ): Promise<unknown>;
}

/** Bridges `@kamod-ch/otok-queue` — at-least-once delivery with stable idempotency keys. */
export function createQueueNotificationEnqueue(
  queue: QueueEnqueueLike,
  options: { idempotencyScope?: string } = {},
): NotificationEnqueuePort {
  const scope = options.idempotencyScope ?? "discussions-notify";
  return {
    async enqueue(payload: NotificationJobPayload) {
      await queue.enqueue(NOTIFICATION_JOB_NAME, payload, {
        idempotencyKey: payload.deliveryKey,
        idempotencyScope: scope,
      });
    },
  };
}
