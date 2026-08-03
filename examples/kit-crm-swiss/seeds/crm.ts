import type { Kysely } from "kysely";
import {
  createSwissDemoSeed,
  SWISS_DEMO_ORG_ID,
  importZefixRecords,
  createCrmStore,
} from "@otok/kit-crm";
import { getSearchIndex, indexCompany } from "@kamod-ch/otok-search";
import type { CrmDatabase } from "@otok/kit-crm/db";
import zefixSample from "../data/zefix-sample.json" with { type: "json" };

export default async function seed(db: Kysely<CrmDatabase>) {
  const existing = await db
    .selectFrom("crm_organizations")
    .select("id")
    .where("id", "=", SWISS_DEMO_ORG_ID)
    .executeTakeFirst();
  if (existing) return;

  const demo = createSwissDemoSeed();
  const now = new Date().toISOString();

  await db
    .insertInto("crm_organizations")
    .values({
      id: demo.organization.id,
      slug: demo.organization.slug,
      name: demo.organization.name,
      uid: demo.organization.uid ?? null,
      locale: demo.organization.locale,
      timezone: demo.organization.timezone,
      created_at: demo.organization.createdAt,
    })
    .execute();

  for (const role of demo.roles) {
    await db
      .insertInto("crm_roles")
      .values({
        id: role.id,
        org_id: role.orgId,
        name: role.name,
        permissions: JSON.stringify(role.permissions),
      })
      .execute();
  }

  for (const user of demo.users) {
    await db
      .insertInto("crm_users")
      .values({
        id: user.id,
        org_id: user.orgId,
        email: user.email,
        name: user.name,
        role_id: user.roleId,
        locale: user.locale,
        active: user.active ? 1 : 0,
      })
      .execute();
  }

  for (const pipeline of demo.pipelines) {
    await db
      .insertInto("crm_pipelines")
      .values({
        id: pipeline.id,
        org_id: pipeline.orgId,
        name: pipeline.name,
        stages: JSON.stringify(pipeline.stages),
      })
      .execute();
  }

  for (const tag of demo.tags) {
    await db.insertInto("crm_tags").values({ id: tag.id, org_id: tag.orgId, name: tag.name, color: tag.color }).execute();
  }

  for (const company of demo.companies) {
    await db
      .insertInto("crm_companies")
      .values({
        id: company.id,
        org_id: company.orgId,
        name: company.name,
        uid: company.uid ?? null,
        legal_form: company.legalForm ?? null,
        canton: company.canton ?? null,
        city: company.city ?? null,
        street: null,
        postal_code: null,
        municipality_code: null,
        industry: company.industry ?? null,
        website: company.website ?? null,
        pipeline_id: company.pipelineId ?? null,
        stage_id: company.stageId ?? null,
        owner_id: company.ownerId ?? null,
        tag_ids: JSON.stringify(company.tagIds),
        source: "seed",
        external_id: null,
        created_at: company.createdAt,
        updated_at: company.updatedAt,
      })
      .execute();
    indexCompany(getSearchIndex(), company.orgId, company);
  }

  await db
    .insertInto("crm_sources")
    .values([
      { id: "src-zefix", org_id: SWISS_DEMO_ORG_ID, name: "Zefix / LINDAS", slug: "lindas-zefix" },
      { id: "src-web", org_id: SWISS_DEMO_ORG_ID, name: "Website", slug: "website" },
    ])
    .execute();

  const memory = createCrmStore();
  for (const company of demo.companies) {
    memory.companies.set(company.id, company);
  }
  importZefixRecords(memory, SWISS_DEMO_ORG_ID, JSON.stringify(zefixSample), "user-sales");

  for (const company of memory.companies.values()) {
    if (demo.companies.some((c) => c.id === company.id)) continue;
    await db
      .insertInto("crm_companies")
      .values({
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
      })
      .execute();
    indexCompany(getSearchIndex(), company.orgId, company);
  }
}
