import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { runCli } from "../src/cli.js";

function captureStdout(fn: () => Promise<number>): Promise<{ code: number; out: string }> {
  const chunks: string[] = [];
  const spy = vi.spyOn(process.stdout, "write").mockImplementation((chunk) => {
    chunks.push(String(chunk));
    return true;
  });
  return fn().then((code) => {
    spy.mockRestore();
    return { code, out: chunks.join("") };
  });
}

function scaffoldRegistryProject(name: string): string {
  const dir = mkdtempSync(join(tmpdir(), `otok-registry-${name}-`));
  writeFileSync(
    join(dir, "package.json"),
    JSON.stringify(
      {
        name: "registry-test-app",
        private: true,
        dependencies: {
          otok: "^0.4.0",
          "otok-adapter-node": "^0.4.0",
          "@kamod-ch/otok-kysely": "0.9.0",
        },
      },
      null,
      2,
    ),
  );
  writeFileSync(
    join(dir, "otok.config.ts"),
    readFileSync(join(import.meta.dirname, "fixtures/registry-app/otok.config.ts"), "utf8"),
  );
  writeFileSync(join(dir, "vite.config.ts"), "export default {};\n");
  return dir;
}

describe("registry cli commands", () => {
  const originalCwd = process.cwd();
  let projectDir: string;

  beforeEach(() => {
    process.env.OTOK_REGISTRY_OFFLINE = "1";
    projectDir = scaffoldRegistryProject("cli");
    process.chdir(projectDir);
  });

  afterEach(() => {
    process.chdir(originalCwd);
    delete process.env.OTOK_REGISTRY_OFFLINE;
    rmSync(projectDir, { recursive: true, force: true });
  });

  it("search storage matches snapshot", async () => {
    const { code, out } = await captureStdout(() => runCli(["search", "storage"]));
    expect(code).toBe(0);
    expect(out).toMatchSnapshot();
    expect(out).toContain("@kamod-ch/otok-storage");
  });

  it("info otok-kysely matches snapshot", async () => {
    const { code, out } = await captureStdout(() => runCli(["info", "otok-kysely"]));
    expect(code).toBe(0);
    expect(out).toMatchSnapshot();
    expect(out).toContain("@kamod-ch/otok-kysely");
  });

  it("outdated lists older kysely", async () => {
    const { code, out } = await captureStdout(() => runCli(["outdated"]));
    expect(code).toBe(0);
    expect(out).toContain("@kamod-ch/otok-kysely");
    expect(out).toContain("0.9.0");
  });

  it("doctor runs read-only checks", async () => {
    const { code, out } = await captureStdout(() => runCli(["doctor"]));
    expect(code).toBe(0);
    expect(out).toMatchSnapshot();
    expect(out).toContain("Otok Doctor");
  });

  it("prints help for new commands", async () => {
    expect(await runCli(["search", "--help"])).toBe(0);
    expect(await runCli(["info", "--help"])).toBe(0);
    expect(await runCli(["doctor", "--help"])).toBe(0);
    expect(await runCli(["outdated", "--help"])).toBe(0);
  });
});
