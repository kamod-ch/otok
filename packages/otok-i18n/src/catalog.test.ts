import { describe, expect, it } from "vitest";
import { createTranslator } from "./catalog.js";
import { interpolate } from "./interpolate.js";
import { extractCount, pickPluralMessage } from "./plural.js";

const messages = {
  "about.title": "About",
  "nav.home": "Home",
  "welcome": "Hello, {name}!",
  "items.one": "1 item",
  "items.other": "{count} items",
} as const;

const fallback = {
  "about.title": "About",
  "nav.home": "Home",
  "items.one": "1 item",
  "items.other": "{count} items",
} as const;

describe("createTranslator", () => {
  it("falls back: locale → fallbackLocale → explicit → key", () => {
    const t = createTranslator(messages, "de", "en", fallback, { warnMissingKeys: false });
    expect(t("about.title")).toBe("About");
    expect(t("nav.home")).toBe("Home");
    expect(t("missing.key", undefined, "Fallback")).toBe("Fallback");
    expect(t("missing.key")).toBe("missing.key");
  });

  it("interpolates variables with HTML escaping", () => {
    const t = createTranslator(messages, "en", "en", {}, { warnMissingKeys: false });
    expect(t("welcome", { name: "Max" })).toBe("Hello, Max!");
    expect(t("welcome", { name: "<script>" })).toBe("Hello, &lt;script&gt;!");
  });

  it("selects plural forms by count", () => {
    const t = createTranslator(messages, "en", "en", {}, { warnMissingKeys: false });
    expect(t("items", { count: 1 })).toBe("1 item");
    expect(t("items", { count: 5 })).toBe("5 items");
  });
});

describe("interpolate", () => {
  it("leaves unknown placeholders intact", () => {
    expect(interpolate("Hi {name}", {})).toBe("Hi {name}");
  });
});

describe("plural", () => {
  it("extractCount handles numbers and numeric strings", () => {
    expect(extractCount({ count: 3 })).toBe(3);
    expect(extractCount({ count: "2" })).toBe(2);
    expect(extractCount({})).toBeUndefined();
  });

  it("pickPluralMessage prefers category-specific keys", () => {
    expect(pickPluralMessage(messages as Record<string, string>, "items", "en", 1)).toBe("1 item");
    expect(pickPluralMessage(messages as Record<string, string>, "items", "en", 0)).toBe("{count} items");
  });
});
