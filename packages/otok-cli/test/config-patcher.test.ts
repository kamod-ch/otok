import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { patchOtokConfig } from "../src/config-patcher.js";

const fixturesDir = join(dirname(fileURLToPath(import.meta.url)), "fixtures");

function readFixture(name: string): string {
  return readFileSync(join(fixturesDir, name, "otok.config.ts"), "utf8");
}

describe("patchOtokConfig", () => {
  it("adds import and plugin to an empty config", () => {
    const source = readFixture("empty-config");
    const result = patchOtokConfig(source, {
      packageName: "@kamod-ch/otok-plugin-hello",
      identifier: "hello",
    });

    expect(result.changed).toBe(true);
    expect(result.content).toContain('import hello from "@kamod-ch/otok-plugin-hello";');
    expect(result.content).toContain("plugins: [hello()]");
  });

  it("appends to an existing plugins array", () => {
    const source = readFixture("with-plugin");
    const result = patchOtokConfig(source, {
      packageName: "@kamod-ch/otok-oauth",
      identifier: "oauth",
    });

    expect(result.changed).toBe(true);
    expect(result.content).toContain('import oauth from "@kamod-ch/otok-oauth";');
    expect(result.content).toMatch(/plugins:\s*\[[\s\S]*hello\(\),[\s\S]*oauth\(\)/);
  });

  it("creates plugins property when missing", () => {
    const source = readFixture("no-plugins-property");
    const result = patchOtokConfig(source, {
      packageName: "@kamod-ch/otok-plugin-hello",
      identifier: "hello",
    });

    expect(result.changed).toBe(true);
    expect(result.content).toContain("plugins: [hello()]");
    expect(result.content).toContain("theme: true");
  });

  it("is idempotent when plugin is already registered", () => {
    const source = readFixture("with-plugin");
    const result = patchOtokConfig(source, {
      packageName: "@kamod-ch/otok-plugin-hello",
      identifier: "hello",
    });

    expect(result.changed).toBe(false);
    expect(result.reason).toBe("already-installed");
    expect(result.content).toBe(source);
  });

  it("preserves multiline formatting when appending", () => {
    const source = readFixture("multiline-plugins");
    const result = patchOtokConfig(source, {
      packageName: "@kamod-ch/otok-i18n",
      identifier: "i18n",
    });

    expect(result.changed).toBe(true);
    expect(result.content).toContain("i18n()");
    expect(result.content).toContain("hello()");
    expect(result.content).toContain("oauth()");
  });

  it("does not duplicate on repeated patch", () => {
    const source = readFixture("empty-config");
    const first = patchOtokConfig(source, {
      packageName: "@kamod-ch/otok-plugin-hello",
      identifier: "hello",
    });
    const second = patchOtokConfig(first.content, {
      packageName: "@kamod-ch/otok-plugin-hello",
      identifier: "hello",
    });

    expect(second.changed).toBe(false);
    expect(second.content).toBe(first.content);
  });
});
