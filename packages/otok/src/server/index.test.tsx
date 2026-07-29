import { Hono } from "hono";
import { setCookie } from "hono/cookie";
import { describe, expect, it } from "vitest";
import { createOtokHandler } from "./index.js";
import type { OtokRoute } from "../shared/routes.js";
import { fail, isOtokResponse, json, notFound, redirect, validationError } from "../shared/routes.js";

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
  it("preserves Set-Cookie headers from middleware on SSR responses", async () => {
    const app = new Hono();
    app.get(
      "*",
      createOtokHandler({
        routes: [
          {
            ...route("/", /^\/?$/),
            middleware: [
              {
                default: async (c, next) => {
                  setCookie(c, "csrf", "token-1", { path: "/" });
                  await next();
                },
              },
            ],
          },
        ],
      }),
    );

    const response = await app.request("/");
    expect(response.status).toBe(200);
    expect(response.headers.getSetCookie().some((value) => value.startsWith("csrf=token-1"))).toBe(true);
  });

  it("preserves Set-Cookie headers when an action sets a cookie then redirects", async () => {
    const app = new Hono();
    app.all(
      "*",
      createOtokHandler({
        routes: [
          {
            ...route("/login", /^\/login\/?$/),
            module: {
              default: Page as OtokRoute["module"]["default"],
              action: async ({ hono }) => {
                setCookie(hono, "sid", "session-token", { path: "/", httpOnly: true });
                redirect("/", 303);
              },
            },
          },
        ],
      }),
    );

    const response = await app.request("/login", {
      method: "POST",
      body: new URLSearchParams(),
      redirect: "manual",
    });
    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe("/");
    expect(response.headers.getSetCookie().some((value) => value.startsWith("sid=session-token"))).toBe(true);
  });

  it("streams HTML when streaming is enabled", async () => {
    const app = new Hono();
    app.get(
      "*",
      createOtokHandler({
        routes: [route("/", /^\/?$/)],
        streaming: true,
      }),
    );

    const response = await app.request("/");
    expect(response.headers.get("content-type")).toMatch(/text\/html/);
    expect(response.body).toBeTruthy();
    const html = await response.text();
    expect(html).toContain("<!doctype html>");
    expect(html).toContain("OK");
  });

  it("emits hashed asset URLs from an injected Vite manifest without reading fs", async () => {
    const app = new Hono();
    const page = route("/", /^\/?$/);
    page.module.client = true;
    app.get(
      "*",
      createOtokHandler({
        routes: [page],
        clientEntry: "src/client.ts",
        manifest: {
          "src/client.ts": {
            file: "assets/client-edge.js",
            css: ["assets/client-edge.css"],
            isEntry: true,
          },
        },
      }),
    );

    const html = await (await app.request("/")).text();
    expect(html).toContain('href="/assets/client-edge.css"');
    expect(html).toContain('src="/assets/client-edge.js"');
  });

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

  it("runs route middleware in order and shares Hono context values", async () => {
    const calls: string[] = [];
    const UserPage = ({ data }: { data: { user: string } }) => <p>User: {data.user}</p>;
    const app = new Hono();
    app.all(
      "*",
      createOtokHandler({
        routes: [
          {
            ...route("/admin", /^\/admin\/?$/, UserPage as unknown as OtokRoute["module"]["default"]),
            module: {
              default: UserPage as unknown as OtokRoute["module"]["default"],
              loader: ({ hono }) => ({ user: (hono as any).get("user") as string }),
            },
            middleware: [
              {
                default: async (c, next) => {
                  calls.push("root:before");
                  await next();
                  calls.push("root:after");
                },
              },
              {
                default: async (c, next) => {
                  calls.push("admin:before");
                  c.set("user", "Ada");
                  await next();
                  calls.push("admin:after");
                },
              },
            ],
          },
        ],
      }),
    );

    const response = await app.request("/admin");
    const html = await response.text();

    expect(response.status).toBe(200);
    expect(html).toContain("User: Ada");
    expect(calls).toEqual(["root:before", "admin:before", "admin:after", "root:after"]);
  });

  it("allows route middleware to short-circuit and redirect", async () => {
    const app = new Hono();
    app.all(
      "*",
      createOtokHandler({
        routes: [
          {
            ...route("/admin", /^\/admin\/?$/),
            middleware: [
              {
                default: () => redirect("/login", 303),
              },
            ],
          },
        ],
      }),
    );

    const response = await app.request("/admin", { redirect: "manual" });

    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe("/login");
  });

  it("runs route middleware for actions exactly once", async () => {
    let count = 0;
    const app = new Hono();
    app.all(
      "*",
      createOtokHandler({
        routes: [
          {
            ...route("/action", /^\/action\/?$/),
            module: {
              default: ({ actionData }: { actionData?: { count?: number } }) => <p>Count: {actionData?.count}</p>,
              action: ({ hono }: any) => ({ count: hono.get("count") as number }),
            } as unknown as OtokRoute["module"],
            middleware: [
              {
                default: async (c, next) => {
                  count += 1;
                  c.set("count", count);
                  await next();
                },
              },
            ],
          },
        ],
      }),
    );

    const response = await app.request("/action", { method: "POST", body: new URLSearchParams() });
    const html = await response.text();

    expect(response.status).toBe(200);
    expect(count).toBe(1);
    expect(html).toContain("Count: 1");
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

  it("normalizes validationError field strings and re-renders action data with values", async () => {
    const FormPage = ({
      actionData,
    }: {
      actionData?: {
        message?: string;
        fieldErrors?: Record<string, string[]>;
        values?: Record<string, string>;
      };
    }) => (
      <form>
        <input name="email" defaultValue={actionData?.values?.email} aria-invalid={Boolean(actionData?.fieldErrors?.email)} />
        {actionData?.fieldErrors?.email?.map((error) => <p role="alert">{error}</p>)}
        <p>{actionData?.message}</p>
      </form>
    );

    const app = new Hono();
    app.all(
      "*",
      createOtokHandler({
        routes: [
          {
            ...route("/signup", /^\/signup\/?$/, FormPage as unknown as OtokRoute["module"]["default"]),
            module: {
              default: FormPage as unknown as OtokRoute["module"]["default"],
              action: ({ formData }) => {
                validationError({
                  message: "Validation failed",
                  fieldErrors: { email: "Enter a valid email address" },
                  values: { email: String(formData?.get("email") ?? "") },
                });
              },
            },
          },
        ],
      }),
    );

    const response = await app.request("/signup", {
      method: "POST",
      body: new URLSearchParams({ email: "bad" }),
    });
    const html = await response.text();

    expect(response.status).toBe(400);
    expect(html).toContain('aria-invalid="true"');
    expect(html).toContain("Enter a valid email address");
    expect(html).toContain('value="bad"');
  });

  it("supports validationError with status 422 and JSON responses", async () => {
    const app = new Hono();
    app.get(
      "*",
      createOtokHandler({
        routes: [
          {
            ...route("/invalid", /^\/invalid\/?$/),
            module: {
              default: Page,
              loader: () => {
                validationError(
                  {
                    message: "Unprocessable",
                    fieldErrors: { name: ["Required"], email: "Invalid" },
                    formErrors: ["Fix the form"],
                    values: { name: "" },
                  },
                  422,
                );
              },
            },
          },
        ],
      }),
    );

    const response = await app.request("/invalid");

    expect(response.status).toBe(422);
    expect(await response.json()).toEqual({
      status: 422,
      message: "Unprocessable",
      fieldErrors: { name: ["Required"], email: ["Invalid"] },
      formErrors: ["Fix the form"],
      values: { name: "" },
    });
  });

  it("applies cache headers from defineRendering", async () => {
    const { defineRendering } = await import("../rendering/define.js");
    const app = new Hono();
    app.get(
      "*",
      createOtokHandler({
        routes: [
          {
            ...route("/cached", /^\/cached\/?$/),
            module: {
              default: Page as OtokRoute["module"]["default"],
              loader: () => ({ ok: true }),
              rendering: defineRendering({
                mode: "ssr",
                cache: { maxAge: 60, staleWhileRevalidate: 300, tags: ["pages"] },
              }),
            },
          },
        ],
      }),
    );

    const first = await app.request("/cached");
    const second = await app.request("/cached");

    expect(first.headers.get("cache-control")).toContain("max-age=60");
    expect(first.headers.get("cache-control")).toContain("stale-while-revalidate=300");
    expect(first.headers.get("cache-tag")).toBe("pages");
    expect(second.headers.get("x-otok-cache")).toBe("HIT");
  });

  it("forces private cache for cookie-backed requests", async () => {
    const { defineRendering } = await import("../rendering/define.js");
    const app = new Hono();
    app.get(
      "*",
      createOtokHandler({
        routes: [
          {
            ...route("/account", /^\/account\/?$/),
            module: {
              default: Page as OtokRoute["module"]["default"],
              rendering: defineRendering({
                mode: "ssr",
                cache: { public: true, maxAge: 120 },
              }),
            },
          },
        ],
      }),
    );

    const response = await app.request("/account", {
      headers: { cookie: "session=abc" },
    });

    expect(response.headers.get("cache-control")).toContain("private");
    expect(response.headers.get("cache-control")).not.toContain("public");
  });

  it("streams HTML when route rendering enables streaming", async () => {
    const { defineRendering } = await import("../rendering/define.js");
    const app = new Hono();
    app.get(
      "*",
      createOtokHandler({
        routes: [
          {
            ...route("/stream", /^\/stream\/?$/),
            module: {
              default: Page as OtokRoute["module"]["default"],
              rendering: defineRendering({ mode: "ssr", streaming: true }),
            },
          },
        ],
        adapterCapabilities: new Set(["ssr", "streaming"]),
      }),
    );

    const response = await app.request("/stream");
    expect(response.headers.get("content-type")).toContain("text/html");
    expect(response.body).toBeTruthy();
    expect(await response.text()).toContain("<!doctype html>");
  });

  it("sets no-store on validation failures", async () => {
    const app = new Hono();
    app.get(
      "*",
      createOtokHandler({
        routes: [
          {
            ...route("/bad", /^\/bad\/?$/),
            module: {
              default: ErrorRoute as OtokRoute["module"]["default"],
              loader: () => {
                validationError({ message: "Bad request" }, 400);
              },
            },
          },
        ],
        errorRoute: {
          ...route("/_error", /^\/_error\/?$/),
          module: { default: ErrorRoute as OtokRoute["module"]["default"] },
        },
      }),
    );

    const response = await app.request("/bad");
    expect(response.status).toBe(400);
    expect(response.headers.get("cache-control")).toBe("no-store");
  });

  it("streams shell before deferred slot HTML resolves", async () => {
    const { defineRendering } = await import("../rendering/define.js");
    const { createDeferredSlot } = await import("../rendering/deferred.js");
    const { DeferredBoundary } = await import("../shared/deferred-boundary.js");

    let resolvePosts!: (value: { title: string }[]) => void;
    const postsPromise = new Promise<{ title: string }[]>((resolve) => {
      resolvePosts = resolve;
    });

    const DeferredPage = ({ data }: { data: { user: string; posts: unknown } }) => (
      <div>
        <h1>Hello {String((data as { user: string }).user)}</h1>
        <DeferredBoundary slot={(data as { posts: any }).posts} fallback={<p>Loading posts…</p>}>
          {(posts) => (
            <ul>
              {posts.map((post: { title: string }) => (
                <li key={post.title}>{post.title}</li>
              ))}
            </ul>
          )}
        </DeferredBoundary>
      </div>
    );

    const app = new Hono();
    app.get(
      "*",
      createOtokHandler({
        routes: [
          {
            ...route("/deferred", /^\/deferred\/?$/),
            module: {
              default: DeferredPage as unknown as OtokRoute["module"]["default"],
              rendering: defineRendering({ mode: "ssr", streaming: true, deferred: true }),
              loader: () => ({
                user: "alice",
                posts: createDeferredSlot("posts", () => postsPromise),
              }),
            },
          },
        ],
        adapterCapabilities: new Set(["ssr", "streaming"]),
      }),
    );

    const response = await app.request("/deferred");
    expect(response.body).toBeTruthy();
    const reader = response.body!.getReader();
    const decoder = new TextDecoder();

    const first = await reader.read();
    const firstText = decoder.decode(first.value);
    expect(firstText).toContain("<!doctype html>");
    expect(firstText).not.toContain("Deferred Post");

    resolvePosts([{ title: "Deferred Post" }]);

    let rest = "";
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      rest += decoder.decode(chunk.value, { stream: true });
    }
    const html = firstText + rest;
    expect(html).toContain("Hello alice");
    expect(html).toContain("Deferred Post");
    expect(html).not.toContain("data-otok-loading");
    expect(html).not.toContain("Loading posts");
  });

  it("awaits deferred slots before responding when streaming is disabled", async () => {
    const { defineRendering } = await import("../rendering/define.js");
    const { createDeferredSlot } = await import("../rendering/deferred.js");
    const { DeferredBoundary } = await import("../shared/deferred-boundary.js");

    const DeferredPage = ({ data }: { data: { posts: unknown } }) => (
      <DeferredBoundary slot={(data as { posts: any }).posts}>
        {(posts) => <p>{posts[0].title}</p>}
      </DeferredBoundary>
    );

    const app = new Hono();
    app.get(
      "*",
      createOtokHandler({
        routes: [
          {
            ...route("/buffered-deferred", /^\/buffered-deferred\/?$/),
            module: {
              default: DeferredPage as unknown as OtokRoute["module"]["default"],
              rendering: defineRendering({ mode: "ssr", streaming: false, deferred: true }),
              loader: () => ({
                posts: createDeferredSlot(
                  "posts",
                  () => new Promise((resolve) => setTimeout(() => resolve([{ title: "Buffered" }]), 20)),
                ),
              }),
            },
          },
        ],
      }),
    );

    const response = await app.request("/buffered-deferred");
    const html = await response.text();
    expect(html).toContain("Buffered");
    expect(html).not.toContain("data-otok-loading");
  });

  it("aborts deferred streaming when the request signal aborts", async () => {
    const { defineRendering } = await import("../rendering/define.js");
    const { createDeferredSlot } = await import("../rendering/deferred.js");
    const { DeferredBoundary } = await import("../shared/deferred-boundary.js");

    const DeferredPage = ({ data }: { data: { posts: unknown } }) => (
      <div>
        <p>Critical</p>
        <DeferredBoundary slot={(data as { posts: any }).posts}>
          {(posts) => <p>{posts.title}</p>}
        </DeferredBoundary>
      </div>
    );

    const app = new Hono();
    app.get(
      "*",
      createOtokHandler({
        routes: [
          {
            ...route("/abort-deferred", /^\/abort-deferred\/?$/),
            module: {
              default: DeferredPage as unknown as OtokRoute["module"]["default"],
              rendering: defineRendering({ mode: "ssr", streaming: true, deferred: true }),
              loader: () => ({
                posts: createDeferredSlot(
                  "posts",
                  () => new Promise((resolve) => setTimeout(() => resolve({ title: "late" }), 5_000)),
                ),
              }),
            },
          },
        ],
        adapterCapabilities: new Set(["ssr", "streaming"]),
      }),
    );

    const controller = new AbortController();
    const response = await app.request("/abort-deferred", { signal: controller.signal });
    const reader = response.body!.getReader();
    await reader.read(); // shell
    controller.abort();

    await expect(reader.read()).rejects.toThrow();
  });
});
