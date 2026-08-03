import type { AuditActionDefinition } from "./types.js";

export interface DefineAuditActionOptions<TMetadata = unknown> {
  name: string;
  resourceType: string;
  metadataSchema?: AuditActionDefinition<TMetadata>["metadataSchema"];
  redactFields?: readonly string[];
}

export function defineAuditAction<TMetadata = unknown>(
  options: DefineAuditActionOptions<TMetadata>,
): AuditActionDefinition<TMetadata> {
  if (!options.name?.trim()) {
    throw new Error("otok-audit: defineAuditAction requires a non-empty name");
  }
  if (!options.resourceType?.trim()) {
    throw new Error("otok-audit: defineAuditAction requires resourceType");
  }
  return {
    __kind: "otok-audit-action",
    name: options.name,
    resourceType: options.resourceType,
    metadataSchema: options.metadataSchema,
    redactFields: options.redactFields,
  };
}

export function isAuditActionDefinition(value: unknown): value is AuditActionDefinition {
  return (
    typeof value === "object" &&
    value != null &&
    (value as AuditActionDefinition).__kind === "otok-audit-action"
  );
}

export { z } from "zod";
