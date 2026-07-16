import { describe, expect, it } from "vitest";
import { h } from "preact";
import { fail, redirect, type OtokPageProps } from "otok/server";
import { createTestApp, createTestRoute, parseHtml, renderParsedRoute, renderRoute, requestRoute } from "./index.js";

const Page = ({ data, params, actionData }: OtokPageProps<any>) =>
  h(
    "main",
    null,
    h("p", null, `Data: ${(data as { message?: string } | undefined)?.message ?? "none"}`),
    h("p", null, `User: ${params.id ?? "none"}`),
    h("p", null, `Action: ${(actionData as { message?: string } | undefined)?.message ?? "none"}`),
  );

const ErrorPage = ({ data }: OtokPageProps<any>) => h("p", null, `Error: ${(data as { message?: string }).message}`);
const NotFoundPage = () => h("p", null, "Custom not found");

describe("@otok/test", () => {
  it("renders GET requests with loader data and params", async () => {
    const app = createTestApp({
      routes: [
        {
          path: "/users/:id",
          component: Page,
          loader: ({ params }) => ({ message: `Loaded ${params.id}` }),
        },
      ],
    });

    const { response, html } = await renderRoute(app, "/users/123");

    expect(response.status).toBe(200);
    expect(html).toContain("Loaded 123");
    expect(html).toContain("User: 123");
  });

  it("submits form POST requests to actions", async () => {
    const app = createTestApp({
      routes: [
        {
          path: "/projects",
          component: Page,
          action: async ({ formData }) => ({ message: `Saved ${formData?.get("name")}` }),
        },
      ],
    });

    const { response, html } = await renderRoute(app, "/projects", {
      method: "POST",
      body: new URLSearchParams({ name: "Otok" }),
    });

    expect(response.status).toBe(200);
    expect(html).toContain("Action: Saved Otok");
  });

  it("passes headers and cookies through Hono requests", async () => {
    const response = await requestRoute(
      {
        routes: [
          {
            path: "/headers",
            component: Page,
            loader: ({ request }) => ({
              message: `${request.headers.get("x-test")}:${request.headers.get("cookie")}`,
            }),
          },
        ],
      },
      "/headers",
      { headers: { "x-test": "yes", cookie: "session=abc" } },
    );

    expect(await response.text()).toContain("yes:session=abc");
  });

  it("supports redirects from loaders", async () => {
    const app = createTestApp({
      routes: [
        {
          path: "/old",
          component: Page,
          loader: () => redirect("/new", 303),
        },
      ],
    });

    const response = await requestRoute(app, "/old", { redirect: "manual" });

    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe("/new");
  });

  it("runs route middleware and shares context with loaders", async () => {
    const app = createTestApp({
      routes: [
        {
          path: "/admin",
          component: Page,
          loader: ({ hono }) => ({ message: String((hono as any).get("user")) }),
          middleware: [
            {
              default: async (c, next) => {
                c.set("user", "Ada");
                await next();
              },
            },
          ],
        },
      ],
    });

    const { html } = await renderRoute(app, "/admin");

    expect(html).toContain("Data: Ada");
  });

  it("renders not-found and error routes", async () => {
    const app = createTestApp({
      routes: [
        {
          path: "/boom",
          component: Page,
          loader: () => fail(400, { message: "Expected failure" }),
        },
      ],
      notFoundRoute: { path: "/", component: NotFoundPage },
      errorRoute: { path: "/", component: ErrorPage },
    });

    const missing = await renderRoute(app, "/missing");
    expect(missing.response.status).toBe(404);
    expect(missing.html).toContain("Custom not found");

    const failed = await renderRoute(app, "/boom");
    expect(failed.response.status).toBe(400);
    expect(failed.html).toContain("Error: Expected failure");
  });

  it("creates explicit test route manifests without starting Vite", () => {
    const route = createTestRoute({ path: "/docs/:slug*", component: Page });

    expect(route.path).toBe("/docs/:slug*");
    expect(route.params).toEqual(["slug"]);
    expect(route.pattern.test("/docs/a/b")).toBe(true);
  });

  it("parses SSR HTML with selectors, meta, and title helpers", async () => {
    const app = createTestApp({
      routes: [
        {
          path: "/",
          module: {
            default: () =>
              h(
                "main",
                null,
                h("h1", { id: "title", class: "hero" }, "Hello"),
                h("input", { name: "email", "aria-invalid": "true", value: "bad" }),
                h("p", { role: "alert" }, "Required"),
              ),
            head: () => ({
              title: "Parsed Page",
              description: "SSR assertion helper",
              meta: { robots: "noindex" },
            }),
          },
        },
      ],
    });

    const { document, response } = await renderParsedRoute(app, "/");

    expect(response.status).toBe(200);
    expect(document.getTitle()).toBe("Parsed Page");
    expect(document.getMeta("description")).toBe("SSR assertion helper");
    expect(document.getMeta("robots")).toBe("noindex");
    expect(document.querySelector("#title")?.textContent).toBe("Hello");
    expect(document.getAttribute("input[name=email]", "aria-invalid")).toBe("true");
    expect(document.getText("p[role=alert]")).toBe("Required");
    expect(document.contains("Hello")).toBe(true);
  });
});

describe("parseHtml", () => {
  it("supports tag, id, class, and attribute selectors", () => {
    const document = parseHtml(
      `<div class="wrap"><p id="msg" class="alert error" data-ok="1">Hi &amp; bye</p><input name="q" /></div>`,
    );

    expect(document.querySelector("p#msg.alert")?.textContent).toBe("Hi & bye");
    expect(document.querySelector("[data-ok]")?.getAttribute("data-ok")).toBe("1");
    expect(document.querySelectorAll("input[name=q]")).toHaveLength(1);
    expect(document.getText(".error")).toBe("Hi & bye");
  });

  it("rejects unsupported selectors", () => {
    expect(() => parseHtml("<p/>").querySelector("div > p")).toThrow(/unsupported selector/);
  });
});
