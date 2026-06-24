import { Hono } from "hono";
import { describe, expect, it } from "vitest";
import { createOtokHandler } from "./index.js";
import type { OtokRoute } from "../shared/routes.js";
import { redirect } from "../shared/routes.js";

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

  it("renders convention-based error routes", async () => {
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
    expect(html).toContain("Error: boom");
  });
});
