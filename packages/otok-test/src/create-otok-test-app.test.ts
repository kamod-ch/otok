import { describe, expect, it } from "vitest";
import { h } from "preact";
import { redirect, validationError } from "otok/server";
import hello from "@otok/plugin-hello";
import {
  authenticatedSession,
  createOtokTestApp,
  createTestRoute,
  expectIsland,
  expectRedirect,
  expectValidationDocument,
  expectValidationError,
} from "./index.js";

describe("createOtokTestApp", () => {
  it("exposes get/post helpers without opening a port", async () => {
    const app = await createOtokTestApp({
      routes: [
        {
          path: "/dashboard",
          component: ({ data }: { data?: { message?: string } }) => h("p", null, data?.message ?? "Dashboard"),
          loader: () => ({ message: "Welcome" }),
        },
      ],
    });

    const response = await app.get("/dashboard", { session: authenticatedSession });
    expect(response.status).toBe(200);
    expect(await response.text()).toContain("Welcome");
    await app.cleanup();
  });

  it("asserts redirects and validation failures", async () => {
    const app = await createOtokTestApp({
      routes: [
        createTestRoute({
          path: "/signup",
          action: () => validationError({ fieldErrors: { email: "Invalid email" }, values: { email: "bad" } }),
          module: {
            default: ({ actionData }: { actionData?: { fieldErrors?: Record<string, string[]> } }) =>
              h("form", null, [
                h("input", { name: "email", "aria-invalid": "true", value: "bad" }),
                h("p", { role: "alert" }, actionData?.fieldErrors?.email?.[0] ?? ""),
              ]),
          },
        }),
        createTestRoute({
          path: "/login",
          loader: () => redirect("/dashboard", 303),
        }),
      ],
    });

    const redirectResponse = await app.get("/login", { redirect: "manual" });
    expectRedirect(redirectResponse.response, { location: "/dashboard", status: 303 });

    const invalid = await app.render("/signup", {
      method: "POST",
      body: new URLSearchParams({ email: "bad" }),
    });
    expectValidationError(invalid.response, invalid.html, { fieldErrors: { email: "Invalid email" } });
    expectValidationDocument(invalid.document, { fieldErrors: { email: "Invalid email" } });
    await app.cleanup();
  });

  it("resolves plugins into the test app", async () => {
    const app = await createOtokTestApp({
      routes: [{ path: "/" }],
      plugins: [hello()],
    });

    const response = await app.get("/api/plugin/hello");
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ ok: true });
    await app.cleanup();
  });

  it("detects island markers in SSR HTML", async () => {
    const app = await createOtokTestApp({
      routes: [
        {
          path: "/",
          module: {
            default: () =>
              h("div", { "data-otok-island": "Counter", "data-otok-strategy": "idle", "data-otok-props": "e30" }),
          },
        },
      ],
    });

    const rendered = await app.render("/");
    expectIsland(rendered.document, "Counter", { strategy: "idle" });
    await app.cleanup();
  });
});
