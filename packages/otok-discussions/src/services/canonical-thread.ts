import type { DiscussionSubject } from "../types/domain.js";

const TENANT_KEY_NONE = "__tenant_none__";

function encodeTenantKey(tenantId: string): string {
  const trimmed = tenantId.trim();
  return trimmed.length === 0 ? TENANT_KEY_NONE : trimmed;
}

/** Stable id for the single canonical thread per subject (get-or-create). */
export function canonicalThreadId(subject: DiscussionSubject): string {
  const tenantKey = encodeTenantKey(subject.tenantId);
  return `dthread_${tenantKey}_${subject.subjectType}_${subject.subjectId}`;
}
