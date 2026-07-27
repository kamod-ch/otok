import { describe, expect, it } from "vitest";
import { createLinkHelper, localizePath, stripLocaleParam, switchLocalePath } from "./routes.js";

const locales = ["de", "en", "fr"] as const;

describe("localizePath routing modes", () => {
  it("prefix: always adds locale segment", () => {
    expect(localizePath("/products", "de", { routing: "prefix" })).toBe("/de/products");
    expect(localizePath("/products", "en", { routing: "prefix", defaultLocale: "de" })).toBe("/en/products");
  });

  it("prefix-except-default: omits default locale", () => {
    expect(
      localizePath("/products", "de", { routing: "prefix-except-default", defaultLocale: "de" }),
    ).toBe("/products");
    expect(
      localizePath("/products", "en", { routing: "prefix-except-default", defaultLocale: "de" }),
    ).toBe("/en/products");
  });

  it("none and domain: leave path unchanged", () => {
    expect(localizePath("/products", "en", { routing: "none" })).toBe("/products");
    expect(localizePath("/products", "en", { routing: "domain" })).toBe("/products");
  });
});

describe("switchLocalePath", () => {
  it("preserves canonical path when switching locale", () => {
    expect(
      switchLocalePath("/en/products", "fr", locales, {
        defaultLocale: "de",
        routing: "prefix-except-default",
      }),
    ).toBe("/fr/products");

    expect(
      switchLocalePath("/fr/products", "de", locales, {
        defaultLocale: "de",
        routing: "prefix-except-default",
      }),
    ).toBe("/products");
  });
});

describe("createLinkHelper", () => {
  it("localizes named routes", () => {
    const links = createLinkHelper(locales, "de", "prefix-except-default", {
      about: { de: "ueber-uns", en: "about", fr: "a-propos" },
    });
    expect(links.route("about", "de")).toBe("/ueber-uns");
    expect(links.route("about", "fr")).toBe("/fr/a-propos");
  });
});

describe("stripLocaleParam", () => {
  it("round-trips with localizePath", () => {
    const path = localizePath("/projects", "fr", { defaultLocale: "de", routing: "prefix-except-default" });
    expect(stripLocaleParam(path, locales)).toEqual({ pathname: "/projects", locale: "fr" });
  });
});
