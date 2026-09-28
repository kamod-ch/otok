/** Demo credentials — fictional, no PII. Password for all: `reference` */
export const REFERENCE_PASSWORD = "reference";

export const TEST_USERS = [
  { email: "reader.a@ref.local", label: "Tenant A reader", tenant: "tenant-a" },
  { email: "trusted.a@ref.local", label: "Tenant A trusted", tenant: "tenant-a" },
  { email: "mod.a@ref.local", label: "Tenant A moderator", tenant: "tenant-a" },
  { email: "admin.a@ref.local", label: "Tenant A admin", tenant: "tenant-a" },
  { email: "reader.b@ref.local", label: "Tenant B reader", tenant: "tenant-b" },
  { email: "mod.b@ref.local", label: "Tenant B moderator", tenant: "tenant-b" },
  { email: "admin.b@ref.local", label: "Tenant B admin", tenant: "tenant-b" },
] as const;
