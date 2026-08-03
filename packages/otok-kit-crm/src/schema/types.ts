/** Swiss legal forms commonly tracked in B2B CRM. */
export type SwissLegalForm = "AG" | "GmbH" | "Einzelfirma" | "Kollektivgesellschaft" | "Genossenschaft";

/** ISO 639-1 language codes for CH market. */
export type CrmLocale = "de" | "fr" | "en" | "it";

export interface Organization {
  id: string;
  slug: string;
  name: string;
  /** Swiss UID, e.g. CHE-105.911.158 */
  uid?: string;
  locale: CrmLocale;
  timezone: string;
  createdAt: string;
}

export interface Role {
  id: string;
  orgId: string;
  name: string;
  permissions: readonly string[];
}

export interface User {
  id: string;
  orgId: string;
  email: string;
  name: string;
  roleId: string;
  locale: CrmLocale;
  active: boolean;
}

export interface PipelineStage {
  id: string;
  name: string;
  order: number;
  probability: number;
}

export interface Pipeline {
  id: string;
  orgId: string;
  name: string;
  stages: PipelineStage[];
}

export interface Company {
  id: string;
  orgId: string;
  name: string;
  uid?: string;
  legalForm?: SwissLegalForm;
  canton?: string;
  city?: string;
  street?: string;
  postalCode?: string;
  municipalityCode?: string;
  industry?: string;
  website?: string;
  pipelineId?: string;
  stageId?: string;
  ownerId?: string;
  tagIds: string[];
  source?: string;
  externalId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Contact {
  id: string;
  orgId: string;
  companyId?: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  title?: string;
  language: CrmLocale;
}

export type ActivityType = "call" | "meeting" | "email" | "note";

export interface Activity {
  id: string;
  orgId: string;
  companyId: string;
  contactId?: string;
  type: ActivityType;
  subject: string;
  body?: string;
  occurredAt: string;
  userId: string;
}

export interface Note {
  id: string;
  orgId: string;
  entityType: "company" | "contact" | "deal";
  entityId: string;
  body: string;
  authorId: string;
  createdAt: string;
}

export type TaskStatus = "open" | "done" | "cancelled";

export interface Task {
  id: string;
  orgId: string;
  title: string;
  dueAt?: string;
  assigneeId?: string;
  status: TaskStatus;
  relatedType?: "company" | "contact";
  relatedId?: string;
}

export interface Tag {
  id: string;
  orgId: string;
  name: string;
  color: string;
}

export interface SavedFilter {
  id: string;
  orgId: string;
  name: string;
  entityType: "company" | "contact" | "task";
  query: Record<string, unknown>;
  userId: string;
}

export interface CompanySearchQuery {
  orgId: string;
  q?: string;
  canton?: string;
  stageId?: string;
  tagId?: string;
  limit?: number;
}

export interface CsvImportRow {
  name: string;
  uid?: string;
  legalForm?: string;
  canton?: string;
  city?: string;
  industry?: string;
  website?: string;
  contactEmail?: string;
  contactFirstName?: string;
  contactLastName?: string;
}

export interface CsvImportResult {
  imported: number;
  skipped: number;
  errors: { row: number; message: string }[];
}

export interface Source {
  id: string;
  orgId: string;
  name: string;
  slug: string;
}

export interface Website {
  id: string;
  orgId: string;
  companyId: string;
  url: string;
  isPrimary: boolean;
}

export interface CareerArea {
  id: string;
  orgId: string;
  companyId: string;
  name: string;
}

export type ContactRequestStatus = "new" | "assigned" | "closed";

export interface ContactRequest {
  id: string;
  orgId: string;
  companyId?: string;
  name: string;
  email: string;
  message?: string;
  sourceId?: string;
  status: ContactRequestStatus;
  createdAt: string;
}

export interface AuditLogEntry {
  id: string;
  orgId: string;
  action: string;
  resourceType: string;
  resourceId: string;
  userId?: string;
  payload?: Record<string, unknown>;
  createdAt: string;
}
