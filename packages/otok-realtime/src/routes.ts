import type { Context, Hono } from "hono";
import type { ChannelDefinition, RealtimeMessage, RealtimeUser, RealtimeError } from "./types.js";
import type { RealtimeHub } from "./hub.js";
import { RealtimeException, isRealtimeError } from "./errors.js";
import { resolveAuthToken, type BearerTokenVerifier, redactTokens } from "./auth.js";
import { createSseStream, formatSseEvent, parseLastEventId, sseResponse } from "./transport/sse.js";
import { decodeWsFrame, encodeWsFrame, type WebSocketLike } from "./transport/websocket.js";

export interface RealtimeRoutesOptions {
  hub: RealtimeHub;
  channels: Map<string, ChannelDefinition>;
  basePath?: string;
  verifyBearerToken?: BearerTokenVerifier;
  getSession?: (c: Context) => Promise<RealtimeUser | null>;
  contextUserKey?: string;
}

export function registerRealtimeRoutes(app: Hono, options: RealtimeRoutesOptions): void {
  const base = options.basePath ?? "/realtime";

  app.get(`${base}/sse/:channel/:room`, async (c) => {
    try {
      const channelName = c.req.param("channel");
      const room = c.req.param("room");
      const channel = options.channels.get(channelName);
      if (!channel) {
        return c.json({ code: "CHANNEL_NOT_FOUND", message: "Unknown channel" }, 404);
      }

      const auth = await resolveAuthToken(c, {
        getSession: options.getSession,
        contextUserKey: options.contextUserKey,
      });
      if (!auth.user) {
        return c.json({ code: "UNAUTHORIZED", message: "Authentication required" }, 401);
      }

      const lastEventId = parseLastEventId(c.req.header("last-event-id"));
      const requestId = c.req.header("x-request-id");
      const ip = c.req.header("x-forwarded-for")?.split(",")[0]?.trim();

      let cleanup = () => {};

      const stream = createSseStream((write: (chunk: string) => void) => {
        return new Promise<void>((resolve) => {
          void options.hub
            .connect({
              user: auth.user!,
              channel,
              room,
              transport: "sse",
              ip,
              requestId,
              lastEventId,
              push: (message: RealtimeMessage | RealtimeError) => {
                write(formatSseEvent(message));
                return true;
              },
              onClose: () => resolve(),
            })
            .then((conn: { close: () => void }) => {
              cleanup = () => conn.close();
            })
            .catch((error: unknown) => {
              const err =
                error instanceof RealtimeException
                  ? error.toJSON()
                  : { code: "PROTOCOL_ERROR" as const, message: String(error) };
              write(formatSseEvent(err));
              resolve();
            });
        });
      }, { onClose: cleanup, signal: c.req.raw.signal });

      return sseResponse(stream);
    } catch (error) {
      if (error instanceof RealtimeException) {
        return c.json(error.toJSON(), error.code === "INVALID_TOKEN" ? 400 : 403);
      }
      console.error(redactTokens(String(error)));
      return c.json({ code: "PROTOCOL_ERROR", message: "Realtime connection failed" }, 500);
    }
  });

  app.get(`${base}/ws`, async (c) => {
    return c.json(
      {
        code: "PROTOCOL_ERROR",
        message: "WebSocket upgrade must be handled by the Node/Worker transport adapter",
        hint: "Use handleWebSocketUpgrade() from @kamod-ch/otok-realtime",
      },
      426,
    );
  });
}

export async function handleWebSocketConnection(
  socket: WebSocketLike,
  options: RealtimeRoutesOptions & {
    channel: string;
    room: string;
    user: RealtimeUser;
    lastEventId?: string;
    requestId?: string;
    ip?: string;
  },
): Promise<void> {
  const channel = options.channels.get(options.channel);
  if (!channel) {
    socket.send(encodeWsFrame({ code: "CHANNEL_NOT_FOUND", message: "Unknown channel" }));
    socket.close(4404, "Unknown channel");
    return;
  }

  let connection: { close: () => void } | undefined;

  try {
    connection = await options.hub.connect({
      user: options.user,
      channel,
      room: options.room,
      transport: "websocket",
      ip: options.ip,
      requestId: options.requestId,
      lastEventId: options.lastEventId,
      push: (message: RealtimeMessage | RealtimeError) => {
        socket.send(encodeWsFrame(message));
        return true;
      },
      onClose: () => socket.close(1000, "closed"),
    });
  } catch (error) {
    const err =
      error instanceof RealtimeException
        ? error.toJSON()
        : { code: "PROTOCOL_ERROR" as const, message: String(error) };
    socket.send(encodeWsFrame(err));
    socket.close(4403, err.message);
    return;
  }

  socket.addEventListener("message", (ev) => {
    const msg = decodeWsFrame(ev.data ?? "");
    if (!msg) return;
    if (msg.type === "ping") {
      socket.send(JSON.stringify({ type: "pong" }));
    }
    if (msg.type === "presence" && connection) {
      void options.hub.updatePresence(options.channel, options.room, {
        userId: options.user.id,
        status: msg.status,
        metadata: msg.metadata,
        lastSeenAt: new Date().toISOString(),
      });
    }
  });

  socket.addEventListener("close", () => {
    connection?.close();
  });
}

export function isErrorMessage(message: RealtimeMessage | { code: string }): message is { code: string } {
  return isRealtimeError(message);
}
