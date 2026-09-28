import type { Hono } from "hono";
import type { SubscriptionStorePort } from "./types.js";

export interface DiscussionNotificationRoutesOptions {
  pathPrefix: string;
  subscriptions: SubscriptionStorePort;
  resolveTenantUser: (c: import("hono").Context) => Promise<{ tenantId: string; userId: string } | null>;
}

function parseBool(value: unknown): boolean | undefined {
  if (value === "1" || value === "true" || value === true) return true;
  if (value === "0" || value === "false" || value === false) return false;
  return undefined;
}

/** Explicit opt-in/out only — no digest or marketing flags. */
export function registerDiscussionNotificationRoutes(app: Hono, options: DiscussionNotificationRoutesOptions): void {
  const prefix = options.pathPrefix.replace(/\/$/, "");

  app.post(`${prefix}/preferences`, async (c) => {
    const scope = await options.resolveTenantUser(c);
    if (!scope) return c.json({ error: "unauthorized" }, 401);

    const body = await c.req.parseBody();
    const replyOptIn = parseBool(body.replyOptIn);
    const mentionOptIn = parseBool(body.mentionOptIn);
    if (replyOptIn === undefined && mentionOptIn === undefined) {
      return c.json({ error: "no_preference_fields" }, 400);
    }

    const prefs = await options.subscriptions.setPreferences({
      tenantId: scope.tenantId,
      userId: scope.userId,
      replyOptIn,
      mentionOptIn,
    });
    return c.json({
      replyOptIn: prefs.replyOptIn,
      mentionOptIn: prefs.mentionOptIn,
      updatedAt: prefs.updatedAt,
    });
  });

  app.get(`${prefix}/preferences`, async (c) => {
    const scope = await options.resolveTenantUser(c);
    if (!scope) return c.json({ error: "unauthorized" }, 401);
    const prefs = await options.subscriptions.getPreferences(scope.tenantId, scope.userId);
    return c.json({
      replyOptIn: prefs.replyOptIn,
      mentionOptIn: prefs.mentionOptIn,
      updatedAt: prefs.updatedAt,
    });
  });
}
