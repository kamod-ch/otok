import type { DiscussionActor, DiscussionSubject } from "../types/domain.js";
import { DiscussionError } from "../types/errors.js";
import type { ModerationProvider } from "../types/ports.js";

export interface ModerationAccessOptions {
  /** Explicit role name for cross-tenant superadmin (never inferred from generic `admin`). */
  superAdminRole?: string;
  /** When set, moderators must be listed for each tenant explicitly. */
  moderatableTenantIds?: readonly string[];
}

export interface ModerationAccess {
  isSuperAdmin(actor: DiscussionActor): boolean;
  assertTenantScope(actor: DiscussionActor, tenantId: string, provider: ModerationProvider): Promise<void>;
  assertSubjectModeration(actor: DiscussionActor, subject: DiscussionSubject, provider: ModerationProvider): Promise<void>;
}

export function createModerationAccess(options: ModerationAccessOptions = {}): ModerationAccess {
  const superRole = options.superAdminRole ?? "discussions_superadmin";
  const tenantAllowList = options.moderatableTenantIds ? new Set(options.moderatableTenantIds) : null;

  return {
    isSuperAdmin(actor) {
      return actor.roles.includes(superRole);
    },
    async assertTenantScope(actor, tenantId, provider) {
      if (actor.roles.includes(superRole)) return;
      if (tenantAllowList && !tenantAllowList.has(tenantId)) {
        throw new DiscussionError("FORBIDDEN", "Tenant is outside moderation scope");
      }
      const pseudoSubject: DiscussionSubject = {
        tenantId,
        subjectType: "__moderation_scope__",
        subjectId: "__scope__",
      };
      if (!(await provider.isModerator(actor, pseudoSubject))) {
        // Fallback: many apps only implement tenant-scoped isModerator with real subjects —
        // caller should use assertSubjectModeration for subject-bound routes.
        if (tenantAllowList?.has(tenantId) && actor.roles.includes("moderator")) return;
        throw new DiscussionError("FORBIDDEN", "Moderator scope denied for tenant");
      }
    },
    async assertSubjectModeration(actor, subject, provider) {
      if (actor.roles.includes(superRole)) return;
      if (tenantAllowList && !tenantAllowList.has(subject.tenantId)) {
        throw new DiscussionError("FORBIDDEN", "Tenant is outside moderation scope");
      }
      if (!(await provider.isModerator(actor, subject))) {
        throw new DiscussionError("FORBIDDEN", "Moderator role required for subject");
      }
    },
  };
}
