import type { DiscussionSubject } from "../types/domain.js";

/** Sentinel for empty / missing tenant ids — never rely on SQL NULL in UNIQUE constraints. */
export const TENANT_KEY_NONE = "__tenant_none__";

export function encodeTenantKey(tenantId: string): string {
  const trimmed = tenantId.trim();
  return trimmed.length === 0 ? TENANT_KEY_NONE : trimmed;
}

export function decodeTenantId(tenantKey: string): string {
  return tenantKey === TENANT_KEY_NONE ? "" : tenantKey;
}

export function subjectScopeKey(subject: DiscussionSubject): {
  tenant_key: string;
  tenant_id: string;
  subject_type: string;
  subject_id: string;
} {
  const tenant_key = encodeTenantKey(subject.tenantId);
  return {
    tenant_key,
    tenant_id: subject.tenantId,
    subject_type: subject.subjectType,
    subject_id: subject.subjectId,
  };
}

export function subjectFromRow(row: {
  tenant_key: string;
  subject_type: string;
  subject_id: string;
}): DiscussionSubject {
  return {
    tenantId: decodeTenantId(row.tenant_key),
    subjectType: row.subject_type,
    subjectId: row.subject_id,
  };
}
