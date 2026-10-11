import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { buildUpgradePlan } from "./upgrade.js";
import { compareVersions } from "../package-identities.js";

function scaffold(root: string, deps: Record<string, string>): void {
  writeFileSync(
    join(root, "package.json"),
    JSON.stringify({ name: "upgrade-fixture", private: true, dependencies: deps }, null, 2),
  );
}

describe("buildUpgradePlan", () => {
  let root: string;

  beforeEach(() => {
    process.env.OTOK_REGISTRY_OFFLINE = "1";
    root = mkdtempSync(join(tmpdir(), "otok-upgrade-"));
  });

  afterEach(() => {
    delete process.env.OTOK_REGISTRY_OFFLINE;
    rmSync(root, { recursive: true, force: true });
  });

  it("plans registry snapshot targets for scoped core and adapters with --core-only scope", async () => {
    scaffold(root, {
      "@kamod-ch/otok": "^0.4.0",
      "@kamod-ch/otok-vite-plugin": "^0.4.0",
      "otok-cli": "^0.4.0",
      "otok-adapter-node": "^0.4.0",
    });

    const { plans, diagnostics } = await buildUpgradePlan(root, true);
    expect(diagnostics).toEqual([]);
    const byPkg = new Map(plans.map((p) => [p.package, p]));
    expect(byPkg.get("@kamod-ch/otok")?.to).toBe("2.0.0");
    expect(byPkg.get("otok-adapter-node")?.to).toBe("2.0.0");
    expect(byPkg.get("@kamod-ch/otok-vite-plugin")?.to).toBe("2.0.0");
    expect(byPkg.get("otok-cli")?.to).toBe("2.0.0");
  });

  it("skips packages already at or above the registry snapshot", async () => {
    scaffold(root, {
      "@kamod-ch/otok": "2.0.0",
      "otok-adapter-node": "2.1.0",
    });

    const { plans } = await buildUpgradePlan(root, true);
    expect(plans).toEqual([]);
  });

  it("orders prerelease below the release target", () => {
    expect(compareVersions("2.0.0-beta.1", "2.0.0")).toBeLessThan(0);
    expect(compareVersions("2.1.0", "2.0.0")).toBeGreaterThan(0);
  });

  it("reports unsupported workspace specs instead of claiming up to date", async () => {
    scaffold(root, {
      "@kamod-ch/otok": "workspace:*",
    });

    const { plans, diagnostics } = await buildUpgradePlan(root, true);
    expect(plans).toEqual([]);
    expect(diagnostics.some((d) => /unsupported version spec/i.test(d))).toBe(true);
  });

  it("deduplicates extension upgrades in full mode", async () => {
    scaffold(root, {
      "@kamod-ch/otok": "2.0.0",
      "@kamod-ch/otok-kysely": "0.9.0",
    });

    const { plans } = await buildUpgradePlan(root, false);
    const kysely = plans.filter((p) => p.package === "@kamod-ch/otok-kysely");
    expect(kysely).toHaveLength(1);
    expect(kysely[0]?.to).toBe("1.0.0");
  });

  it("flags conflicting legacy and scoped core packages", async () => {
    scaffold(root, {
      "@kamod-ch/otok": "^2.0.0",
      otok: "^0.4.0",
    });

    const { diagnostics } = await buildUpgradePlan(root, true);
    expect(diagnostics.some((d) => /conflicting core/i.test(d))).toBe(true);
  });
});
