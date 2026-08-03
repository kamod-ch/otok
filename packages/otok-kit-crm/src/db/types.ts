export interface CrmDatabase {
  crm_organizations: CrmOrganizationsTable;
  crm_roles: CrmRolesTable;
  crm_users: CrmUsersTable;
  crm_pipelines: CrmPipelinesTable;
  crm_companies: CrmCompaniesTable;
  crm_contacts: CrmContactsTable;
  crm_activities: CrmActivitiesTable;
  crm_notes: CrmNotesTable;
  crm_tasks: CrmTasksTable;
  crm_tags: CrmTagsTable;
  crm_sources: CrmSourcesTable;
  crm_contact_requests: CrmContactRequestsTable;
  crm_audit_log: CrmAuditLogTable;
}

interface CrmOrganizationsTable {
  id: string;
  slug: string;
  name: string;
  uid: string | null;
  locale: string;
  timezone: string;
  created_at: string;
}

interface CrmRolesTable {
  id: string;
  org_id: string;
  name: string;
  permissions: string;
}

interface CrmUsersTable {
  id: string;
  org_id: string;
  email: string;
  name: string;
  role_id: string;
  locale: string;
  active: number;
}

interface CrmPipelinesTable {
  id: string;
  org_id: string;
  name: string;
  stages: string;
}

interface CrmCompaniesTable {
  id: string;
  org_id: string;
  name: string;
  uid: string | null;
  legal_form: string | null;
  canton: string | null;
  city: string | null;
  street: string | null;
  postal_code: string | null;
  municipality_code: string | null;
  industry: string | null;
  website: string | null;
  pipeline_id: string | null;
  stage_id: string | null;
  owner_id: string | null;
  tag_ids: string;
  source: string | null;
  external_id: string | null;
  created_at: string;
  updated_at: string;
}

interface CrmContactsTable {
  id: string;
  org_id: string;
  company_id: string | null;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  title: string | null;
  language: string;
}

interface CrmActivitiesTable {
  id: string;
  org_id: string;
  company_id: string;
  contact_id: string | null;
  type: string;
  subject: string;
  body: string | null;
  occurred_at: string;
  user_id: string;
}

interface CrmNotesTable {
  id: string;
  org_id: string;
  entity_type: string;
  entity_id: string;
  body: string;
  author_id: string;
  created_at: string;
}

interface CrmTasksTable {
  id: string;
  org_id: string;
  title: string;
  due_at: string | null;
  assignee_id: string | null;
  status: string;
  related_type: string | null;
  related_id: string | null;
}

interface CrmTagsTable {
  id: string;
  org_id: string;
  name: string;
  color: string;
}

interface CrmSourcesTable {
  id: string;
  org_id: string;
  name: string;
  slug: string;
}

interface CrmContactRequestsTable {
  id: string;
  org_id: string;
  company_id: string | null;
  name: string;
  email: string;
  message: string | null;
  source_id: string | null;
  status: string;
  created_at: string;
}

interface CrmAuditLogTable {
  id: string;
  org_id: string;
  action: string;
  resource_type: string;
  resource_id: string;
  user_id: string | null;
  payload: string | null;
  created_at: string;
}

export type CompanyRow = CrmCompaniesTable;

export type CompanySearchPayload = {
  id: string;
  name: string;
  uid?: string;
  city?: string;
  canton?: string;
  industry?: string;
};

export type ImportedCompany = {
  id: string;
  name: string;
  website: string | null;
};

export type ZefixImportResultWithCreated = import("../schema/zefix.js").ZefixImportResult & {
  created: ImportedCompany[];
};
