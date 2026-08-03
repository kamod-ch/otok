import type { Company, SwissLegalForm } from "../schema/types.js";
import {
  parseZefixJson,
  uidEquals,
  zefixToCompanyInput,
  type ZefixImportResult,
  type ZefixRecord,
} from "../schema/zefix.js";
import type { CrmStore } from "./memory-store.js";

export function findDuplicateCompany(
  store: CrmStore,
  orgId: string,
  uid?: string,
  externalId?: string,
): Company | undefined {
  for (const company of store.companies.values()) {
    if (company.orgId !== orgId) continue;
    if (externalId && company.externalId === externalId) return company;
    if (uid && uidEquals(company.uid, uid)) return company;
  }
  return undefined;
}

export function importZefixRecords(
  store: CrmStore,
  orgId: string,
  json: string,
  ownerId?: string,
): ZefixImportResult {
  const rows = parseZefixJson(json);
  let imported = 0;
  let skipped = 0;
  const duplicates: string[] = [];
  const errors: { row: number; message: string }[] = [];
  const now = new Date().toISOString();

  for (const row of rows) {
    if (!row.name?.trim()) {
      skipped++;
      errors.push({ row: row.row, message: "Missing company name" });
      continue;
    }

    const input = zefixToCompanyInput(row as ZefixRecord, orgId, ownerId);
    const dup = findDuplicateCompany(store, orgId, input.uid, input.externalId);
    if (dup) {
      skipped++;
      duplicates.push(dup.name);
      errors.push({ row: row.row, message: `Duplicate: ${dup.name} (${dup.uid ?? dup.externalId})` });
      continue;
    }

    const id = crypto.randomUUID();
    const company: Company = {
      id,
      orgId,
      name: input.name,
      uid: input.uid,
      legalForm: input.legalForm as SwissLegalForm | undefined,
      street: input.street,
      postalCode: input.postalCode,
      municipalityCode: input.municipalityCode,
      city: input.city,
      source: input.source,
      externalId: input.externalId,
      ownerId: input.ownerId,
      tagIds: [],
      createdAt: now,
      updatedAt: now,
    };
    store.companies.set(id, company);
    imported++;
  }

  return { imported, skipped, duplicates, errors };
}

export type { ZefixImportResult };
