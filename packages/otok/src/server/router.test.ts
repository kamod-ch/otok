import { describe, expect, it } from "vitest";
import { matchRoute } from "./router.js";
import type { OtokRoute } from "../shared/routes.js";

const component = () => null;

describe("matchRoute", () => {
  const routes: OtokRoute[] = [
    {
      id: "users.[id]",
      path: "/users/:id",
      pattern: /^\/users\/([^/]+)\/?$/,
      params: ["id"],
      module: { default: component },
    },
    {
      id: "docs.[...slug]",
      path: "/docs/:slug*",
      pattern: /^\/docs\/(.+)\/?$/,
      params: ["slug"],
      module: { default: component },
    },
    {
      id: "index",
      path: "/",
      pattern: /^\/?$/,
      params: [],
      module: { default: component },
    },
  ];

  it("matches dynamic params", () => {
    expect(matchRoute(routes, "/users/alice")?.params).toEqual({ id: "alice" });
  });

  it("returns undefined for missing routes", () => {
    expect(matchRoute(routes, "/missing")).toBeUndefined();
  });

  it("matches catch-all params", () => {
    expect(matchRoute(routes, "/docs/routing/catch-all")?.params).toEqual({
      slug: "routing/catch-all",
    });
  });
});
