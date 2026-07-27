import { describe, expect, it } from "vitest";
import { createFormatters, localeDirection } from "./format.js";

describe("createFormatters", () => {
  it("formats numbers, percent, and currency via Intl", () => {
    const f = createFormatters("de-CH");
    expect(f.formatNumber(1234.5)).toContain("1");
    expect(f.formatPercent(0.25)).toContain("25");
    expect(f.formatCurrency(29, "CHF")).toContain("29");
  });

  it("formats dates", () => {
    const f = createFormatters("en");
    const formatted = f.formatDate(new Date("2024-06-15T12:00:00Z"), { dateStyle: "medium" });
    expect(formatted.length).toBeGreaterThan(0);
  });
});

describe("localeDirection", () => {
  it("returns rtl for Arabic and ltr for Latin scripts", () => {
    expect(localeDirection("ar")).toBe("rtl");
    expect(localeDirection("de")).toBe("ltr");
  });
});
