import { describe, expect, it } from "vitest";
import { h } from "preact";
import type { Context } from "hono";
import { createTestApp, renderRoute, requestRoute } from "@otok/test";
import type { OtokPageProps } from "otok/server";
import {
  composeMiddleware,
  createRequireRoleMiddleware,
  createTenantMiddleware,
} from "./rbac.js";
import { createRequireAuthMiddleware } from "./require-auth.js";
import { defineMiddleware } from "otok/server";

type User = {
  id: string;
  email: string;
  role: "admin" | "viewer";
  organizationId: string;
};

describe("createTenantMiddleware", () => {
  it("sets tenant and additional context values from the authenticated user", async () => {
    const user: User = {
      id: "1",
      email: "a@b.c",
      role: "admin",
      organizationId: "org-1",
    };

    const middleware = composeMiddleware(
      createRequireAuthMiddleware<User>({ getUser: async () => user }),
      createTenantMiddleware<User>({
        getTenantId: (entry) => entry.organizationId,
        contextKey: "organizationId",
        also: { role: (entry) => entry.role },
      }),
    );

    const { html } = await renderRoute(
      createTestApp({
        routes: [
          {
            path: "/app",
            component: (({ data }: OtokPageProps<{ org: string; role: string }>) =>
              h("p", null, `${data.org}:${data.role}`)) as (props: OtokPageProps) => ReturnType<typeof h>,
            loader: ({ hono }) => ({
              org: (hono as Context).get("organizationId") as string,
              role: (hono as Context).get("role") as string,
            }),
            middleware: [{ default: middleware }],
          },
        ],
      }),
      "/app",
    );

    expect(html).toContain("org-1:admin");
  });
});

describe("createRequireRoleMiddleware", () => {
  it("redirects unauthenticated users to login", async () => {
    const middleware = createRequireRoleMiddleware<User>({
      getUser: () => undefined,
      getRole: (user) => user.role,
      allowed: ["admin"],
    });

    const response = await requestRoute(
      createTestApp({
        routes: [
          {
            path: "/admin",
            component: () => h("p", null, "Admin"),
            middleware: [{ default: middleware }],
          },
        ],
      }),
      "/admin",
      { redirect: "manual" },
    );

    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe("/login");
  });

  it("returns 403 when the role is not allowed", async () => {
    const middleware = composeMiddleware(
      createRequireAuthMiddleware<User>({
        getUser: async () => ({
          id: "1",
          email: "a@b.c",
          role: "viewer",
          organizationId: "org-1",
        }),
      }),
      createRequireRoleMiddleware<User>({
        getRole: (user) => user.role,
        allowed: ["admin", "owner"],
      }),
    );

    const response = await requestRoute(
      createTestApp({
        routes: [
          {
            path: "/admin",
            component: () => h("p", null, "Admin"),
            middleware: [{ default: middleware }],
          },
        ],
      }),
      "/admin",
    );

    expect(response.status).toBe(403);
  });

  it("allows users with an allowed role", async () => {
    const middleware = composeMiddleware(
      createRequireAuthMiddleware<User>({
        getUser: async () => ({
          id: "1",
          email: "a@b.c",
          role: "admin",
          organizationId: "org-1",
        }),
      }),
      createRequireRoleMiddleware<User>({
        getRole: (user) => user.role,
        allowed: ["admin"],
      }),
    );

    const { html } = await renderRoute(
      createTestApp({
        routes: [
          {
            path: "/admin",
            component: () => h("p", null, "Admin"),
            middleware: [{ default: middleware }],
          },
        ],
      }),
      "/admin",
    );

    expect(html).toContain("Admin");
  });
});

describe("composeMiddleware", () => {
  it("runs middleware in order", async () => {
    const order: string[] = [];
    const middleware = composeMiddleware(
      defineMiddleware(async (_c, next) => {
        order.push("first");
        await next();
      }),
      defineMiddleware(async (_c, next) => {
        order.push("second");
        await next();
      }),
    );

    await renderRoute(
      createTestApp({
        routes: [
          {
            path: "/",
            component: () => h("p", null, "ok"),
            middleware: [{ default: middleware }],
          },
        ],
      }),
      "/",
    );

    expect(order).toEqual(["first", "second"]);
  });
});
