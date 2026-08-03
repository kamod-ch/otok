import type { AiStreamEvent } from "../types.js";

/** Fan-out one async iterable to multiple independent consumers. */
export function teeAsyncIterable<T>(source: AsyncIterable<T>): [AsyncIterable<T>, AsyncIterable<T>] {
  const buffer: T[] = [];
  let finished = false;
  let streamError: unknown;
  let pumpPromise: Promise<void> | null = null;
  const waiters = new Set<() => void>();

  function notifyWaiters(): void {
    for (const wake of waiters) wake();
    waiters.clear();
  }

  function ensurePump(): Promise<void> {
    if (!pumpPromise) {
      pumpPromise = (async () => {
        try {
          for await (const item of source) {
            buffer.push(item);
            notifyWaiters();
          }
        } catch (error) {
          streamError = error;
        } finally {
          finished = true;
          notifyWaiters();
        }
      })();
    }
    return pumpPromise;
  }

  function branch(): AsyncIterable<T> {
    let index = 0;
    return {
      async *[Symbol.asyncIterator]() {
        await ensurePump();
        while (true) {
          while (index < buffer.length) {
            yield buffer[index++] as T;
          }
          if (finished) {
            if (streamError) throw streamError;
            return;
          }
          await new Promise<void>((resolve) => waiters.add(resolve));
        }
      },
    };
  }

  void ensurePump();
  return [branch(), branch()];
}

export function aiStreamToSse(events: AsyncIterable<AiStreamEvent>): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  return new ReadableStream({
    async start(controller) {
      controller.enqueue(encoder.encode(": connected\n\n"));
      try {
        for await (const event of events) {
          controller.enqueue(encoder.encode(`event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`));
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : "Stream error";
        controller.enqueue(
          encoder.encode(`event: error\ndata: ${JSON.stringify({ message })}\n\n`),
        );
      } finally {
        controller.close();
      }
    },
  });
}

export function aiSseResponse(stream: ReadableStream<Uint8Array>): Response {
  return new Response(stream, {
    headers: {
      "content-type": "text/event-stream; charset=utf-8",
      "cache-control": "no-cache, no-transform",
      connection: "keep-alive",
      "x-accel-buffering": "no",
    },
  });
}

export async function collectStreamEvents(events: AsyncIterable<AiStreamEvent>): Promise<{
  text: string;
  events: AiStreamEvent[];
  usage?: AiStreamEvent & { type: "usage" };
}> {
  const collected: AiStreamEvent[] = [];
  let text = "";
  let usage: (AiStreamEvent & { type: "usage" }) | undefined;
  for await (const event of events) {
    collected.push(event);
    if (event.type === "text-delta") text += event.delta;
    if (event.type === "usage") usage = event;
  }
  return { text, events: collected, usage };
}
