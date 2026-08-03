import { defineAuditAction } from "../define-action.js";

export const companyCreated = defineAuditAction({
  name: "company.created",
  resourceType: "company",
  redactFields: ["email"],
});

export const companyUpdated = defineAuditAction({
  name: "company.updated",
  resourceType: "company",
  redactFields: ["email", "taxId"],
});

export const companyDeleted = defineAuditAction({
  name: "company.deleted",
  resourceType: "company",
});

export const crmAuditActions = {
  companyCreated,
  companyUpdated,
  companyDeleted,
};
