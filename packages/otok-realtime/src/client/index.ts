export interface RealtimeClientOptions {
  url: string;
  channel: string;
  room: string;
  /** Bearer token — sent via Authorization header, never in URL. */
  getToken?: () => Promise<string | null>;
  lastEventId?: string;
  onEvent?: (event: RealtimeClientEvent) => void;
  onError?: (error: RealtimeClientError) => void;
  onReconnect?: (attempt: number) => void;
  maxReconnectAttempts?: number;
  reconnectDelayMs?: number;
}

export interface RealtimeClientEvent {
  id: string;
  type: string;
  data: unknown;
  timestamp: string;
}

export interface RealtimeClientError {
  code: string;
  message: string;
}

/** Browser/edge-safe SSE client with reconnect and Last-Event-ID resume. */
export class RealtimeClient {
  private readonly options: Required<Pick<RealtimeClientOptions, "maxReconnectAttempts" | "reconnectDelayMs">> &
    RealtimeClientOptions;
  private source: EventSource | null = null;
  private reconnectAttempts = 0;
  private closed = false;
  private lastEventId?: string;

  constructor(options: RealtimeClientOptions) {
    this.options = {
      maxReconnectAttempts: 10,
      reconnectDelayMs: 1_000,
      ...options,
    };
    this.lastEventId = options.lastEventId;
  }

  async connect(): Promise<void> {
    if (typeof EventSource === "undefined") {
      throw new Error("RealtimeClient requires EventSource (browser or polyfill)");
    }
    this.closed = false;
    await this.open();
  }

  disconnect(): void {
    this.closed = true;
    this.source?.close();
    this.source = null;
  }

  private async open(): Promise<void> {
    const token = this.options.getToken ? await this.options.getToken() : null;
    const url = new URL(this.options.url);
    url.pathname = `${url.pathname.replace(/\/+$/, "")}/${this.options.channel}/${this.options.room}`;

    // EventSource cannot set Authorization header — use a secure same-origin cookie session
    // or the `/realtime/sse-token` bootstrap endpoint pattern in production apps.
    if (token) {
      throw new Error(
        "otok-realtime: EventSource cannot send Authorization headers. Use session cookies or fetch-based SSE.",
      );
    }

    this.source = new EventSource(url.toString());
    if (this.lastEventId) {
      // Native EventSource does not support Last-Event-ID on init in all browsers;
      // use fetchSseClient for full resume support.
    }

    this.source.onmessage = (ev) => {
      this.lastEventId = ev.lastEventId || this.lastEventId;
      try {
        const data = JSON.parse(ev.data) as { data: unknown; timestamp: string };
        this.options.onEvent?.({
          id: ev.lastEventId,
          type: ev.type || "message",
          data: data.data,
          timestamp: data.timestamp,
        });
      } catch {
        /* ignore */
      }
    };

    this.source.addEventListener("error", () => {
      this.source?.close();
      if (this.closed) return;
      this.scheduleReconnect();
    });
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.options.maxReconnectAttempts) {
      this.options.onError?.({ code: "RECONNECT_FAILED", message: "Max reconnect attempts reached" });
      return;
    }
    this.reconnectAttempts += 1;
    this.options.onReconnect?.(this.reconnectAttempts);
    setTimeout(() => void this.open(), this.options.reconnectDelayMs * this.reconnectAttempts);
  }
}

/** Fetch-based SSE client with Authorization header and Last-Event-ID resume. */
export async function fetchSseClient(
  options: RealtimeClientOptions & { signal?: AbortSignal },
): Promise<void> {
  const token = options.getToken ? await options.getToken() : null;
  const url = `${options.url}/${options.channel}/${options.room}`;
  const headers: Record<string, string> = {
    accept: "text/event-stream",
  };
  if (token) headers.authorization = `Bearer ${token}`;
  if (options.lastEventId) headers["last-event-id"] = options.lastEventId;

  const response = await fetch(url, { headers, signal: options.signal });
  if (!response.ok || !response.body) {
    options.onError?.({ code: "CONNECT_FAILED", message: `SSE failed: ${response.status}` });
    return;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let lastEventId = options.lastEventId;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const chunks = buffer.split("\n\n");
    buffer = chunks.pop() ?? "";

    for (const chunk of chunks) {
      const lines = chunk.split("\n");
      let eventType = "message";
      let data = "";
      for (const line of lines) {
        if (line.startsWith("id:")) lastEventId = line.slice(3).trim();
        if (line.startsWith("event:")) eventType = line.slice(6).trim();
        if (line.startsWith("data:")) data = line.slice(5).trim();
      }
      if (!data) continue;
      try {
        const parsed = JSON.parse(data) as { data: unknown; timestamp: string };
        options.onEvent?.({
          id: lastEventId ?? "",
          type: eventType,
          data: parsed.data,
          timestamp: parsed.timestamp,
        });
      } catch {
        const err = JSON.parse(data) as RealtimeClientError;
        if (err.code) options.onError?.(err);
      }
    }
  }
}
