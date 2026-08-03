import { describe, expect, it } from "vitest";
import { CrmService } from "./domain/service.js";
import { seedSwissDemo, SWISS_DEMO_ORG_ID } from "./seed/swiss.js";
import { hasCrmPermission } from "./permissions.js";
import { t } from "./i18n/index.js";

describe("Swiss CRM E2E core flow", () => {
  it("lists seeded Swiss companies with UID and canton", () => {
    const crm = new CrmService();
    seedSwissDemo(crm);
    const companies = crm.listCompanies(SWISS_DEMO_ORG_ID);
    expect(companies.length).toBeGreaterThanOrEqual(3);
    expect(companies.find((c) => c.name.includes("Migros"))?.uid).toMatch(/^CHE-/);
    expect(companies.find((c) => c.canton === "VD")).toBeTruthy();
  });

  it("searches by UID fragment and updates company", () => {
    const crm = new CrmService();
    seedSwissDemo(crm);
    const found = crm.searchCompanies({ orgId: SWISS_DEMO_ORG_ID, q: "Bühler" });
    expect(found).toHaveLength(1);
    crm.updateCompany(SWISS_DEMO_ORG_ID, found[0]!.id, { industry: "Food Technology" });
    expect(crm.getCompany(SWISS_DEMO_ORG_ID, found[0]!.id)?.industry).toBe("Food Technology");
  });

  it("records activity on company", () => {
    const crm = new CrmService();
    seedSwissDemo(crm);
    const activity = crm.addActivity({
      orgId: SWISS_DEMO_ORG_ID,
      companyId: "co-migros",
      type: "call",
      subject: "Pricing follow-up",
      occurredAt: new Date().toISOString(),
      userId: "user-sales",
    });
    expect(crm.listActivities(SWISS_DEMO_ORG_ID, "co-migros").some((a) => a.id === activity.id)).toBe(true);
  });

  it("imports and exports CSV", () => {
    const crm = new CrmService();
    seedSwissDemo(crm);
    const before = crm.listCompanies(SWISS_DEMO_ORG_ID).length;
    const csv = "name,uid,canton,city,industry\nNeue AG,CHE-999.888.777,BE,Bern,Consulting";
    const result = crm.importCompaniesCsv(SWISS_DEMO_ORG_ID, csv);
    expect(result.imported).toBe(1);
    expect(crm.listCompanies(SWISS_DEMO_ORG_ID).length).toBe(before + 1);
    const exported = crm.exportCompaniesCsv(SWISS_DEMO_ORG_ID);
    expect(exported).toContain("Neue AG");
  });

  it("checks sales permissions", () => {
    expect(hasCrmPermission(["crm:companies:read"], "crm:companies:read")).toBe(true);
    expect(hasCrmPermission(["crm:companies:read"], "crm:companies:import")).toBe(false);
    expect(hasCrmPermission(["crm:*"], "crm:companies:import")).toBe(true);
  });

  it("localizes DE and FR labels", () => {
    expect(t("de", "crm.companies")).toBe("Unternehmen");
    expect(t("fr", "crm.companies")).toBe("Entreprises");
  });
});

describe("kit composition", () => {
  it("crm kit defines migrations and modules", async () => {
    const kit = (await import("./kit.js")).default;
    expect(kit.kind).toBe("kit");
    expect(kit.migrations?.[0]?.id).toBe("20260803120000_crm_initial");
    expect(kit.modules?.pipelines).toBeTruthy();
  });
});
