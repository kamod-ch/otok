import { describe, expect, it } from "vitest";
import { defineKit } from "./kit.js";
import { mergeKits, satisfiesRange, detectKitConflicts } from "./kit-merge.js";
import { definePreset } from "./preset.js";
import { mergePresets } from "./preset-merge.js";

const crmKit = defineKit({
  kind: "kit",
  name: "@kamod-ch/otok-kit-crm",
  version: "0.1.0",
  starter: "minimal",
  otok: "^0.4.0",
  routes: [{ from: "routes/crm/index.tsx", to: "src/app/routes/crm/index.tsx" }],
  migrations: [{ id: "20260801000000_crm_initial", kit: "@kamod-ch/otok-kit-crm", description: "CRM schema", up: "migrations/001.sql" }],
  permissions: ["crm:companies:read"],
  modules: {
    pipelines: {
      id: "pipelines",
      files: [{ from: "routes/crm/pipelines.tsx", to: "src/app/routes/crm/pipelines.tsx" }],
      permissions: ["crm:pipelines:read"],
    },
  },
});

const adminKit = defineKit({
  kind: "kit",
  name: "@kamod-ch/otok-kit-admin",
  version: "0.1.0",
  starter: "minimal",
  routes: [{ from: "routes/admin/index.tsx", to: "src/app/routes/admin/index.tsx" }],
  conflicts: ["@kamod-ch/otok-kit-marketplace"],
});

const marketplaceKit = defineKit({
  kind: "kit",
  name: "@kamod-ch/otok-kit-marketplace",
  version: "0.1.0",
  starter: "minimal",
  routes: [{ from: "routes/marketplace/index.tsx", to: "src/app/routes/marketplace/index.tsx" }],
});

describe("mergeKits", () => {
  it("composes multiple kits with enabled modules", () => {
    const plan = mergeKits([crmKit, adminKit], {}, { enabledModules: { "@kamod-ch/otok-kit-crm": ["pipelines"] } });
    expect(plan.kits).toEqual(["@kamod-ch/otok-kit-crm", "@kamod-ch/otok-kit-admin"]);
    expect(plan.files.some((f) => f.to === "src/app/routes/crm/pipelines.tsx")).toBe(true);
    expect(plan.permissions).toContain("crm:pipelines:read");
    expect(plan.migrations).toHaveLength(1);
  });

  it("detects incompatible kits", () => {
    const plan = mergeKits([adminKit, marketplaceKit], {});
    expect(plan.conflicts.some((c) => c.type === "incompatible_kits")).toBe(true);
  });

  it("checks version requirements", () => {
    const kit = defineKit({
      ...crmKit,
      requires: [{ package: "otok", range: "^0.4.0" }],
    });
    const plan = mergeKits([kit], {}, {}, { otok: "0.4.5" });
    expect(plan.versionMismatches).toHaveLength(0);

    const bad = mergeKits([kit], {}, {}, { otok: "0.3.0" });
    expect(bad.versionMismatches).toHaveLength(1);
  });
});

describe("satisfiesRange", () => {
  it("supports caret and gte ranges", () => {
    expect(satisfiesRange("0.4.5", "^0.4.0")).toBe(true);
    expect(satisfiesRange("0.5.0", "^0.4.0")).toBe(false);
    expect(satisfiesRange("0.4.0", ">=0.4.0")).toBe(true);
    expect(satisfiesRange("0.3.9", ">=0.4.0")).toBe(false);
  });
});

describe("detectKitConflicts duplicate routes", () => {
  it("flags duplicate route targets", () => {
    const a = defineKit({
      kind: "kit",
      name: "@kamod-ch/otok-kit-a",
      version: "1",
      files: [{ from: "a.tsx", to: "src/app/routes/shared.tsx" }],
    });
    const b = defineKit({
      kind: "kit",
      name: "@kamod-ch/otok-kit-b",
      version: "1",
      files: [{ from: "b.tsx", to: "src/app/routes/shared.tsx" }],
    });
    const plan = mergePresets([a, b], {});
    const conflicts = detectKitConflicts([a, b], plan, {});
    expect(conflicts.some((c) => c.type === "duplicate_route")).toBe(true);
  });
});
