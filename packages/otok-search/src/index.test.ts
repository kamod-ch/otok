import { describe, expect, it, beforeEach } from "vitest";
import { SearchIndex, indexCompany } from "./index.js";

describe("SearchIndex", () => {
  let index: SearchIndex;

  beforeEach(() => {
    index = new SearchIndex();
  });

  it("finds companies by name", () => {
    indexCompany(index, "org-1", { id: "c1", name: "Eirao Reinigung GmbH", uid: "CHE-474.593.641" });
    indexCompany(index, "org-1", { id: "c2", name: "Migros", city: "Zürich" });
    const hits = index.search({ tenantId: "org-1", type: "company", q: "Eirao" });
    expect(hits[0]?.id).toBe("c1");
  });
});
