import type {
  Activity,
  Company,
  CompanySearchQuery,
  Contact,
  CsvImportResult,
  Note,
  Organization,
  Pipeline,
  Role,
  SavedFilter,
  Tag,
  Task,
  User,
} from "../schema/types.js";
import {
  createCrmStore,
  exportCompaniesCsv,
  importCompaniesFromCsv,
  listByOrg,
  searchCompanies,
  type CrmStore,
} from "./memory-store.js";
import { importZefixRecords } from "./zefix-import.js";

export interface CrmServiceOptions {
  store?: CrmStore;
}

/** Server-side CRM domain service — storage-agnostic over in-memory/Kysely adapters. */
export class CrmService {
  readonly store: CrmStore;

  constructor(options: CrmServiceOptions = {}) {
    this.store = options.store ?? createCrmStore();
  }

  // Organizations
  getOrganization(id: string) {
    return this.store.organizations.get(id);
  }
  listOrganizations() {
    return [...this.store.organizations.values()];
  }

  // Companies
  listCompanies(orgId: string) {
    return listByOrg(this.store.companies, orgId);
  }
  searchCompanies(query: CompanySearchQuery) {
    return searchCompanies(this.store, query);
  }
  getCompany(orgId: string, id: string) {
    const c = this.store.companies.get(id);
    return c?.orgId === orgId ? c : undefined;
  }
  updateCompany(orgId: string, id: string, patch: Partial<Pick<Company, "name" | "industry" | "canton" | "city" | "stageId">>) {
    const company = this.getCompany(orgId, id);
    if (!company) return undefined;
    Object.assign(company, patch, { updatedAt: new Date().toISOString() });
    return company;
  }

  // Contacts
  listContacts(orgId: string, companyId?: string) {
    let contacts = listByOrg(this.store.contacts, orgId);
    if (companyId) contacts = contacts.filter((c) => c.companyId === companyId);
    return contacts;
  }

  // Activities
  listActivities(orgId: string, companyId: string) {
    return listByOrg(this.store.activities, orgId).filter((a) => a.companyId === companyId);
  }
  addActivity(input: Omit<Activity, "id">) {
    const id = crypto.randomUUID();
    const activity = { ...input, id };
    this.store.activities.set(id, activity);
    return activity;
  }

  // Notes, tasks, tags, pipelines, filters
  listNotes(orgId: string, entityType: Note["entityType"], entityId: string) {
    return listByOrg(this.store.notes, orgId).filter((n) => n.entityType === entityType && n.entityId === entityId);
  }
  listTasks(orgId: string) {
    return listByOrg(this.store.tasks, orgId);
  }
  listTags(orgId: string) {
    return listByOrg(this.store.tags, orgId);
  }
  listPipelines(orgId: string) {
    return listByOrg(this.store.pipelines, orgId);
  }
  listSavedFilters(orgId: string, userId?: string) {
    let filters = listByOrg(this.store.savedFilters, orgId);
    if (userId) filters = filters.filter((f) => f.userId === userId);
    return filters;
  }
  listUsers(orgId: string) {
    return listByOrg(this.store.users, orgId);
  }
  listRoles(orgId: string) {
    return listByOrg(this.store.roles, orgId);
  }

  // Import / export
  importCompaniesCsv(orgId: string, csv: string, ownerId?: string): CsvImportResult {
    return importCompaniesFromCsv(this.store, orgId, csv, ownerId);
  }
  importZefixJson(orgId: string, json: string, ownerId?: string) {
    return importZefixRecords(this.store, orgId, json, ownerId);
  }
  exportCompaniesCsv(orgId: string) {
    return exportCompaniesCsv(this.store, orgId);
  }

  /** Load seed snapshot into store (merge, skip existing org slug). */
  loadSeed(data: {
    organization: Organization;
    roles: Role[];
    users: User[];
    pipelines: Pipeline[];
    companies: Company[];
    contacts: Contact[];
    activities: Activity[];
    tags: Tag[];
  }) {
    if (!this.store.organizations.has(data.organization.id)) {
      this.store.organizations.set(data.organization.id, data.organization);
    }
    for (const r of data.roles) this.store.roles.set(r.id, r);
    for (const u of data.users) this.store.users.set(u.id, u);
    for (const p of data.pipelines) this.store.pipelines.set(p.id, p);
    for (const c of data.companies) this.store.companies.set(c.id, c);
    for (const c of data.contacts) this.store.contacts.set(c.id, c);
    for (const a of data.activities) this.store.activities.set(a.id, a);
    for (const t of data.tags) this.store.tags.set(t.id, t);
  }
}

let defaultService: CrmService | null = null;

export function getCrmService(): CrmService {
  if (!defaultService) defaultService = new CrmService();
  return defaultService;
}

export function setCrmService(service: CrmService): void {
  defaultService = service;
}

export function resetCrmServiceForTests(): void {
  defaultService = null;
}
