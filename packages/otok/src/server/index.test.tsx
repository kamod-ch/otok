import { Hono } from "hono";
import { describe, expect, it } from "vitest";
import { createOtokHandler } from "./index.js";
import type { OtokRoute } from "../shared/routes.js";
import { fail, isOtokResponse, json, notFound, redirect } from "../shared/routes.js";

const Page = () => <p>OK</p>;
const NotFound = () => <p>Custom 404</p>;
const ErrorRoute = ({ data }: { data: { message: string } }) => <p>Error: {data.message}</p>;

function route(
  path: string,
  pattern: RegExp,
  component: OtokRoute["module"]["default"] = Page as OtokRoute["module"]["default"],
): OtokRoute {
  return {
    id: path,
    path,
    pattern,
    params: [],
    module: { default: component as OtokRoute["module"]["default"] },
  };
}

describe("createOtokHandler", () => {
  it("renders convention-based not found routes", async () => {
    const app = new Hono();
    app.get(
      "*",
      createOtokHandler({
        routes: [route("/", /^\/?$/)],
        notFoundRoute: route("/", /^\/?$/, NotFound),
      }),
    );

    const response = await app.request("/missing");
    const html = await response.text();

    expect(response.status).toBe(404);
    expect(html).toContain("Custom 404");
  });

  it("renders dark mode from the theme cookie when theme is enabled", async () => {
    const app = new Hono();
    app.get("*", createOtokHandler({ routes: [route("/", /^\/?$/)], theme: true }));

    const response = await app.request("/", {
      headers: { cookie: "theme=dark" },
    });
    const html = await response.text();

    expect(response.status).toBe(200);
    expect(html).toContain('<html lang="en" class="dark">');
  });

  it("identifies native responses and Otok controlled responses", () => {
    expect(isOtokResponse(new Response("ok"))).toBe(true);
    try {
      redirect("/login");
    } catch (error) {
      expect(isOtokResponse(error)).toBe(true);
    }
    expect(isOtokResponse({ status: 200 })).toBe(false);
  });

  it("requires redirect locations and 3xx status codes", () => {
    expect(() => redirect("")).toThrow("Location");
    expect(() => redirect("/login", 200)).toThrow("3xx");
  });

  it("returns redirect responses from loaders", async () => {
    const app = new Hono();
    app.get(
      "*",
      createOtokHandler({
        routes: [
          {
            ...route("/old", /^\/old\/?$/),
            module: {
              default: Page,
              loader: () => {
                redirect("/new");
              },
            },
          },
          route("/new", /^\/new\/?$/),
        ],
      }),
    );

    const response = await app.request("/old", { redirect: "manual" });
    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe("/new");
  });

  it("returns JSON responses from loaders", async () => {
    const app = new Hono();
    app.get(
      "*",
      createOtokHandler({
        routes: [
          {
            ...route("/api-user", /^\/api-user\/?$/),
            module: {
              default: Page,
              loader: () => json({ user: "alice" }),
            },
          },
        ],
      }),
    );

    const response = await app.request("/api-user");

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("application/json; charset=utf-8");
    expect(await response.json()).toEqual({ user: "alice" });
  });

  it("passes native responses through loaders", async () => {
    const app = new Hono();
    app.get(
      "*",
      createOtokHandler({
        routes: [
          {
            ...route("/native", /^\/native\/?$/),
            module: {
              default: Page,
              loader: () => new Response("Accepted", { status: 202, headers: { "x-otok-test": "yes" } }),
            },
          },
        ],
      }),
    );

    const response = await app.request("/native");

    expect(response.status).toBe(202);
    expect(response.headers.get("x-otok-test")).toBe("yes");
    expect(await response.text()).toBe("Accepted");
  });

  it("passes route chrome to layouts", async () => {
    const Layout = ({ chrome, children }: { chrome?: { title?: string }; children: unknown }) => (
      <div>
        <h1>{chrome?.title}</h1>
        {children}
      </div>
    );

    const app = new Hono();
    app.get(
      "*",
      createOtokHandler({
        routes: [
          {
            ...route("/dashboard", /^\/dashboard\/?$/),
            module: {
              default: Page,
              chrome: () => ({ title: "Dashboard chrome" }),
            },
            layouts: [{ default: Layout as NonNullable<OtokRoute["layouts"]>[number]["default"] }],
          },
        ],
      }),
    );

    const response = await app.request("/dashboard");
    const html = await response.text();

    expect(response.status).toBe(200);
    expect(html).toContain("Dashboard chrome");
  });

  it("wraps page output in a soft-navigation page region", async () => {
    const app = new Hono();
    app.get("*", createOtokHandler({ routes: [route("/", /^\/?$/)] }));

    const response = await app.request("/");
    const html = await response.text();

    expect(response.status).toBe(200);
    expect(html).toContain("data-otok-page");
    expect(html).toContain("<p>OK</p>");
  });

  it("renders convention-based not found routes from loaders", async () => {
    const app = new Hono();
    app.get(
      "*",
      createOtokHandler({
        routes: [
          {
            ...route("/missing-loader", /^\/missing-loader\/?$/),
            module: {
              default: Page,
              loader: () => {
                notFound("Missing from loader");
              },
            },
          },
        ],
        notFoundRoute: route("/", /^\/?$/, ErrorRoute as unknown as OtokRoute["module"]["default"]),
      }),
    );

    const response = await app.request("/missing-loader");
    const html = await response.text();

    expect(response.status).toBe(404);
    expect(html).toContain("Error: Missing from loader");
  });

  it("hides unexpected error details by default", async () => {
    const app = new Hono();
    app.get(
      "*",
      createOtokHandler({
        routes: [
          {
            ...route("/boom", /^\/boom\/?$/),
            module: {
              default: Page,
              loader: () => {
                throw new Error("boom");
              },
            },
          },
        ],
        errorRoute: route("/", /^\/?$/, ErrorRoute as unknown as OtokRoute["module"]["default"]),
      }),
    );

    const response = await app.request("/boom");
    const html = await response.text();

    expect(response.status).toBe(500);
    expect(html).toContain("Error: Internal server error");
    expect(html).not.toContain("boom");
  });

  it("exposes unexpected error details when opted in", async () => {
    const app = new Hono();
    app.get(
      "*",
      createOtokHandler({
        routes: [
          {
            ...route("/boom", /^\/boom\/?$/),
            module: {
              default: Page,
              loader: () => {
                throw new Error("boom");
              },
            },
          },
        ],
        errorRoute: route("/", /^\/?$/, ErrorRoute as unknown as OtokRoute["module"]["default"]),
        exposeErrorDetails: true,
      }),
    );

    const response = await app.request("/boom");
    const html = await response.text();

    expect(response.status).toBe(500);
    expect(html).toContain("Error: boom");
  });

  it("passes validation failures to error routes", async () => {
    const app = new Hono();
    app.get(
      "*",
      createOtokHandler({
        routes: [
          {
            ...route("/validation", /^\/validation\/?$/),
            module: {
              default: Page,
              loader: () => {
                fail(400, {
                  message: "Validation failed",
                  fieldErrors: { email: ["Enter a valid email address"] },
                  formErrors: ["Please fix the form"],
                });
              },
            },
          },
        ],
        errorRoute: route("/", /^\/?$/, (({ data }: { data: { message: string; fieldErrors?: Record<string, string[]> } }) => (
          <p>
            {data.message}: {data.fieldErrors?.email?.join(", ")}
          </p>
        )) as unknown as OtokRoute["module"]["default"]),
      }),
    );

    const response = await app.request("/validation");
    const html = await response.text();

    expect(response.status).toBe(400);
    expect(html).toContain("Validation failed: Enter a valid email address");
  });

  it("returns JSON validation failures when no error route exists", async () => {
    const app = new Hono();
    app.get(
      "*",
      createOtokHandler({
        routes: [
          {
            ...route("/validation-json", /^\/validation-json\/?$/),
            module: {
              default: Page,
              loader: () => {
                fail(422, { message: "Invalid", fieldErrors: { name: ["Required"] } });
              },
            },
          },
        ],
      }),
    );

    const response = await app.request("/validation-json");

    expect(response.status).toBe(422);
    expect(response.headers.get("content-type")).toBe("application/json; charset=utf-8");
    expect(await response.json()).toEqual({
      status: 422,
      message: "Invalid",
      fieldErrors: { name: ["Required"] },
    });
  });

  it("passes intentional fail messages to error routes", async () => {
    const app = new Hono();
    app.get(
      "*",
      createOtokHandler({
        routes: [
          {
            ...route("/fail", /^\/fail\/?$/),
            module: {
              default: Page,
              loader: () => {
                fail("teapot", 418);
              },
            },
          },
        ],
        errorRoute: route("/", /^\/?$/, ErrorRoute as unknown as OtokRoute["module"]["default"]),
      }),
    );

    const response = await app.request("/fail");
    const html = await response.text();

    expect(response.status).toBe(418);
    expect(html).toContain("Error: teapot");
  });
});
