import { describe, expect, it } from "vitest";
import { matchRoute } from "./router.js";
import { OtokHttpError, type OtokRoute } from "../shared/routes.js";

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

  it("decodes unicode params once", () => {
    expect(matchRoute(routes, "/users/%E2%98%83")?.params).toEqual({ id: "☃" });
  });

  it("throws OtokHttpError 400 for malformed percent encoding", () => {
    expect(() => matchRoute(routes, "/users/%")).toThrow(OtokHttpError);
    expect(() => matchRoute(routes, "/users/%")).toThrow(expect.objectContaining({ status: 400 }));
    expect(() => matchRoute(routes, "/users/%ZZ")).toThrow(OtokHttpError);
    expect(() => matchRoute(routes, "/users/%E0%A4")).toThrow(OtokHttpError);
  });

  it("preserves encoded slash segments in a single capture", () => {
    const slashRoutes: OtokRoute[] = [
      {
        id: "files.[path]",
        path: "/files/:path*",
        pattern: /^\/files\/(.+)\/?$/,
        params: ["path"],
        module: { default: component },
      },
    ];
    expect(matchRoute(slashRoutes, "/files/a%2Fb")?.params).toEqual({ path: "a/b" });
    expect(matchRoute(slashRoutes, "/files/%252F")?.params).toEqual({ path: "%2F" });
  });
});
