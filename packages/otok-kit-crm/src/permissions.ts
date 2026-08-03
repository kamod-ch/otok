/** CRM permission keys — check via app auth layer. */
export const CRM_PERMISSIONS = {
  ORG_READ: "crm:org:read",
  ORG_WRITE: "crm:org:write",
  COMPANIES_READ: "crm:companies:read",
  COMPANIES_WRITE: "crm:companies:write",
  COMPANIES_IMPORT: "crm:companies:import",
  COMPANIES_EXPORT: "crm:companies:export",
  CONTACTS_READ: "crm:contacts:read",
  CONTACTS_WRITE: "crm:contacts:write",
  ACTIVITIES_READ: "crm:activities:read",
  ACTIVITIES_WRITE: "crm:activities:write",
  TASKS_READ: "crm:tasks:read",
  TASKS_WRITE: "crm:tasks:write",
  PIPELINES_READ: "crm:pipelines:read",
  PIPELINES_WRITE: "crm:pipelines:write",
  FILTERS_READ: "crm:filters:read",
  FILTERS_WRITE: "crm:filters:write",
  AUDIT_READ: "crm:audit:read",
  SEARCH: "crm:search",
} as const;

export type CrmPermission = (typeof CRM_PERMISSIONS)[keyof typeof CRM_PERMISSIONS];

export const DEFAULT_ADMIN_PERMISSIONS: CrmPermission[] = Object.values(CRM_PERMISSIONS);

export const DEFAULT_SALES_PERMISSIONS: CrmPermission[] = [
  CRM_PERMISSIONS.COMPANIES_READ,
  CRM_PERMISSIONS.COMPANIES_WRITE,
  CRM_PERMISSIONS.CONTACTS_READ,
  CRM_PERMISSIONS.CONTACTS_WRITE,
  CRM_PERMISSIONS.ACTIVITIES_READ,
  CRM_PERMISSIONS.ACTIVITIES_WRITE,
  CRM_PERMISSIONS.TASKS_READ,
  CRM_PERMISSIONS.TASKS_WRITE,
  CRM_PERMISSIONS.PIPELINES_READ,
  CRM_PERMISSIONS.FILTERS_READ,
  CRM_PERMISSIONS.FILTERS_WRITE,
  CRM_PERMISSIONS.SEARCH,
  CRM_PERMISSIONS.COMPANIES_EXPORT,
];

export function hasCrmPermission(granted: readonly string[], required: CrmPermission): boolean {
  return granted.includes(required) || granted.includes("crm:*");
}
