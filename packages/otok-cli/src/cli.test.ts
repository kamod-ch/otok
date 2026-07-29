import { describe, expect, it } from "vitest";
import { runCli } from "./cli.js";

describe("otok cli routes commands", () => {
  it("prints help for typegen", async () => {
    const code = await runCli(["typegen", "--help"]);
    expect(code).toBe(0);
  });

  it("prints help for routes", async () => {
    const code = await runCli(["routes", "--help"]);
    expect(code).toBe(0);
  });
});
