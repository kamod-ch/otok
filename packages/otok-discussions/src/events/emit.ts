import type { DiscussionDomainEvent, EventSink } from "../types/ports.js";
import { redactDiscussionLogRecord } from "../observability/log-redaction.js";

export interface EmitDiscussionEventOptions {
  timeoutMs?: number;
  onError?: (error: unknown, event: DiscussionDomainEvent) => void;
}

const DEFAULT_TIMEOUT_MS = 2_000;

export async function emitDiscussionEvent(
  sink: EventSink,
  event: DiscussionDomainEvent,
  options: EmitDiscussionEventOptions = {},
): Promise<void> {
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const onError =
    options.onError ??
    ((error, evt) => {
      console.warn(
        "[otok-discussions:event]",
        redactDiscussionLogRecord({ error: String(error), eventName: evt.name, tenantId: evt.tenantId }),
      );
    });

  try {
    await Promise.race([
      Promise.resolve(sink.emit(event)),
      new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error("Event handler timeout")), timeoutMs);
      }),
    ]);
  } catch (error) {
    onError(error, event);
  }
}
