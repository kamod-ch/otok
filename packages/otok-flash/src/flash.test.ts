import { describe, expect, it } from "vitest";
import { h } from "preact";
import type { Context } from "hono";
import { createTestApp, renderRoute } from "@otok/test";
import type { OtokPageProps } from "otok/server";
import { isOtokHttpError } from "otok/server";
import {
  consumeFlash,
  flashRedirect,
  flashSuccess,
  setFlash,
} from "./flash.js";
import { createFlashMiddleware } from "./middleware.js";
import { seal, unseal } from "./sign.js";

const config = {
  secret: "test-secret",
  cookieName: "flash_test",
  secure: false,
};

describe("sign", () => {
  it("seals and unseals payloads", () => {
    const token = seal('{"message":"saved"}', config.secret);
    expect(unseal(token, config.secret)).toBe('{"message":"saved"}');
    expect(unseal(`${token}x`, config.secret)).toBeNull();
  });
});

describe("flash cookies", () => {
  it("sets and consumes a signed flash cookie once", async () => {
    const app = new (await import("hono")).Hono();
    app.get("/set", (c) => {
      setFlash(c, flashSuccess("Gespeichert"), config);
      return c.text("set");
    });
    app.get("/read", (c) => {
      const flash = consumeFlash(c, config);
      return c.json(flash ?? null);
    });

    const setResponse = await app.request("/set");
    const cookie = setResponse.headers.get("set-cookie") ?? "";
    const token = cookie.match(/flash_test=([^;]+)/)?.[1];
    expect(token).toBeTruthy();

    const readResponse = await app.request("/read", {
      headers: { cookie: `flash_test=${token}` },
    });
    expect(await readResponse.json()).toEqual({ message: "Gespeichert", type: "success" });

    const againResponse = await app.request("/read");
    expect(await againResponse.json()).toBeNull();
  });

  it("redirects with flash via flashRedirect", async () => {
    const { Hono } = await import("hono");
    const app = new Hono();
    app.get("/", (c) => {
      try {
        flashRedirect("/done", "Abgemeldet", c, config);
      } catch (error) {
        if (isOtokHttpError(error)) {
          return c.redirect(error.headers.get("location") ?? "/done", 303);
        }
        throw error;
      }
    });

    const response = await app.request("/", { redirect: "manual" });
    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe("/done");
    expect(response.headers.get("set-cookie")).toContain("flash_test=");
  });
});

describe("createFlashMiddleware", () => {
  it("stores consumed flash on the Hono context", async () => {
    const token = seal(
      JSON.stringify({ message: "Willkommen", type: "info", iat: Date.now() }),
      config.secret,
    );

    const { html } = await renderRoute(
      createTestApp({
        routes: [
          {
            path: "/",
            component: (({ data }: OtokPageProps<{ message: string }>) =>
              h("p", null, data.message)) as (props: OtokPageProps) => ReturnType<typeof h>,
            loader: ({ hono }) => ({
              message:
                ((hono as Context).get("flash") as { message: string } | undefined)?.message ??
                "none",
            }),
            middleware: [
              {
                default: createFlashMiddleware({
                  ...config,
                }),
              },
            ],
          },
        ],
      }),
      "/",
      {
        headers: { cookie: `${config.cookieName}=${token}` },
      },
    );

    expect(html).toContain("Willkommen");
  });
});
