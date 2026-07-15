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

  it("runs route actions for form posts and re-renders with action data", async () => {
    const FormPage = ({ actionData }: { actionData?: { message?: string; fieldErrors?: Record<string, string[]> } }) => (
      <form method="post">
        <input name="name" aria-invalid={Boolean(actionData?.fieldErrors?.name)} />
        {actionData?.fieldErrors?.name?.map((error) => <p role="alert">{error}</p>)}
        <p>{actionData?.message}</p>
      </form>
    );
    const app = new Hono();
    app.all(
      "*",
      createOtokHandler({
        routes: [
          {
            ...route("/projects", /^\/projects\/?$/, FormPage as unknown as OtokRoute["module"]["default"]),
            module: {
              default: FormPage as unknown as OtokRoute["module"]["default"],
              action: ({ formData }) => {
                if (!formData?.get("name")) {
                  fail(400, { message: "Validation failed", fieldErrors: { name: ["Name is required"] } });
                }
                return { message: `Saved ${formData.get("name")}` };
              },
            },
          },
        ],
      }),
    );

    const invalid = await app.request("/projects", {
      method: "POST",
      body: new URLSearchParams(),
    });
    const invalidHtml = await invalid.text();
    expect(invalid.status).toBe(400);
    expect(invalidHtml).toContain("Name is required");
    expect(invalidHtml).toContain('aria-invalid="true"');

    const valid = await app.request("/projects", {
      method: "POST",
      body: new URLSearchParams({ name: "Otok" }),
    });
    const validHtml = await valid.text();
    expect(valid.status).toBe(200);
    expect(validHtml).toContain("Saved Otok");
  });

  it("returns redirects and native responses from actions", async () => {
    const app = new Hono();
    app.all(
      "*",
      createOtokHandler({
        routes: [
          {
            ...route("/redirect-action", /^\/redirect-action\/?$/),
            module: {
              default: Page,
              action: () => redirect("/projects", 303),
            },
          },
          {
            ...route("/response-action", /^\/response-action\/?$/),
            module: {
              default: Page,
              action: () => new Response("Created", { status: 201 }),
            },
          },
        ],
      }),
    );

    const redirectResponse = await app.request("/redirect-action", { method: "POST", redirect: "manual" });
    expect(redirectResponse.status).toBe(303);
    expect(redirectResponse.headers.get("location")).toBe("/projects");

    const nativeResponse = await app.request("/response-action", { method: "POST" });
    expect(nativeResponse.status).toBe(201);
    expect(await nativeResponse.text()).toBe("Created");
  });

  it("supports multipart action form data and method override", async () => {
    const app = new Hono();
    app.all(
      "*",
      createOtokHandler({
        routes: [
          {
            ...route("/upload", /^\/upload\/?$/),
            module: {
              default: (({ actionData }: { actionData?: { method?: string; fileName?: string } }) => (
                <p>
                  {actionData?.method}:{actionData?.fileName}
                </p>
              )) as unknown as OtokRoute["module"]["default"],
              action: ({ formData, method }) => {
                const file = formData?.get("file");
                return { method, fileName: file instanceof File ? file.name : "missing" };
              },
            },
          },
        ],
      }),
    );
    const body = new FormData();
    body.set("_method", "delete");
    body.set("file", new File(["hello"], "hello.txt", { type: "text/plain" }));

    const response = await app.request("/upload", { method: "POST", body });
    const html = await response.text();

    expect(response.status).toBe(200);
    expect(html).toContain("DELETE:hello.txt");
  });

  it("routes action notFound errors to the not-found route", async () => {
    const app = new Hono();
    app.all(
      "*",
      createOtokHandler({
        routes: [
          {
            ...route("/action-missing", /^\/action-missing\/?$/),
            module: {
              default: Page,
              action: () => notFound("Action target missing"),
            },
          },
        ],
        notFoundRoute: route("/", /^\/?$/, ErrorRoute as unknown as OtokRoute["module"]["default"]),
      }),
    );

    const response = await app.request("/action-missing", { method: "POST" });
    const html = await response.text();

    expect(response.status).toBe(404);
    expect(html).toContain("Action target missing");
  });

  it("returns 405 for action methods without route actions", async () => {
    const app = new Hono();
    app.all("*", createOtokHandler({ routes: [route("/readonly", /^\/readonly\/?$/)] }));

    const response = await app.request("/readonly", { method: "POST" });

    expect(response.status).toBe(405);
    expect(response.headers.get("allow")).toBe("GET, HEAD");
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
