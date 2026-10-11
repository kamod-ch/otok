import { Hono } from "hono";
import { decodeRouteSegments, objectName, routeSegments } from "./encode.js";
import { internalHeaders } from "./internal-auth.js";

export interface RealtimeRoomNamespace {
  idFromName(name: string): DurableObjectId;
  get(id: DurableObjectId): DurableObjectStub;
}

export interface CloudflareRealtimeWorkerEnv {
  REALTIME_ROOM: RealtimeRoomNamespace;
  REALTIME_INTERNAL_SECRET: string;
  REALTIME_PUBLISH_SECRET?: string;
}

export interface SubscribeAuthContext {
  userId: string;
  channel: string;
  room: string;
  request: Request;
}

export interface PublishAuthContext {
  userId?: string;
  channel: string;
  room: string;
  request: Request;
}

export interface CloudflareRealtimeWorkerOptions {
  authorizeSubscribe: (ctx: SubscribeAuthContext) => boolean | Promise<boolean>;
  authorizePublish: (ctx: PublishAuthContext) => boolean | Promise<boolean>;
  resolveUserId?: (c: { req: { header: (n: string) => string | undefined } }) => string | null | Promise<string | null>;
}

function rejectQueryTokens(url: URL): Response | null {
  const forbidden = ["token", "access_token", "auth", "jwt", "bearer"];
  for (const param of forbidden) {
    if (url.searchParams.has(param)) {
      return new Response(JSON.stringify({ code: "INVALID_TOKEN", message: "No query tokens" }), {
        status: 400,
        headers: { "content-type": "application/json" },
      });
    }
  }
  return null;
}

export function createCloudflareRealtimeApp(
  env: CloudflareRealtimeWorkerEnv,
  options: CloudflareRealtimeWorkerOptions,
): Hono {
  const app = new Hono();

  app.get("/realtime/sse/:channelB64/:roomB64", async (c) => {
    const blocked = rejectQueryTokens(new URL(c.req.url));
    if (blocked) return blocked;

    let channel: string;
    let room: string;
    try {
      ({ channel, room } = decodeRouteSegments(c.req.param("channelB64"), c.req.param("roomB64")));
    } catch {
      return c.text("Invalid room encoding", 400);
    }

    const authHeader = c.req.header("authorization");
    const bearerUser = authHeader?.startsWith("Bearer user:") ? authHeader.slice("Bearer user:".length) : null;
    const userId = (await options.resolveUserId?.(c)) ?? bearerUser;
    if (!userId) return c.json({ code: "UNAUTHORIZED", message: "Authentication required" }, 401);

    const allowed = await options.authorizeSubscribe({ userId, channel, room, request: c.req.raw });
    if (!allowed) return c.json({ code: "FORBIDDEN", message: "Not authorized" }, 403);

    const stub = env.REALTIME_ROOM.get(env.REALTIME_ROOM.idFromName(objectName(channel, room)));
    const headers = new Headers(internalHeaders(env.REALTIME_INTERNAL_SECRET));
    headers.set("x-otok-channel", channel);
    headers.set("x-otok-room", room);
    const last = c.req.header("last-event-id");
    if (last) headers.set("last-event-id", last);

    return stub.fetch(
      new Request("https://do/internal/subscribe", { method: "GET", headers, signal: c.req.raw.signal }),
    );
  });

  app.post("/realtime/publish/:channelB64/:roomB64", async (c) => {
    const blocked = rejectQueryTokens(new URL(c.req.url));
    if (blocked) return blocked;

    let channel: string;
    let room: string;
    try {
      ({ channel, room } = decodeRouteSegments(c.req.param("channelB64"), c.req.param("roomB64")));
    } catch {
      return c.text("Invalid room encoding", 400);
    }

    const publishHeader = c.req.header("x-realtime-publish-secret");
    const userId = await options.resolveUserId?.(c);
    const trusted = (env.REALTIME_PUBLISH_SECRET && publishHeader === env.REALTIME_PUBLISH_SECRET) || Boolean(userId);
    if (!trusted) return c.json({ code: "UNAUTHORIZED", message: "Publish not authorized" }, 401);

    const allowed = await options.authorizePublish({ userId: userId ?? undefined, channel, room, request: c.req.raw });
    if (!allowed) return c.json({ code: "FORBIDDEN", message: "Publish forbidden" }, 403);

    const body = await c.req.json<{ type: string; data: unknown }>();
    const stub = env.REALTIME_ROOM.get(env.REALTIME_ROOM.idFromName(objectName(channel, room)));
    const res = await stub.fetch(
      new Request("https://do/internal/publish", {
        method: "POST",
        headers: {
          ...internalHeaders(env.REALTIME_INTERNAL_SECRET),
          "content-type": "application/json",
        },
        body: JSON.stringify({ channel, room, type: body.type, data: body.data }),
      }),
    );
    return new Response(res.body, { status: 202, headers: res.headers });
  });

  return app;
}

export { routeSegments, objectName, decodeRouteSegments };
