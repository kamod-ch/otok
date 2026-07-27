import { describe, expect, it } from "vitest";
import { PluginSetupValidationError, validateSetupChanges } from "./setup.js";

const root = "/project";

describe("validateSetupChanges", () => {
  it("allows append to .env.example", () => {
    const changes = validateSetupChanges(root, [
      { kind: "append-file", path: ".env.example", content: "FOO=bar\n" },
    ]);
    expect(changes[0]?.kind).toBe("append-file");
    if (changes[0]?.kind === "append-file") {
      expect(changes[0].path).toBe(".env.example");
    }
  });

  it("rejects append outside env example files", () => {
    expect(() =>
      validateSetupChanges(root, [{ kind: "append-file", path: "package.json", content: "{}" }]),
    ).toThrow(PluginSetupValidationError);
  });

  it("rejects paths that escape the project root", () => {
    expect(() =>
      validateSetupChanges(root, [{ kind: "mkdir", path: "../outside" }]),
    ).toThrow(PluginSetupValidationError);
  });

  it("allows create under config/", () => {
    const changes = validateSetupChanges(root, [
      { kind: "create-file", path: "config/oauth.example.ts", content: "export {}\n" },
    ]);
    expect(changes[0]?.kind).toBe("create-file");
    if (changes[0]?.kind === "create-file") {
      expect(changes[0].path).toBe("config/oauth.example.ts");
    }
  });
});
