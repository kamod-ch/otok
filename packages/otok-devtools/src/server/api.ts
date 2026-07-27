import type { Hono } from "hono";
import { getOtokDevtoolsBridge } from "otok/devtools";

export function registerDevtoolsApiRoutes(app: Hono, endpoint = "/__otok_devtools"): void {
  app.get(endpoint, (c) => {
    const bridge = getOtokDevtoolsBridge();
    if (!bridge) {
      return c.json({ enabled: false, snapshot: null }, 404);
    }
    return c.json({
      enabled: true,
      snapshot: sanitizeSnapshot(bridge.getSnapshot()),
    });
  });
}

function sanitizeSnapshot(snapshot: ReturnType<NonNullable<ReturnType<typeof getOtokDevtoolsBridge>>["getSnapshot"]>) {
  return {
    ...snapshot,
    requests: snapshot.requests.map((request) => ({
      ...request,
      auth: request.auth
        ? {
            authenticated: request.auth.authenticated,
            userId: request.auth.userId,
            roles: request.auth.roles,
          }
        : undefined,
    })),
  };
}
