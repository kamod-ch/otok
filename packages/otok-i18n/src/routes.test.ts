import { describe, expect, it } from "vitest";
import { localizePath, stripLocaleParam, withLocaleParam } from "./routes.js";

describe("routes", () => {
  it("round-trips localize + strip for non-default locales", () => {
    const path = localizePath("/projects", "de", { defaultLocale: "en" });
    expect(path).toBe("/de/projects");
    expect(stripLocaleParam(path, ["en", "de"])).toEqual({
      pathname: "/projects",
      locale: "de",
    });
  });

  it("withLocaleParam is usable with typed route builders", () => {
    const params = withLocaleParam({ slug: "intro" }, "de");
    expect(params).toEqual({ slug: "intro", lang: "de" });
  });
});
