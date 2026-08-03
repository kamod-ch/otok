import { describe, expect, it } from "vitest";
import { resolveAuthToken } from "./auth.js";
import { Hono } from "hono";

describe("auth", () => {
  it("rejects tokens in query parameters", async () => {
    const app = new Hono();
    app.get("/test", async (c) => {
      try {
        await resolveAuthToken(c);
        return c.text("ok");
      } catch (error) {
        return c.json((error as Error).message, 400);
      }
    });

    const res = await app.request("/test?token=secret");
    expect(res.status).toBe(400);
    const body = await res.text();
    expect(body).toContain("query parameters");
  });

  it("accepts bearer token in Authorization header", async () => {
    const app = new Hono();
    app.get("/test", async (c) => {
      const auth = await resolveAuthToken(c);
      return c.json(auth);
    });

    const res = await app.request("/test", {
      headers: { authorization: "Bearer user:alice" },
    });
    const body = (await res.json()) as { user: { id: string } | null; source: string };
    expect(body.user?.id).toBe("alice");
    expect(body.source).toBe("bearer");
  });
});
