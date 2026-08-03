import type { Kysely } from "kysely";
import { createCrmStore } from "../domain/memory-store.js";
import { importZefixRecords } from "../domain/zefix-import.js";
import { uidEquals } from "../schema/zefix.js";
import type {
  CompanyRow,
  CompanySearchPayload,
  CrmDatabase,
  ImportedCompany,
  ZefixImportResultWithCreated,
} from "./types.js";

export type KyselyCrmRepositoryOptions = {
  /** Called after a company row is inserted (e.g. search index update). */
  onCompanyIndexed?: (orgId: string, company: CompanySearchPayload) => void;
  /** Called for each newly imported company (e.g. workflow enrichment). */
  onCompanyImported?: (company: ImportedCompany) => void | Promise<void>;
};

export class KyselyCrmRepository {
  constructor(
    private readonly db: Kysely<CrmDatabase>,
    private readonly options: KyselyCrmRepositoryOptions = {},
  ) {}

  async listCompanies(orgId: string, filters?: { q?: string; canton?: string; stageId?: string }) {
    let q = this.db.selectFrom("crm_companies").selectAll().where("org_id", "=", orgId);
    if (filters?.canton) q = q.where("canton", "=", filters.canton);
    if (filters?.stageId) q = q.where("stage_id", "=", filters.stageId);
    let rows = await q.orderBy("updated_at", "desc").execute();
    if (filters?.q) {
      const needle = filters.q.toLowerCase();
      rows = rows.filter(
        (r) =>
          r.name.toLowerCase().includes(needle) ||
          r.uid?.toLowerCase().includes(needle) ||
          r.city?.toLowerCase().includes(needle),
      );
    }
    return rows;
  }

  async getCompany(orgId: string, id: string) {
    return this.db
      .selectFrom("crm_companies")
      .selectAll()
      .where("org_id", "=", orgId)
      .where("id", "=", id)
      .executeTakeFirst();
  }

  async findByUid(orgId: string, uid: string) {
    const rows = await this.db
      .selectFrom("crm_companies")
      .selectAll()
      .where("org_id", "=", orgId)
      .execute();
    return rows.find((r) => uidEquals(r.uid ?? undefined, uid));
  }

  async insertCompany(row: CompanyRow) {
    await this.db.insertInto("crm_companies").values(row).execute();
    this.options.onCompanyIndexed?.(row.org_id, {
      id: row.id,
      name: row.name,
      uid: row.uid ?? undefined,
      city: row.city ?? undefined,
      canton: row.canton ?? undefined,
      industry: row.industry ?? undefined,
    });
  }

  async updateCompanyStage(orgId: string, id: string, stageId: string, userId: string) {
    await this.db
      .updateTable("crm_companies")
      .set({ stage_id: stageId, updated_at: new Date().toISOString() })
      .where("org_id", "=", orgId)
      .where("id", "=", id)
      .execute();
    await this.audit(orgId, userId, "company.pipeline_updated", "company", id, { stageId });
  }

  async importZefix(orgId: string, json: string, ownerId?: string): Promise<ZefixImportResultWithCreated> {
    const memory = createCrmStore();
    const existing = await this.listCompanies(orgId);
    for (const row of existing) {
      memory.companies.set(row.id, {
        id: row.id,
        orgId: row.org_id,
        name: row.name,
        uid: row.uid ?? undefined,
        externalId: row.external_id ?? undefined,
        tagIds: JSON.parse(row.tag_ids || "[]"),
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      });
    }
    const result = importZefixRecords(memory, orgId, json, ownerId);
    const created: ImportedCompany[] = [];

    for (const company of memory.companies.values()) {
      if (!existing.some((e) => e.id === company.id)) {
        const row: CompanyRow = {
          id: company.id,
          org_id: company.orgId,
          name: company.name,
          uid: company.uid ?? null,
          legal_form: company.legalForm ?? null,
          canton: company.canton ?? null,
          city: company.city ?? null,
          street: company.street ?? null,
          postal_code: company.postalCode ?? null,
          municipality_code: company.municipalityCode ?? null,
          industry: company.industry ?? null,
          website: company.website ?? null,
          pipeline_id: company.pipelineId ?? null,
          stage_id: company.stageId ?? null,
          owner_id: company.ownerId ?? null,
          tag_ids: JSON.stringify(company.tagIds),
          source: company.source ?? null,
          external_id: company.externalId ?? null,
          created_at: company.createdAt,
          updated_at: company.updatedAt,
        };
        await this.insertCompany(row);
        const imported: ImportedCompany = {
          id: company.id,
          name: company.name,
          website: company.website ?? null,
        };
        created.push(imported);
        await this.options.onCompanyImported?.(imported);
      }
    }

    return { ...result, created };
  }

  async exportCompaniesCsv(orgId: string): Promise<string> {
    const rows = await this.listCompanies(orgId);
    const header = "name,uid,canton,city,industry,street,postal_code,source";
    const lines = rows.map((r) =>
      [r.name, r.uid, r.canton, r.city, r.industry, r.street, r.postal_code, r.source]
        .map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`)
        .join(","),
    );
    return [header, ...lines].join("\n");
  }

  async addContact(input: {
    orgId: string;
    companyId: string;
    firstName: string;
    lastName: string;
    email?: string;
    userId: string;
  }) {
    const id = crypto.randomUUID();
    await this.db
      .insertInto("crm_contacts")
      .values({
        id,
        org_id: input.orgId,
        company_id: input.companyId,
        first_name: input.firstName,
        last_name: input.lastName,
        email: input.email ?? null,
        phone: null,
        title: null,
        language: "de",
      })
      .execute();
    await this.audit(input.orgId, input.userId, "contact.created", "contact", id, {
      companyId: input.companyId,
    });
    return id;
  }

  async addActivity(input: {
    orgId: string;
    companyId: string;
    type: string;
    subject: string;
    userId: string;
  }) {
    const id = crypto.randomUUID();
    await this.db
      .insertInto("crm_activities")
      .values({
        id,
        org_id: input.orgId,
        company_id: input.companyId,
        contact_id: null,
        type: input.type,
        subject: input.subject,
        body: null,
        occurred_at: new Date().toISOString(),
        user_id: input.userId,
      })
      .execute();
    await this.audit(input.orgId, input.userId, "activity.created", "activity", id, input);
    return id;
  }

  async assignTask(input: {
    orgId: string;
    title: string;
    assigneeId: string;
    relatedId: string;
    userId: string;
  }) {
    const id = crypto.randomUUID();
    await this.db
      .insertInto("crm_tasks")
      .values({
        id,
        org_id: input.orgId,
        title: input.title,
        due_at: null,
        assignee_id: input.assigneeId,
        status: "open",
        related_type: "company",
        related_id: input.relatedId,
      })
      .execute();
    await this.audit(input.orgId, input.userId, "task.assigned", "task", id, input);
    return id;
  }

  async listTasks(orgId: string) {
    return this.db.selectFrom("crm_tasks").selectAll().where("org_id", "=", orgId).execute();
  }

  async listActivities(orgId: string, companyId: string) {
    return this.db
      .selectFrom("crm_activities")
      .selectAll()
      .where("org_id", "=", orgId)
      .where("company_id", "=", companyId)
      .orderBy("occurred_at", "desc")
      .execute();
  }

  async listAudit(orgId: string, limit = 50) {
    return this.db
      .selectFrom("crm_audit_log")
      .selectAll()
      .where("org_id", "=", orgId)
      .orderBy("created_at", "desc")
      .limit(limit)
      .execute();
  }

  async audit(
    orgId: string,
    userId: string,
    action: string,
    resourceType: string,
    resourceId: string,
    payload?: Record<string, unknown>,
  ) {
    await this.db
      .insertInto("crm_audit_log")
      .values({
        id: crypto.randomUUID(),
        org_id: orgId,
        action,
        resource_type: resourceType,
        resource_id: resourceId,
        user_id: userId,
        payload: payload ? JSON.stringify(payload) : null,
        created_at: new Date().toISOString(),
      })
      .execute();
  }
}
