import { describe, expect, it } from "vitest";
import { createCrmStore } from "./memory-store.js";
import { importZefixRecords } from "./zefix-import.js";
import { normalizeSwissUid, parseZefixJson } from "../schema/zefix.js";

const EIRAO = {
  id: "https://register.ld.admin.ch/zefix/company/1679063",
  name: "Eirao Reinigung GmbH",
  legalForm: "https://ld.admin.ch/ech/97/legalforms/0107",
  uid: "CHE474593641",
  street: "Kleinhüningerstrasse 171",
  postalCode: "4057",
  municipality: "https://ld.admin.ch/municipality/2701",
  source: "lindas-zefix",
};

describe("zefix import", () => {
  it("normalizes UID", () => {
    expect(normalizeSwissUid("CHE474593641")).toBe("CHE-474.593.641");
  });

  it("imports Zefix JSON with deduplication", () => {
    const store = createCrmStore();
    const orgId = "org-test";
    const json = JSON.stringify([EIRAO]);
    const first = importZefixRecords(store, orgId, json);
    expect(first.imported).toBe(1);
    expect(first.skipped).toBe(0);

    const second = importZefixRecords(store, orgId, json);
    expect(second.imported).toBe(0);
    expect(second.skipped).toBe(1);
    expect(second.duplicates).toContain("Eirao Reinigung GmbH");
  });

  it("parses array or single object", () => {
    expect(parseZefixJson(JSON.stringify(EIRAO))).toHaveLength(1);
    expect(parseZefixJson(JSON.stringify([EIRAO]))).toHaveLength(1);
  });
});
