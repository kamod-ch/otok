import { getAuditRuntime } from "@kamod-ch/otok-audit";
import type { SaasContextUser } from "../db/types.js";

export async function recordAudit(
  user: SaasContextUser,
  input: {
    action: string;
    resourceType: string;
    resourceId: string;
    resourceName?: string;
    changes?: Record<string, unknown>;
    metadata?: Record<string, unknown>;
  },
) {
  const audit = getAuditRuntime();
  await audit.record({
    tenantId: user.orgId,
    actor: { id: user.id, type: "user", email: user.email, name: user.name ?? undefined },
    action: input.action,
    resource: {
      type: input.resourceType,
      id: input.resourceId,
      name: input.resourceName,
    },
    changes: input.changes,
    metadata: input.metadata,
  });
}
