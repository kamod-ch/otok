import { describe, expect, it } from "vitest";
import i18n from "./plugin.js";

describe("i18n plugin", () => {
  it("exports a valid Otok plugin factory", () => {
    const plugin = i18n({
      locales: ["de", "en"],
      defaultLocale: "de",
      messages: {
        de: () => ({ hello: "Hallo" }),
        en: () => ({ hello: "Hello" }),
      },
    });

    expect(plugin.name).toBe("@kamod-ch/otok-i18n");
    expect(typeof plugin.configureApp).toBe("function");
    expect((plugin.__options as { defaultLocale: string }).defaultLocale).toBe("de");
  });

  it("validates options via schema", () => {
    const plugin = i18n({
      locales: ["de"],
      defaultLocale: "de",
      messages: { de: () => ({}) },
    });

    expect(() => plugin.schema?.parse({ locales: [], defaultLocale: "de", messages: {} })).toThrow(/locales/);

    expect(() =>
      plugin.schema?.parse({
        locales: ["de"],
        defaultLocale: "en",
        messages: { de: () => ({}) },
      }),
    ).toThrow(/defaultLocale must be in locales/);
  });
});
