import { Hono } from "hono";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createOtokHandler, setOtokCacheScope } from "./index.js";
import { clearIdempotencyStore, setIdempotencyStore } from "./idempotency.js";
import { MemoryIdempotencyStore } from "./idempotency/memory-store.js";
import type { OtokRoute } from "../shared/routes.js";
import { OTOK_IDEMPOTENCY_HEADER } from "../shared/mutations.js";

const Page = () => <p>OK</p>;

function route(path: string, pattern: RegExp, module: OtokRoute["module"]): OtokRoute {
  return { id: `id:${path}`, path, pattern, params: [], module };
}

const KEY = "11111111-1111-1111-1111-111111111111";

describe("action idempotency", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    setIdempotencyStore(new MemoryIdempotencyStore({ now: () => Date.now() }));
  });

  afterEach(() => {
    clearIdempotencyStore();
    vi.useRealTimers();
  });

  it("executes concurrent actions once per scope/key/payload", async () => {
    let runs = 0;
    const app = new Hono();
    app.all(
      "*",
      createOtokHandler({
        routes: [
          route("/items", /^\/items\/?$/, {
            default: Page as OtokRoute["module"]["default"],
            action: async () => {
              runs++;
              await new Promise((resolve) => setTimeout(resolve, 15));
              return new Response(null, { status: 303, headers: { location: "/done" } });
            },
          }),
        ],
      }),
    );

    const body = new URLSearchParams({ title: "A" });
    const opts = {
      method: "POST",
      headers: {
        [OTOK_IDEMPOTENCY_HEADER]: KEY,
        "content-type": "application/x-www-form-urlencoded",
      },
      body,
    } as const;

    const p1 = app.request("/items", opts);
    const p2 = app.request("/items", opts);
    await vi.advanceTimersByTimeAsync(20);
    const [r1, r2] = await Promise.all([p1, p2]);
    expect(r1.status).toBe(303);
    expect(r2.status).toBe(303);
    expect(runs).toBe(1);
  });

  it("does not reuse responses across routes for the same client key", async () => {
    let aRuns = 0;
    let bRuns = 0;
    const app = new Hono();
    app.all(
      "*",
      createOtokHandler({
        routes: [
          route("/a", /^\/a\/?$/, {
            default: Page as OtokRoute["module"]["default"],
            action: async () => {
              aRuns++;
              return new Response("a", { status: 200 });
            },
          }),
          route("/b", /^\/b\/?$/, {
            default: Page as OtokRoute["module"]["default"],
            action: async () => {
              bRuns++;
              return new Response("b", { status: 200 });
            },
          }),
        ],
      }),
    );

    const opts = {
      method: "POST",
      headers: { [OTOK_IDEMPOTENCY_HEADER]: KEY },
    } as const;
    await app.request("/a", opts);
    await app.request("/b", opts);
    expect(aRuns).toBe(1);
    expect(bRuns).toBe(1);
  });

  it("isolates users via verified scope", async () => {
    let runs = 0;
    const app = new Hono();
    app.all(
      "*",
      createOtokHandler({
        routes: [
          {
            ...route("/profile", /^\/profile\/?$/, {
              default: Page as OtokRoute["module"]["default"],
              action: async ({ hono }) => {
                runs++;
                const user = hono.get("user" as never) as { id: string };
                return new Response(user.id, { status: 200 });
              },
            }),
            middleware: [
              {
                default: async (c, next) => {
                  c.set("user" as never, { id: c.req.header("x-user") ?? "0" });
                  await next();
                },
              },
            ],
          },
        ],
      }),
    );

    const opts = { method: "POST", headers: { [OTOK_IDEMPOTENCY_HEADER]: KEY } } as const;
    const u1 = await app.request("/profile", { ...opts, headers: { ...opts.headers, "x-user": "1" } });
    const u2 = await app.request("/profile", { ...opts, headers: { ...opts.headers, "x-user": "2" } });
    expect(await u1.text()).toBe("1");
    expect(await u2.text()).toBe("2");
    expect(runs).toBe(2);
  });

  it("returns 409 when payload differs for the same key", async () => {
    const app = new Hono();
    app.all(
      "*",
      createOtokHandler({
        routes: [
          route("/save", /^\/save\/?$/, {
            default: Page as OtokRoute["module"]["default"],
            action: async () => new Response("ok", { status: 200 }),
          }),
        ],
      }),
    );

    const headers = {
      [OTOK_IDEMPOTENCY_HEADER]: KEY,
      "content-type": "application/x-www-form-urlencoded",
    };
    await app.request("/save", { method: "POST", headers, body: new URLSearchParams({ v: "1" }) });
    const conflict = await app.request("/save", { method: "POST", headers, body: new URLSearchParams({ v: "2" }) });
    expect(conflict.status).toBe(409);
  });

  it("replays stored success responses", async () => {
    let runs = 0;
    const app = new Hono();
    app.all(
      "*",
      createOtokHandler({
        routes: [
          route("/once", /^\/once\/?$/, {
            default: Page as OtokRoute["module"]["default"],
            action: async () => {
              runs++;
              return new Response("stored", { status: 200 });
            },
          }),
        ],
      }),
    );

    const opts = { method: "POST", headers: { [OTOK_IDEMPOTENCY_HEADER]: KEY } } as const;
    await app.request("/once", opts);
    const replay = await app.request("/once", opts);
    expect(replay.headers.get("x-otok-idempotency")).toBe("replay");
    expect(await replay.text()).toBe("stored");
    expect(runs).toBe(1);
  });

  it("does not store Set-Cookie action responses for replay", async () => {
    let runs = 0;
    const app = new Hono();
    app.all(
      "*",
      createOtokHandler({
        routes: [
          route("/login", /^\/login\/?$/, {
            default: Page as OtokRoute["module"]["default"],
            action: async () => {
              runs++;
              return new Response("ok", {
                status: 200,
                headers: { "set-cookie": "sid=abc; Path=/" },
              });
            },
          }),
        ],
      }),
    );

    const opts = { method: "POST", headers: { [OTOK_IDEMPOTENCY_HEADER]: KEY } } as const;
    await app.request("/login", opts);
    await app.request("/login", opts);
    expect(runs).toBe(2);
  });

  it("scopes tenants via setOtokCacheScope", async () => {
    let runs = 0;
    const app = new Hono();
    app.all(
      "*",
      createOtokHandler({
        routes: [
          {
            ...route("/t", /^\/t\/?$/, {
              default: Page as OtokRoute["module"]["default"],
              action: async ({ hono }) => {
                runs++;
                const scope = hono.get("tenant" as never) as { id: string };
                return new Response(scope.id, { status: 200 });
              },
            }),
            middleware: [
              {
                default: async (c, next) => {
                  const tenant = c.req.header("x-tenant") ?? "default";
                  setOtokCacheScope(c, { tenantId: tenant });
                  c.set("tenant" as never, { id: tenant });
                  await next();
                },
              },
            ],
          },
        ],
      }),
    );

    const opts = { method: "POST", headers: { [OTOK_IDEMPOTENCY_HEADER]: KEY } } as const;
    await app.request("/t", { ...opts, headers: { ...opts.headers, "x-tenant": "acme" } });
    await app.request("/t", { ...opts, headers: { ...opts.headers, "x-tenant": "beta" } });
    expect(runs).toBe(2);
  });
});
