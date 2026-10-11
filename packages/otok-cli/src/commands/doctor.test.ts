import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { runDoctorChecks } from "./doctor.js";

function scaffold(root: string, deps: Record<string, string>): void {
  writeFileSync(
    join(root, "package.json"),
    JSON.stringify({ name: "doctor-fixture", private: true, dependencies: deps }, null, 2),
  );
}

describe("runDoctorChecks", () => {
  let root: string;

  beforeEach(() => {
    process.env.OTOK_REGISTRY_OFFLINE = "1";
    root = mkdtempSync(join(tmpdir(), "otok-doctor-"));
  });

  afterEach(() => {
    delete process.env.OTOK_REGISTRY_OFFLINE;
    rmSync(root, { recursive: true, force: true });
  });

  it("detects scoped @kamod-ch/otok/server imports in client bundles", async () => {
    scaffold(root, { "@kamod-ch/otok": "^2.0.0", "otok-adapter-node": "^2.0.0" });
    const clientDir = join(root, "src", "client");
    mkdirSync(clientDir, { recursive: true });
    writeFileSync(
      join(clientDir, "leak.tsx"),
      `import { createHandler } from "@kamod-ch/otok/server";\nexport default createHandler;\n`,
    );

    const report = await runDoctorChecks(root);
    expect(report.findings.some((f) => f.id === "client-leak" && /@kamod-ch\/otok\/server/.test(f.message))).toBe(true);
  });

  it("reports conflicting core package names", async () => {
    scaffold(root, { "@kamod-ch/otok": "^2.0.0", otok: "^0.4.0" });
    const report = await runDoctorChecks(root);
    expect(report.findings.some((f) => f.id === "core-conflict")).toBe(true);
    expect(report.exitCode).toBe(1);
  });

  it("reads scoped core version for otok-version info", async () => {
    scaffold(root, { "@kamod-ch/otok": "^2.0.0", "otok-adapter-node": "^2.0.0" });
    const report = await runDoctorChecks(root);
    expect(report.findings.some((f) => f.id === "otok-version" && f.message.includes("2.0.0"))).toBe(true);
  });
});
