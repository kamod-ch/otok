import type { CloudflareRealtimeMessage } from "./sse.js";
import { assertInternalRequest } from "./internal-auth.js";
import { CLOUDFLARE_REALTIME_LIFECYCLE, CLOUDFLARE_REALTIME_RETENTION } from "./contract.js";
import { formatGapEvent, formatSseComment, formatSseEvent } from "./sse.js";

interface StoredMeta {
  seq: number;
  channel: string;
  room: string;
}

interface Subscriber {
  id: string;
  pending: number;
  write: (chunk: string) => boolean;
  closed: boolean;
}

const EVENTS_KEY = "events";
const META_KEY = "meta";
const MIN_SEQ_KEY = "minSeq";

export interface RealtimeRoomEnv {
  REALTIME_INTERNAL_SECRET: string;
}

export class RealtimeRoom {
  private readonly state: DurableObjectState;
  private readonly env: RealtimeRoomEnv;
  private readonly subscribers = new Map<string, Subscriber>();

  constructor(state: DurableObjectState, env: RealtimeRoomEnv) {
    this.state = state;
    this.env = env;
  }

  async fetch(request: Request): Promise<Response> {
    if (!assertInternalRequest(request, this.env.REALTIME_INTERNAL_SECRET)) {
      return new Response("Forbidden", { status: 403 });
    }

    const url = new URL(request.url);
    if (url.pathname === "/internal/publish" && request.method === "POST") {
      return this.handlePublish(request);
    }
    if (url.pathname === "/internal/subscribe" && request.method === "GET") {
      return this.handleSubscribe(request);
    }
    return new Response("Not found", { status: 404 });
  }

  async alarm(): Promise<void> {
    await this.trimStorage();
    await this.state.storage.setAlarm(Date.now() + CLOUDFLARE_REALTIME_LIFECYCLE.alarmSweepIntervalMs);
  }

  private async handlePublish(request: Request): Promise<Response> {
    const body = (await request.json()) as { type: string; data: unknown; channel: string; room: string };
    const message = await this.appendEvent(body.channel, body.room, body.type, body.data);
    this.broadcast(message);
    return Response.json({ ok: true, id: message.id });
  }

  private handleSubscribe(request: Request): Response {
    const channel = request.headers.get("x-otok-channel") ?? "";
    const room = request.headers.get("x-otok-room") ?? "";
    const lastEventId = request.headers.get("last-event-id")?.trim() || undefined;
    const encoder = new TextEncoder();
    let heartbeat: ReturnType<typeof setInterval> | undefined;
    const subscriberId = crypto.randomUUID();

    const stream = new ReadableStream<Uint8Array>({
      start: async (controller) => {
        const write = (chunk: string): boolean => {
          const sub = this.subscribers.get(subscriberId);
          if (!sub || sub.closed) return false;
          if (sub.pending >= CLOUDFLARE_REALTIME_LIFECYCLE.maxPendingEventsPerConnection) {
            controller.enqueue(encoder.encode(formatSseEvent({ code: "BACKPRESSURE", message: "Slow client" })));
            sub.closed = true;
            controller.close();
            this.subscribers.delete(subscriberId);
            return false;
          }
          sub.pending += 1;
          controller.enqueue(encoder.encode(chunk));
          sub.pending -= 1;
          return true;
        };

        this.subscribers.set(subscriberId, { id: subscriberId, pending: 0, write, closed: false });
        write(formatSseComment("connected"));

        await this.emitReplay(channel, room, lastEventId, write);

        heartbeat = setInterval(() => {
          if (!write(formatSseComment("ping"))) {
            if (heartbeat) clearInterval(heartbeat);
          }
        }, CLOUDFLARE_REALTIME_LIFECYCLE.heartbeatIntervalMs);
      },
      cancel: () => {
        if (heartbeat) clearInterval(heartbeat);
        const sub = this.subscribers.get(subscriberId);
        if (sub) sub.closed = true;
        this.subscribers.delete(subscriberId);
      },
    });

    request.signal?.addEventListener("abort", () => {
      if (heartbeat) clearInterval(heartbeat);
      this.subscribers.delete(subscriberId);
    });

    void this.state.storage.setAlarm(Date.now() + CLOUDFLARE_REALTIME_LIFECYCLE.alarmSweepIntervalMs);

    return new Response(stream, {
      headers: {
        "content-type": "text/event-stream; charset=utf-8",
        "cache-control": "no-cache, no-transform",
        connection: "keep-alive",
      },
    });
  }

  private async emitReplay(
    channel: string,
    room: string,
    lastEventId: string | undefined,
    write: (chunk: string) => boolean,
  ): Promise<void> {
    const events = (await this.state.storage.get<CloudflareRealtimeMessage[]>(EVENTS_KEY)) ?? [];
    if (!lastEventId) {
      return;
    }

    const lastNum = Number.parseInt(lastEventId, 10);
    if (!Number.isFinite(lastNum)) {
      write(formatGapEvent("UNKNOWN_EVENT_ID"));
      return;
    }

    const minSeq = (await this.state.storage.get<number>(MIN_SEQ_KEY)) ?? 1;
    const meta = await this.getMeta(channel, room);
    if (lastNum > meta.seq) {
      write(formatGapEvent("UNKNOWN_EVENT_ID"));
      return;
    }
    if (lastNum < minSeq) {
      write(formatGapEvent("EVENT_EXPIRED"));
      for (const event of events) write(formatSseEvent(event));
      return;
    }

    const replay = events.filter((e) => Number.parseInt(e.id, 10) > lastNum);
    if (replay.length === 0 && events.length > 0 && !events.some((e) => e.id === lastEventId)) {
      write(formatGapEvent("UNKNOWN_EVENT_ID"));
    }
    for (const event of replay) write(formatSseEvent(event));
  }

  private async appendEvent(
    channel: string,
    room: string,
    type: string,
    data: unknown,
  ): Promise<CloudflareRealtimeMessage> {
    const meta = await this.getMeta(channel, room);
    const nextSeq = meta.seq + 1;
    const message: CloudflareRealtimeMessage = {
      id: String(nextSeq),
      type,
      channel,
      room,
      data,
      timestamp: new Date().toISOString(),
    };

    const events = (await this.state.storage.get<CloudflareRealtimeMessage[]>(EVENTS_KEY)) ?? [];
    events.push(message);
    await this.state.storage.put(META_KEY, { seq: nextSeq, channel, room });
    await this.state.storage.put(EVENTS_KEY, events);
    await this.trimStorage();
    return message;
  }

  private async getMeta(channel: string, room: string): Promise<StoredMeta> {
    const existing = await this.state.storage.get<StoredMeta>(META_KEY);
    if (existing) return existing;
    const initial: StoredMeta = { seq: 0, channel, room };
    await this.state.storage.put(META_KEY, initial);
    return initial;
  }

  private async trimStorage(): Promise<void> {
    let events = (await this.state.storage.get<CloudflareRealtimeMessage[]>(EVENTS_KEY)) ?? [];
    const cutoff = Date.now() - CLOUDFLARE_REALTIME_RETENTION.maxAgeMs;
    events = events.filter((e) => new Date(e.timestamp).getTime() >= cutoff);
    while (events.length > CLOUDFLARE_REALTIME_RETENTION.maxEventsPerRoom) {
      events.shift();
    }
    const minSeq = events.length > 0 ? Number.parseInt(events[0]!.id, 10) : 1;
    await this.state.storage.put(EVENTS_KEY, events);
    await this.state.storage.put(MIN_SEQ_KEY, minSeq);
  }

  private broadcast(message: CloudflareRealtimeMessage): void {
    const frame = formatSseEvent(message);
    for (const [id, sub] of this.subscribers) {
      if (sub.closed) {
        this.subscribers.delete(id);
        continue;
      }
      if (!sub.write(frame)) {
        this.subscribers.delete(id);
      }
    }
  }
}
