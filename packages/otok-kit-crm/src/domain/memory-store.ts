import type {
  Activity,
  Company,
  CompanySearchQuery,
  Contact,
  CsvImportResult,
  CsvImportRow,
  Note,
  Organization,
  Pipeline,
  Role,
  SavedFilter,
  Tag,
  Task,
  User,
} from "../schema/types.js";

export interface CrmStore {
  organizations: Map<string, Organization>;
  roles: Map<string, Role>;
  users: Map<string, User>;
  pipelines: Map<string, Pipeline>;
  companies: Map<string, Company>;
  contacts: Map<string, Contact>;
  activities: Map<string, Activity>;
  notes: Map<string, Note>;
  tasks: Map<string, Task>;
  tags: Map<string, Tag>;
  savedFilters: Map<string, SavedFilter>;
}

export function createCrmStore(): CrmStore {
  return {
    organizations: new Map(),
    roles: new Map(),
    users: new Map(),
    pipelines: new Map(),
    companies: new Map(),
    contacts: new Map(),
    activities: new Map(),
    notes: new Map(),
    tasks: new Map(),
    tags: new Map(),
    savedFilters: new Map(),
  };
}

export function listByOrg<T extends { orgId: string }>(map: Map<string, T>, orgId: string): T[] {
  return [...map.values()].filter((item) => item.orgId === orgId);
}

export function searchCompanies(store: CrmStore, query: CompanySearchQuery): Company[] {
  let results = listByOrg(store.companies, query.orgId);
  if (query.q) {
    const q = query.q.toLowerCase();
    results = results.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.uid?.toLowerCase().includes(q) ||
        c.city?.toLowerCase().includes(q) ||
        c.industry?.toLowerCase().includes(q),
    );
  }
  if (query.canton) results = results.filter((c) => c.canton === query.canton);
  if (query.stageId) results = results.filter((c) => c.stageId === query.stageId);
  if (query.tagId) results = results.filter((c) => c.tagIds.includes(query.tagId!));
  results.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  return results.slice(0, query.limit ?? 100);
}

export function parseCsvCompanies(csv: string): CsvImportRow[] {
  const lines = csv.trim().split(/\r?\n/);
  if (lines.length < 2) return [];
  const headers = lines[0]!.split(",").map((h) => h.trim());
  const rows: CsvImportRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i]!.split(",").map((c) => c.trim());
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => {
      row[h] = cols[idx] ?? "";
    });
    if (!row.name) continue;
    rows.push(row as unknown as CsvImportRow);
  }
  return rows;
}

export function importCompaniesFromCsv(
  store: CrmStore,
  orgId: string,
  csv: string,
  ownerId?: string,
): CsvImportResult {
  const rows = parseCsvCompanies(csv);
  let imported = 0;
  let skipped = 0;
  const errors: { row: number; message: string }[] = [];
  const now = new Date().toISOString();

  rows.forEach((row, index) => {
    if (!row.name?.trim()) {
      skipped++;
      errors.push({ row: index + 2, message: "Missing company name" });
      return;
    }
    if (row.uid && [...store.companies.values()].some((c) => c.orgId === orgId && c.uid === row.uid)) {
      skipped++;
      errors.push({ row: index + 2, message: `Duplicate UID ${row.uid}` });
      return;
    }
    const companyId = crypto.randomUUID();
    store.companies.set(companyId, {
      id: companyId,
      orgId,
      name: row.name.trim(),
      uid: row.uid,
      legalForm: row.legalForm as Company["legalForm"],
      canton: row.canton,
      city: row.city,
      industry: row.industry,
      website: row.website,
      ownerId,
      tagIds: [],
      createdAt: now,
      updatedAt: now,
    });
    if (row.contactEmail || row.contactFirstName) {
      const contactId = crypto.randomUUID();
      store.contacts.set(contactId, {
        id: contactId,
        orgId,
        companyId,
        firstName: row.contactFirstName ?? "Kontakt",
        lastName: row.contactLastName ?? row.name,
        email: row.contactEmail,
        language: "de",
      });
    }
    imported++;
  });

  return { imported, skipped, errors };
}

export function exportCompaniesCsv(store: CrmStore, orgId: string): string {
  const companies = listByOrg(store.companies, orgId);
  const header = "name,uid,legalForm,canton,city,industry,website";
  const lines = companies.map((c) =>
    [c.name, c.uid, c.legalForm, c.canton, c.city, c.industry, c.website]
      .map((v) => (v == null ? "" : String(v).includes(",") ? `"${String(v).replace(/"/g, '""')}"` : String(v)))
      .join(","),
  );
  return `${header}\n${lines.join("\n")}\n`;
}
