import { describe, expect, it } from "vitest";
import { mergeKits } from "@kamod-ch/otok-config";

describe("multi-kit composition", () => {
  it("composes CRM + SaaS without conflicts", async () => {
    const crmKit = (await import("@kamod-ch/otok-kit-crm/kit")).default;
    const saasKit = (await import("@kamod-ch/otok-kit-saas/kit")).default;
    const plan = mergeKits([crmKit, saasKit], {}, { enabledModules: { "@kamod-ch/otok-kit-crm": ["pipelines"] } });
    expect(plan.conflicts.filter((c) => c.type === "incompatible_kits")).toHaveLength(0);
    expect(plan.files.some((f) => f.to.includes("crm"))).toBe(true);
    expect(plan.files.some((f) => f.to.includes("billing"))).toBe(true);
  });

  it("detects admin + marketplace conflict", async () => {
    const adminKit = (await import("@kamod-ch/otok-kit-admin/kit")).default;
    const marketplaceKit = (await import("@kamod-ch/otok-kit-marketplace/kit")).default;
    const plan = mergeKits([adminKit, marketplaceKit], {});
    expect(plan.conflicts.some((c) => c.type === "incompatible_kits")).toBe(true);
  });
});
