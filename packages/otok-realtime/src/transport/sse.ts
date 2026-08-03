import type { RealtimeMessage, RealtimeError } from "../types.js";
import { isRealtimeError } from "../errors.js";

export function formatSseEvent(message: RealtimeMessage | RealtimeError): string {
  if (isRealtimeError(message)) {
    return `event: error\ndata: ${JSON.stringify(message)}\n\n`;
  }
  return `id: ${message.id}\nevent: ${message.type}\ndata: ${JSON.stringify({
    channel: message.channel,
    room: message.room,
    data: message.data,
    timestamp: message.timestamp,
  })}\n\n`;
}

export function formatSseComment(comment: string): string {
  return `: ${comment}\n\n`;
}

export function parseLastEventId(header: string | undefined): string | undefined {
  return header?.trim() || undefined;
}

export interface SseStreamOptions {
  onClose?: () => void;
  signal?: AbortSignal;
}

/** Create a ReadableStream that writes SSE frames. */
export function createSseStream(
  push: (write: (chunk: string) => void) => void | Promise<void>,
  options: SseStreamOptions = {},
): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  let closed = false;

  return new ReadableStream({
    async start(controller) {
      const write = (chunk: string) => {
        if (closed) return;
        controller.enqueue(encoder.encode(chunk));
      };

      write(formatSseComment("connected"));

      options.signal?.addEventListener("abort", () => {
        closed = true;
        options.onClose?.();
        controller.close();
      });

      await push(write);
    },
    cancel() {
      closed = true;
      options.onClose?.();
    },
  });
}

export function sseResponse(stream: ReadableStream<Uint8Array>): Response {
  return new Response(stream, {
    headers: {
      "content-type": "text/event-stream; charset=utf-8",
      "cache-control": "no-cache, no-transform",
      connection: "keep-alive",
      "x-accel-buffering": "no",
    },
  });
}
